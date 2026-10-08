import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../replit-readiness.mjs', import.meta.url));
const candidateRef = 'refs/remotes/origin/codex/yoki-yoki-3-world';
function command(cwd, ...args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'yoki-replit-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => command(root, ...args);
  git('init', '-b', 'main'); git('config', 'user.name', 'Local QA'); git('config', 'user.email', 'qa@example.invalid');
  git('remote', 'add', 'origin', 'https://user:DO_NOT_PRINT_REMOTE_TOKEN@example.invalid/test.git');
  writeFileSync(join(root, 'source.ts'), 'base\n'); writeFileSync(join(root, 'other.ts'), 'keep\n');
  writeFileSync(join(root, '.gitignore'), '.env\n');
  writeFileSync(join(root, '.replit'), '[postMerge]\npath = "scripts/post-merge.sh"\n');
  git('add', '.'); git('commit', '-m', 'base'); const base = git('rev-parse', 'HEAD');
  git('update-ref', 'refs/remotes/origin/main', base); git('branch', '--set-upstream-to=origin/main', 'main');
  git('switch', '-c', 'candidate'); writeFileSync(join(root, 'source.ts'), 'candidate\n');
  git('commit', '-am', 'candidate'); const candidate = git('rev-parse', 'HEAD');
  git('update-ref', candidateRef, candidate); git('switch', 'main');
  const run = ({ stdin = false, cwd = root } = {}) => {
    const result = spawnSync(process.execPath, stdin ? ['--input-type=module'] : [script], {
      cwd, encoding: 'utf8', input: stdin ? readFileSync(script, 'utf8') : undefined, timeout: 20000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.includes('DO_NOT_PRINT'), false);
    return JSON.parse(result.stdout);
  };
  return { root, git, base, candidate, run };
}

test('clean main identifies the newer candidate without changing index, HEAD, refs or invoking hooks', t => {
  const f = fixture(t), sentinel = join(f.root, 'hook-ran');
  const hook = join(f.root, '.git/hooks/post-merge'); writeFileSync(hook, `#!/bin/sh\ntouch '${sentinel}'\n`); chmodSync(hook, 0o755);
  const index = readFileSync(join(f.root, '.git/index')), refs = f.git('show-ref');
  const result = f.run();
  assert.equal(result.current.sha, f.base); assert.equal(result.candidate.sha, f.candidate);
  assert.deepEqual(result.comparisons.currentToCandidate, { relation: 'right_ahead', leftOnly: 0, rightOnly: 1 });
  assert.equal(result.comparisons.currentToUpstream.relation, 'same'); assert.equal(result.workingTree.clean, true);
  assert.equal(result.postMergeConfigured, true); assert.equal(existsSync(sentinel), false);
  assert.deepEqual(readFileSync(join(f.root, '.git/index')), index); assert.equal(f.git('show-ref'), refs);
  assert.equal(f.git('rev-parse', 'HEAD'), f.base); assert.equal(result.consistent, true);
  assert.match(result.scope, /リリース可否は判定しません/);
});

test('staged rename, unstaged content and untracked paths are retained without printing source or secrets', t => {
  const f = fixture(t), renamed = '名前と space\nfile.ts';
  f.git('mv', 'source.ts', renamed);
  writeFileSync(join(f.root, 'other.ts'), 'DO_NOT_PRINT_SOURCE_PAYLOAD\n');
  writeFileSync(join(f.root, 'new.txt'), 'DO_NOT_PRINT_UNTRACKED_CONTENT');
  writeFileSync(join(f.root, '.env'), 'SECRET=DO_NOT_PRINT_ENV');
  const before = readFileSync(join(f.root, '.git/index'));
  const result = f.run(), entries = result.workingTree.changes;
  assert.equal(result.workingTree.clean, false); assert.equal(entries.length, 3);
  const rename = entries.find(c => c.path === renamed); assert.equal(rename.originalPath, 'source.ts'); assert.equal(rename.staged, true);
  assert.equal(entries.find(c => c.path === 'other.ts').unstaged, true);
  assert.equal(entries.find(c => c.path === 'new.txt').untracked, true);
  assert.deepEqual(readFileSync(join(f.root, '.git/index')), before);
  assert.equal(readFileSync(join(f.root, 'other.ts'), 'utf8'), 'DO_NOT_PRINT_SOURCE_PAYLOAD\n');
});

test('divergent local commits are not mistaken for a safe fast-forward or missing user work', t => {
  const f = fixture(t); writeFileSync(join(f.root, 'source.ts'), 'local change\n'); f.git('commit', '-am', 'local');
  const result = f.run();
  assert.deepEqual(result.comparisons.currentToCandidate, { relation: 'diverged', leftOnly: 1, rightOnly: 1 });
  assert.equal(result.comparisons.currentToUpstream.leftOnly, 1);
  assert.ok(result.reviewNotes.some(note => note.includes('上書きせず')));
});

test('an actual merge conflict and its in-progress operation remain untouched', t => {
  const f = fixture(t); writeFileSync(join(f.root, 'source.ts'), 'local\n'); f.git('commit', '-am', 'local');
  const merge = spawnSync('git', ['merge', 'candidate'], { cwd: f.root, encoding: 'utf8' }); assert.equal(merge.status, 1);
  const content = readFileSync(join(f.root, 'source.ts')), index = readFileSync(join(f.root, '.git/index'));
  const result = f.run(); assert.ok(result.operations.includes('MERGE_HEAD'));
  assert.equal(result.workingTree.changes.find(c => c.path === 'source.ts').conflicted, true);
  assert.deepEqual(readFileSync(join(f.root, 'source.ts')), content); assert.deepEqual(readFileSync(join(f.root, '.git/index')), index);
});

test('missing candidate ref is reported rather than falling back to main', t => {
  const f = fixture(t); f.git('update-ref', '-d', candidateRef);
  const result = f.run(); assert.equal(result.candidate, null); assert.ok(result.missingRefs.includes(candidateRef));
  assert.equal(result.comparisons.currentToCandidate.relation, 'missing_ref');
});

test('detached HEAD does not invent a branch or upstream', t => {
  const f = fixture(t); f.git('switch', '--detach', f.base); const result = f.run();
  assert.equal(result.branch, null); assert.equal(result.upstream, null); assert.ok(result.reviewNotes.some(note => note.includes('detached')));
});

test('shallow clone does not misclassify disconnected history as an integration decision', t => {
  const f = fixture(t), clone = join(f.root, 'shallow-clone');
  f.git('clone', '--depth', '1', 'file://' + f.root, clone);
  command(clone, 'fetch', '--depth', '1', 'file://' + f.root, 'candidate');
  command(clone, 'update-ref', candidateRef, command(clone, 'rev-parse', 'FETCH_HEAD'));
  const result = f.run({ cwd: clone }); assert.equal(result.shallow, true);
  assert.equal(result.comparisons.currentToCandidate.relation, 'incomplete_history');
});

test('matching the candidate is distinct from certifying release readiness', t => {
  const f = fixture(t); f.git('switch', 'candidate'); f.git('branch', '--set-upstream-to=origin/codex/yoki-yoki-3-world', 'candidate');
  const result = f.run(); assert.equal(result.comparisons.currentToCandidate.relation, 'same');
  assert.equal(result.workingTree.clean, true); assert.match(result.scope, /ネイティブ動作/);
  assert.equal(result.releaseReady, undefined);
});

test('the copy/paste stdin command works from a nested checkout directory', t => {
  const f = fixture(t), nested = join(f.root, 'nested'); mkdirSync(nested);
  const result = f.run({ stdin: true, cwd: nested });
  assert.equal(result.current.sha, f.base); assert.equal(result.postMergeConfigured, true);
});

test('outside a repository exits with a concise error, without stack or environment dump', t => {
  const root = mkdtempSync(join(tmpdir(), 'yoki-no-repo-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.match(result.stderr, /リポジトリ/);
  assert.equal(result.stderr.includes(root), false); assert.equal(result.stderr.includes(' at '), false);
});
