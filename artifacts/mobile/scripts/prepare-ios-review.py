"""Install the reviewed simulator build in an isolated GitHub macOS runner."""
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import tarfile
import urllib.parse
import urllib.request

def run(*args):
    return subprocess.check_output(args, text=True).strip()

root = Path(__file__).resolve().parents[3]
if os.environ.get('YOKI_LOCAL_SIM_APP'):
    app = Path(os.environ['YOKI_LOCAL_SIM_APP'])
    build = {'build_id': 'source-build-' + os.environ['GITHUB_RUN_ID'],
             'source_commit': os.environ['GITHUB_SHA']}
else:
    build = json.loads((root / 'docs/qa/ios-review-simulator.json').read_text())
    url = build['artifact_url']
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'expo.dev' or not parsed.path.startswith('/artifacts/eas/'):
        raise SystemExit('Unexpected simulator artifact source')
    work = Path(os.environ['RUNNER_TEMP']) / 'yoki-review'
    work.mkdir()
    archive = work / 'app.tar.gz'
    urllib.request.urlretrieve(url, archive)
    with tarfile.open(archive) as bundle:
        bundle.extractall(work, filter='data')
    apps = list(work.glob('*.app'))
    if len(apps) != 1:
        raise SystemExit('Expected one simulator .app at archive root')
    app = apps[0]
with (app / 'Info.plist').open('rb') as handle:
    info = plistlib.load(handle)
if info['CFBundleIdentifier'] != 'app.replit.yokiyoki--':
    raise SystemExit('Unexpected application identity')
print('Build:', build['build_id'], 'Version:', info.get('CFBundleShortVersionString'), info.get('CFBundleVersion'))
print('Executable:', run('file', str(app / info['CFBundleExecutable'])))
# Keep the SDK declarations from the exact compiled app for privacy review.
# Only manifests are copied, never credentials or local runtime data.
manifest_root = Path('review-results/privacy-manifests')
for manifest in app.rglob('PrivacyInfo.xcprivacy'):
    target = manifest_root / manifest.relative_to(app)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(manifest, target)
devices = json.loads(run('xcrun', 'simctl', 'list', 'devices', 'available', '--json'))['devices']
family = os.environ['DEVICE_FAMILY']
choices = [(runtime, d) for runtime, values in devices.items() if '.iOS-' in runtime
           for d in values if d.get('isAvailable') and d['name'].startswith(family)]
if not choices:
    raise SystemExit('No available iOS simulator for ' + family)
preferred = 'iPhone 16 Plus' if family == 'iPhone' else 'iPad Air 11-inch (M3)'
runtime = max((r for r, _ in choices), key=lambda r: tuple(int(x) for x in re.findall(r'\d+', r)))
choices.sort(key=lambda pair: (pair[1]['name'] == preferred,
    tuple(int(x) for x in re.findall(r'\d+', pair[0])), pair[1]['name']), reverse=True)
_, device = choices[0]
# A runner's pre-created iPhone failed data migration, and its preferred iPad
# used an older runtime. Create disposable devices on the newest installed OS.
device_type = device['deviceTypeIdentifier']
evidence = Path('review-results') / family
evidence.mkdir(exist_ok=True, parents=True)
attempts = []
for attempt in range(1, 3):
    # Only retry an OS bootstrap failure, before installing or opening the app.
    # Preserve the first failure; never retry a failed application journey here.
    udid = run('xcrun', 'simctl', 'create',
               'YokiReview-' + os.environ['GITHUB_RUN_ID'] + '-' + family + '-' + str(attempt),
               device_type, runtime)
    print('Testing device:', device['name'], 'Runtime:', runtime,
          'Fresh simulator:', udid, 'Boot attempt:', attempt, flush=True)
    (evidence / 'device-id.txt').write_text(udid)
    subprocess.run(['xcrun', 'simctl', 'boot', udid], check=True, timeout=600)
    boot = subprocess.run(['xcrun', 'simctl', 'bootstatus', udid, '-b'],
                          capture_output=True, text=True, timeout=600)
    output = boot.stdout + boot.stderr
    (evidence / f'boot-attempt-{attempt}.log').write_text(output)
    print(output, flush=True)
    ready = boot.returncode == 0 and 'Data Migration Failed' not in output
    attempts.append({'udid': udid, 'ready': ready, 'returncode': boot.returncode})
    (evidence / 'environment.json').write_text(json.dumps({
        'build_id': build['build_id'], 'source_commit': build['source_commit'],
        'device': device['name'], 'runtime': runtime, 'version': info.get('CFBundleVersion'),
        'boot_attempts': attempts,
        'note': 'Simulator validation; not a physical-device or signed-IPA installation test.',
    }, indent=2))
    if ready:
        break
    subprocess.run(['xcrun', 'simctl', 'shutdown', udid], check=False, timeout=60)
    if attempt == 2:
        raise SystemExit('Both fresh simulator boot attempts failed; native journeys were not run.')
    print('OS data migration failed before app installation; trying one new disposable simulator.', flush=True)
subprocess.run(['xcrun', 'simctl', 'install', udid, str(app)], check=True)
with open(os.environ['GITHUB_ENV'], 'a') as handle:
    handle.write('YOKI_SIMULATOR_UDID=' + udid + '\n')
