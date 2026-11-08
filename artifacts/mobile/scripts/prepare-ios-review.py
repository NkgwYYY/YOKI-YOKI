"""Install the reviewed simulator build in an isolated GitHub macOS runner."""
import json
import os
from datetime import datetime, timedelta
import hashlib
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
preferred = (['iPhone 17 Pro', 'iPhone 16 Pro', 'iPhone 17', 'iPhone 16', 'iPhone 16 Plus']
             if family == 'iPhone' else ['iPad Air 11-inch (M3)'])
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
egg_capture = os.environ.get('YOKI_QA_EGG') == '1'
evidence = Path('review-results') / (family + 'Egg' if egg_capture else family)
evidence.mkdir(exist_ok=True, parents=True)
(evidence / 'available-runtimes.json').write_text(json.dumps(runtimes, indent=2))
# Use the onscreen keyboard in this disposable runner. A fresh simulator has
# no per-device preference yet; set the default before Simulator is opened.
# Keep the setting in evidence so a focus failure remains diagnosable.
run('defaults', 'write', 'com.apple.iphonesimulator', 'ConnectHardwareKeyboard', '-bool', 'false')
hardware_keyboard = run('defaults', 'read', 'com.apple.iphonesimulator', 'ConnectHardwareKeyboard')
if hardware_keyboard != '0':
    raise SystemExit('Could not disable the simulator hardware keyboard')
attempts = []
for attempt, runtime in enumerate(boot_runtimes, start=1):
    compatible_devices = [d for r, d in choices if r == runtime]
    device = min(compatible_devices, key=lambda d: (
        preferred.index(d['name']) if d['name'] in preferred else len(preferred), d['name']))
    device_type = device['deviceTypeIdentifier']
    # Only retry an OS bootstrap failure, before installing or opening the app.
    # Preserve the first failure; never retry a failed application journey here.
    udid = run('xcrun', 'simctl', 'create',
               'YokiReview-' + os.environ['GITHUB_RUN_ID'] + '-' + family + ('Egg' if egg_capture else '') + '-' + str(attempt),
               device_type, runtime)
    print('Testing device:', device['name'], 'Runtime:', runtime,
          'Fresh simulator:', udid, 'Boot attempt:', attempt, flush=True)
    (evidence / 'device-id.txt').write_text(udid)
    subprocess.run(['xcrun', 'simctl', 'boot', udid], check=True, timeout=600)
    # Open the window for each isolated device, including iPad compatibility
    # testing, so CoreSimulator and Xcode observe the same active device.
    try:
        window = subprocess.run(['open', '-a', 'Simulator', '--args', '-CurrentDeviceUDID', udid],
                                capture_output=True, text=True, timeout=30)
        window_output = window.stdout + window.stderr
    except subprocess.TimeoutExpired as error:
        window_output = str(error)
    (evidence / f'simulator-window-attempt-{attempt}.log').write_text(window_output)
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
        'connect_hardware_keyboard': False,
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
# Fixture lives only in this newly-created simulator. It makes two real UI
# purchases affordable without changing the production app or requesting ads.
# AsyncStorage 2.2.0 RNCAsyncStorage.mm uses this bundle-scoped directory and
# stores small values inline in manifest.json. Never overwrite existing data.
container = Path(run('xcrun', 'simctl', 'get_app_container', udid,
                     info['CFBundleIdentifier'], 'data'))
