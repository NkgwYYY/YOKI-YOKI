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
runtime_version = lambda value: tuple(int(x) for x in re.findall(r'\d+', value))
minimum_os = runtime_version(info.get('MinimumOSVersion', '17.0'))
runtimes = sorted({r for r, _ in choices if runtime_version(r) >= minimum_os},
                  key=runtime_version, reverse=True)
if not runtimes:
    raise SystemExit('No installed simulator runtime meets the app minimum OS')
# Repeated fresh iPhones on one runtime failed OS data migration before install.
# Keep the newest OS first, then use a different installed compatible runtime
# for the single bootstrap retry when available. Never retry an app test failure.
boot_runtimes = runtimes[:2] if len(runtimes) > 1 else runtimes * 2
evidence = Path('review-results') / family
evidence.mkdir(exist_ok=True, parents=True)
(evidence / 'available-runtimes.json').write_text(json.dumps(runtimes, indent=2))
attempts = []
for attempt, runtime in enumerate(boot_runtimes, start=1):
    compatible_devices = [d for r, d in choices if r == runtime]
    device = max(compatible_devices,
                 key=lambda d: (d['name'] == preferred, d['name']))
    device_type = device['deviceTypeIdentifier']
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
    attempts.append({'udid': udid, 'device': device['name'], 'runtime': runtime,
                     'ready': ready, 'returncode': boot.returncode})
    (evidence / 'environment.json').write_text(json.dumps({
        'build_id': build['build_id'], 'source_commit': build['source_commit'],
        'device': device['name'], 'runtime': runtime, 'version': info.get('CFBundleVersion'),
        'development_region': info.get('CFBundleDevelopmentRegion'),
        'localizations': info.get('CFBundleLocalizations', []),
        'boot_attempts': attempts,
        'note': 'Simulator validation; not a physical-device or signed-IPA installation test.',
    }, indent=2))
    if ready:
        break
    # A failed OS migration can also hang simctl shutdown. Keep cleanup bounded
    # without allowing that separate failure to skip the one fresh-device retry.
    try:
        cleanup = subprocess.run(['xcrun', 'simctl', 'shutdown', udid],
                                 check=False, timeout=60, capture_output=True, text=True)
        cleanup_output = cleanup.stdout + cleanup.stderr
    except subprocess.TimeoutExpired as error:
        cleanup_output = str(error)
        print('Failed simulator shutdown timed out; preserving evidence and continuing the bounded bootstrap flow.', flush=True)
    (evidence / f'shutdown-attempt-{attempt}.log').write_text(cleanup_output)
    if attempt == 2:
        raise SystemExit('Both fresh simulator boot attempts failed; native journeys were not run.')
    print('OS data migration failed before app installation; trying the next bounded bootstrap candidate.', flush=True)
subprocess.run(['xcrun', 'simctl', 'install', udid, str(app)], check=True)
with open(os.environ['GITHUB_ENV'], 'a') as handle:
    handle.write('YOKI_SIMULATOR_UDID=' + udid + '\n')
