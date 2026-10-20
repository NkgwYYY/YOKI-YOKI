"""Install the reviewed simulator build in an isolated GitHub macOS runner."""
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import tarfile
import urllib.parse
import urllib.request

def run(*args):
    return subprocess.check_output(args, text=True).strip()

root = Path(__file__).resolve().parents[3]
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
devices = json.loads(run('xcrun', 'simctl', 'list', 'devices', 'available', '--json'))['devices']
family = os.environ['DEVICE_FAMILY']
choices = [(runtime, d) for runtime, values in devices.items() if '.iOS-' in runtime
           for d in values if d.get('isAvailable') and d['name'].startswith(family)]
if not choices:
    raise SystemExit('No available iOS simulator for ' + family)
preferred = 'iPhone 16 Plus' if family == 'iPhone' else 'iPad Air 11-inch (M3)'
choices.sort(key=lambda pair: (pair[1]['name'] == preferred,
    tuple(int(x) for x in re.findall(r'\d+', pair[0])), pair[1]['name']), reverse=True)
runtime, device = choices[0]
udid = device['udid']
print('Testing device:', device['name'], 'Runtime:', runtime, flush=True)
evidence = Path('review-results')
evidence.mkdir(exist_ok=True)
(evidence / 'environment.json').write_text(json.dumps({
    'build_id': build['build_id'], 'source_commit': build['source_commit'],
    'device': device['name'], 'runtime': runtime, 'version': info.get('CFBundleVersion'),
    'note': 'Simulator validation; not a physical-device or signed-IPA installation test.',
}, indent=2))
if device['state'] != 'Booted':
    subprocess.run(['xcrun', 'simctl', 'boot', udid], check=True)
subprocess.run(['xcrun', 'simctl', 'bootstatus', udid, '-b'], check=True)
subprocess.run(['xcrun', 'simctl', 'install', udid, str(app)], check=True)
with open(os.environ['GITHUB_ENV'], 'a') as handle:
    handle.write('YOKI_SIMULATOR_UDID=' + udid + '\n')