storage = container / 'Library/Application Support' / info['CFBundleIdentifier'] / 'RCTAsyncLocalStorage_V1'
storage.mkdir(parents=True, exist_ok=False)
feed = {'points': 5000, 'lastFeedTime': '', 'satietyAtFeed': 50}
progress = {'level': 1 if egg_capture else 3, 'experience': 0, 'mentalMuscle': 0, 'streak': 0, 'totalDays': 0, 'lastRecordDate': ''}
fixture = {'@mentore/feed_state_v1': feed}
synthetic_records = []
if not egg_capture:
    # The current day stays empty, so the original diary-save/reward journey
    # retains its meaning. Interleave the groups to avoid a before/after-only
    # comparison; both have nine independently dated observations.
    # Fresh simulator time follows its runner's local timezone, as getTodayDate
    # does in the app. These dates remain in the 30-day window across midnight.
    local_today = datetime.now().astimezone().date()
    for offset in range(1, 19):
        outside = offset % 2 == 1
        synthetic_records.append({
            'id': f'synthetic-pattern-{offset}',
            'date': (local_today - timedelta(days=offset)).isoformat(),
            'mood': 5 if outside else 2,
            'sleep': 0, 'sleepRecorded': False,
            'behaviors': ['外に出た' if outside else 'ゆっくり休んだ'],
            'notes': '',
        })
    fixture['@mentore/records_v2'] = synthetic_records
    progress['totalDays'] = len(synthetic_records)
    progress['lastRecordDate'] = (local_today - timedelta(days=1)).isoformat()
    # Choice-evolution fixture: thirty real synthetic visit dates, still fluffy.
    visit_dates = [(local_today - timedelta(days=i)).isoformat() for i in range(29, -1, -1)]
    progress['visits'] = {'version':2,'historicalVisits':0,'lastDate':visit_dates[-1],
        'streak':30,'bestStreak':30,'totalVisits':30,'stage':'stage4','highestStage':'stage4','dates':visit_dates}
    progress['evolution'] = {'version':1,'stage':'odango','declined':[],'usedFree':['egg'],
        'revision':0,'changedAt':0,'wallet':{'evolution':0,'regression':0,'receipts':[]}}

if os.environ.get('YOKI_QA_MOYAMOYA') == '1':
    feed['wardrobe'] = {'version': 1, 'owned': ['panda'], 'equipped': 'panda', 'changedAt': 1}
    for record in synthetic_records[:4]:
        record['moyamoya'] = {'has': True, 'pattern': 'busy', 'memo': '', 'participated': True}

room_capture = os.environ.get('YOKI_QA_ROOMS') == '1'
raw_flags = {}
if room_capture:
    today = datetime.now().astimezone().date().isoformat()
    feed['points'] = 10000
    feed['wardrobe'] = {'version':1,'owned':['panda'],'equipped':None,'changedAt':1}
    fixture['@mentore/profile_v1'] = {'nickname':'Yoki QA','ageRange':'回答しない','gender':'回答しない'}
    fixture['@mentore/records_v2'] = [{'id':'room-qa','date':today,'mood':3,'fatigue':1,'worry':1,'notes':'','moyamoya':{'has':False}}]
    progress['lastRecordDate'] = today
    raw_flags['@yoki/first-steps/v1/guest'] = 'done'
    for kind in ['daily-letter','scenic-return','daily-check-in']:
        raw_flags[f'@yoki/{kind}/v1/guest/{today}'] = 'home' if kind == 'scenic-return' else 'seen'

fixture['@mentore/progress_v2'] = progress
manifest = {}
for key, value in fixture.items():
    encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    # Match RNCAsyncStorage's actual inline/MD5-file convention. No app source
    # test hook, network request, user installation, or existing data is used.
    if len(encoded.encode('utf-16-le')) // 2 <= 1024:
        manifest[key] = encoded
    else:
        (storage / hashlib.md5(key.encode('utf-8')).hexdigest()).write_text(encoded, encoding='utf-8')
        manifest[key] = None
manifest.update(raw_flags)
(storage / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False), encoding='utf-8')
(evidence / 'synthetic-fixture.json').write_text(json.dumps({
    'scope': 'fresh isolated simulator only', 'wallet_points': feed['points'], 'legacy_character_level': 1 if egg_capture else 3,
    'purpose': 'Verify native rendering, care and furniture persistence, plus real local insight comparison and saved-hint persistence.',
    'production_app_modified': False, 'profile_seeded': room_capture,
    'synthetic_pattern_days': len(synthetic_records),
    'pattern_expected': None if egg_capture else {'activity': '外に出た', 'selected_days': 9, 'selected_good_days': 9, 'comparison_days': 9, 'comparison_good_days': 0},
    'current_day_seeded': room_capture,
}, indent=2))
with open(os.environ['GITHUB_ENV'], 'a') as handle:
    handle.write('YOKI_SIMULATOR_UDID=' + udid + '\n')

