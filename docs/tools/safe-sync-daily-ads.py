#!/usr/bin/env python3
"""Apply only this PR's source delta without Agent, reset, checkout or index changes.

Run inside YOKI YOKI after fetching the reviewed target commit. The default is a
read-only dry run. Conflicts stop the entire plan before any source file changes.
This is not a build, migration, deployment, or a native release tool.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tempfile

BASE = 'b2d12fade2e77dda03a856289cd1ba74e2ada170'
KNOWN = ('2e59f5601e114a800642a6851fa050d7b7a5440b',
         '2cebb63a1f856aa58f4144e9dba35a789ac9989c',
         'a8666c130479bcf46e42527e80c273626e20d46c',
         'bd165982bd56b89d274eab66688a87c3d51c573b',
         # Replit source reviewed and reconciled on 2026-10-19.
         '766dee5956b621db17c6f2fd50663a23846e1e90')

class Stop(Exception):
    pass

def git(root, *args, ok=(0,)):
    env = {**os.environ, 'GIT_OPTIONAL_LOCKS': '0', 'GIT_LITERAL_PATHSPECS': '1'}
    p = subprocess.run(['git', '-C', str(root), *args], capture_output=True, env=env)
    if p.returncode not in ok:
        raise Stop('Git operation failed: ' + args[0] + ' (fetch the reviewed commits first).')
    return p

def commit(root, sha):
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise Stop('A full, pinned 40-character commit SHA is required.')
    return git(root, 'rev-parse', '--verify', sha+'^{commit}').stdout.decode().strip()

def tree(root, sha):
    result = {}
    for row in git(root, 'ls-tree', '-rz', sha).stdout.split(b'\0'):
        if not row:
            continue
        meta, name = row.split(b'\t', 1)
        mode, kind, oid = meta.decode().split()
        result[name.decode('utf-8')] = (mode, kind, oid)
    return result

def blob(root, item):
    return None if item is None else git(root, 'cat-file', 'blob', item[2]).stdout

def source_path(root, name):
    p = PurePosixPath(name)
    if p.is_absolute() or '..' in p.parts or not p.parts:
        raise Stop('Unsafe source path: ' + name)
    if p.parts[0] not in ('artifacts', 'scripts', 'docs', '.github') and name != 'pnpm-lock.yaml':
        raise Stop('Out-of-scope path: ' + name)
    if any(x.startswith('.env') or x.lower().endswith(('.pem', '.p12', '.key', '.keystore')) for x in p.parts):
        raise Stop('Credential/configuration path is excluded: ' + name)
    current = root
    for part in p.parts:
        current = current / part
        if current.is_symlink():
            raise Stop('Symlink path is excluded: ' + name)
    if current.exists() and not current.is_file():
        raise Stop('Not a regular file: ' + name)
    return current

def read(path):
    return path.read_bytes() if path.exists() else None

def checksum(data):
    return None if data is None else hashlib.sha256(data).hexdigest()

def plan(root, base, target, known=KNOWN):
    base, target = commit(root, base), commit(root, target)
    if git(root, 'merge-base', '--is-ancestor', base, target, ok=(0, 1)).returncode != 0:
        raise Stop('The target is not a descendant of the reviewed base.')
    old, new = tree(root, base), tree(root, target)
    known_trees = []
    for ref in known:
        if git(root, 'cat-file', '-e', ref+'^{commit}', ok=(0, 128, 1)).returncode == 0:
            known_trees.append(tree(root, ref))
    changes, conflicts = [], []
    for name in sorted(set(old) | set(new)):
        if old.get(name) == new.get(name):
            continue
        path = source_path(root, name)
        before, wanted = blob(root, old.get(name)), blob(root, new.get(name))
        if wanted is None or new[name][0] not in ('100644', '100755') or new[name][1] != 'blob':
            raise Stop('Deletion or non-regular target is excluded: ' + name)
        if len(wanted) > 2_000_000:
            raise Stop('Oversized change is excluded: ' + name)
        current = read(path)
        if current == wanted:
            continue
        mode = stat.S_IMODE(path.stat().st_mode) if current is not None else (0o755 if new[name][0]=='100755' else 0o644)
        result = wanted
        recognized = current is not None and any(current == blob(root, t.get(name)) for t in known_trees)
        if current != before and not recognized:
            if current is None or before is None or any(b'\0' in value for value in (before, current, wanted)):
                conflicts.append(name)
                continue
            with tempfile.TemporaryDirectory(prefix='yoki-merge-') as tmp:
                files = [Path(tmp)/x for x in ('local', 'base', 'incoming')]
                for file, content in zip(files, (current, before, wanted)):
                    file.write_bytes(content)
                p = git(root, 'merge-file', '-p', *(str(x) for x in files), ok=tuple(range(256)))
                if p.returncode != 0:
                    conflicts.append(name)
                    continue
                result = p.stdout
        if current != result:
            changes.append({'path': name, 'before': current, 'after': result, 'mode': mode})
    if conflicts:
        raise Stop('No source files changed. Conflicts require review:\n' + '\n'.join(conflicts))
    return changes

def write_atomic(path, data, mode):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix='.yoki-sync-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(tmp, mode)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

def apply(root, changes, base, target):
    if not changes:
        return None
    gitdir = Path(git(root, 'rev-parse', '--absolute-git-dir').stdout.decode().strip())
    lock = gitdir/'yoki-source-sync.lock'
    try:
        lock_fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        raise Stop('Another source sync may be active; no files changed.')
    backup = None
    written = []
    try:
        os.close(lock_fd)
        for item in changes:
            if read(source_path(root, item['path'])) != item['before']:
                raise Stop('Source changed after planning; no files changed.')
        parent = gitdir/'yoki-source-backups'
        parent.mkdir(mode=0o700, exist_ok=True)
        backup = Path(tempfile.mkdtemp(prefix=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ-'), dir=parent))
        manifest = {'base': base, 'target': target, 'headUnchanged': git(root, 'rev-parse', 'HEAD').stdout.decode().strip(),
                    'files': [{'path':x['path'], 'before':checksum(x['before']), 'after':checksum(x['after']), 'mode':x['mode']} for x in changes]}
        for item in changes:
            if item['before'] is not None:
                saved = backup/'files'/item['path']
                saved.parent.mkdir(parents=True, exist_ok=True)
                saved.write_bytes(item['before'])
        (backup/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
        for item in changes:
            path = source_path(root, item['path'])
            if read(path) != item['before']:
                raise Stop('Concurrent edit detected: ' + item['path'])
            write_atomic(path, item['after'], item['mode'])
            written.append(item)
        return backup
    except BaseException:
        # Restore only our own writes, never a later edit made by another process.
        for item in reversed(written):
            path = source_path(root, item['path'])
            if read(path) == item['after']:
                if item['before'] is None:
                    path.unlink()
                else:
                    write_atomic(path, item['before'], item['mode'])
        raise
    finally:
        lock.unlink(missing_ok=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', required=True, help='reviewed, locally fetched full commit SHA')
    parser.add_argument('--base', default=BASE)
    parser.add_argument('--apply', action='store_true', help='apply after conflict checks and backup; otherwise dry run')
    args = parser.parse_args()
    root = Path(git(Path.cwd(), 'rev-parse', '--show-toplevel').stdout.decode().strip())
    package = source_path(root, 'artifacts/mobile/package.json')
    if json.loads(package.read_text()).get('name') != '@workspace/mobile':
        raise Stop('This is not the expected YOKI mobile workspace.')
    # Do not mix this updater with an existing merge/rebase/cherry-pick.
    gitdir = Path(git(root, 'rev-parse', '--absolute-git-dir').stdout.decode().strip())
    if any((gitdir/x).exists() for x in ('MERGE_HEAD','CHERRY_PICK_HEAD','rebase-merge','rebase-apply','index.lock')):
        raise Stop('Another Git operation is active; no files changed.')
    changes = plan(root, args.base, args.target)
    print(json.dumps({'mode':'apply' if args.apply else 'dry-run','files':len(changes),'paths':[x['path'] for x in changes]},ensure_ascii=False))
    if args.apply:
        backup = apply(root, changes, args.base, args.target)
        print('SYNC_OK: source files updated; Git HEAD/index, secrets, DB and deployment unchanged.')
        if backup:
            print('Local source backup: ' + str(backup))
    else:
        print('DRY_RUN_OK: no source files changed. Add --apply to perform this exact comparison.')

if __name__ == '__main__':
    try:
        main()
    except (Stop, OSError, ValueError) as error:
        print('STOP: ' + str(error), file=sys.stderr)
        sys.exit(2)
