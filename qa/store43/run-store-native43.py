"""Capture build43 in an isolated standard GitHub macOS runner.
Uses the completed build43 simulator archive unchanged; no app source patching.
"""
import json, os, plistlib, re, subprocess, tarfile, tempfile, urllib.parse, urllib.request, urllib.error
from pathlib import Path

root=Path.cwd()
out=root/'store-native43'
out.mkdir(exist_ok=True)
work=Path(tempfile.mkdtemp(prefix='yoki-store43-'))
input_data={'applicationArchiveUrl':os.environ['YOKI_SIMULATOR_ARCHIVE_URL'], 'buildId':'553dbe7c-ac36-438c-b7a4-c5d987376bb7', 'runtimeCommit':'04d9a152300a16a88f686bd5e64f7c04453e728d'}
url=input_data['applicationArchiveUrl']
if not url: raise SystemExit('Simulator archive repository secret is missing')
parsed=urllib.parse.urlparse(url)
if parsed.scheme!='https' or parsed.hostname!='expo.dev' or not parsed.path.startswith('/artifacts/eas/'):
    raise SystemExit('Unexpected simulator artifact source')
archive=work/'app.tar.gz'
# Use the official Expo downloader with its normal transport; no account token is needed.
node_download = """
const {downloadFileWithProgressTrackerAsync} = require(process.env.YOKI_CAPTURE_TOOLS + '/node_modules/eas-cli/build/utils/download.js');
downloadFileWithProgressTrackerAsync(process.env.YOKI_SIMULATOR_ARCHIVE_URL, process.argv[1], () => 'Downloading simulator43', 'Downloaded simulator43')
.then(() => process.exit(0)).catch(() => { console.error('Official Expo download failed'); process.exit(1); });
"""
download=subprocess.run(['node','-e',node_download,str(archive)],capture_output=True,text=True,timeout=360)
if download.returncode:
    raise SystemExit('Official Expo downloader failed; secret URL intentionally omitted')
print('Downloaded original simulator build43 with official Expo downloader', flush=True)
with tarfile.open(archive) as z:
    for m in z.getmembers():
        if m.name.startswith('/') or '..' in Path(m.name).parts: raise SystemExit('Unsafe archive path')
    z.extractall(work,filter='data')
apps=list(work.glob('*.app'))
if len(apps)!=1: raise SystemExit('Expected one native app')
app=apps[0]
with (app/'Info.plist').open('rb') as f: info=plistlib.load(f)
bundle=info['CFBundleIdentifier']
# Stop any runner-provided simulator before creating this isolated device.
subprocess.run(['xcrun','simctl','shutdown','all'],check=False,timeout=60)
if bundle!='app.replit.yokiyoki--' or str(info['CFBundleVersion'])!='43': raise SystemExit('Wrong app or build number')
def read(*cmd): return subprocess.check_output(cmd,text=True).strip()
devices=json.loads(read('xcrun','simctl','list','devices','available','--json'))['devices']
candidates=[(r,d) for r,rows in devices.items() if '.iOS-' in r for d in rows if d['name']=='iPhone 16 Plus' and d.get('isAvailable')]
if not candidates: candidates=[(r,d) for r,rows in devices.items() if '.iOS-' in r for d in rows if d['name'].startswith('iPhone') and d.get('isAvailable')]
runtime,d=max(candidates,key=lambda x:tuple(map(int,re.findall(r'\d+',x[0]))))
udid=read('xcrun','simctl','create','YokiStoreCapture43',d['deviceTypeIdentifier'],runtime)
evidence={'native':True,'archiveSha256':__import__('hashlib').sha256(archive.read_bytes()).hexdigest(),'sourceSimulatorBuild':input_data['buildId'],'runtimeCommit':input_data['runtimeCommit'],'version':info['CFBundleShortVersionString'],'buildNumber':info['CFBundleVersion'],'device':d['name'],'runtime':runtime,'syntheticProfile':True,'runtimeModified':False}
(out/'provenance.json').write_text(json.dumps(evidence,indent=2))
try:
    subprocess.run(['xcrun','simctl','boot',udid],check=True,timeout=120)
    subprocess.run(['xcrun','simctl','bootstatus',udid,'-b'],check=True,timeout=600)
    subprocess.run(['xcrun','simctl','install',udid,str(app)],check=True,timeout=120)
    subprocess.run(['python3','qa/store43/seed-store-capture43.py'],check=True,timeout=90)
    subprocess.run(['ruby','qa/store43/create-store-xctest43.rb',str(work/'test')],check=True,timeout=60)
    result_bundle=work/'native.xcresult'
    command=['xcodebuild','-project',str(work/'test/StoreCapture.xcodeproj'),'-scheme','StoreCaptureUITests','-configuration','Release','-sdk','iphonesimulator','-destination',f'platform=iOS Simulator,id={udid}','-destination-timeout','180','-derivedDataPath',str(work/'derived'),'-resultBundlePath',str(result_bundle),'-parallel-testing-enabled','NO','-maximum-concurrent-test-simulator-destinations','1','ARCHS=arm64','ONLY_ACTIVE_ARCH=YES','CODE_SIGNING_ALLOWED=NO','test']
    with (out/'xctest.log').open('w') as log: test=subprocess.run(command,stdout=log,stderr=subprocess.STDOUT,timeout=900)
    if result_bundle.exists():
        subprocess.run(['xcrun','xcresulttool','export','attachments','--path',str(result_bundle),'--output-path',str(out/'attachments')],check=True,timeout=90)
        with (out/'summary.json').open('w') as f: subprocess.run(['xcrun','xcresulttool','get','test-results','summary','--path',str(result_bundle)],stdout=f,check=True,timeout=60)
    print((out/'xctest.log').read_text()[-4500:])
    if test.returncode: raise SystemExit(test.returncode)
finally:
    subprocess.run(['xcrun','simctl','io',udid,'screenshot',str(out/'final-screen.png')],check=False,timeout=30)
    subprocess.run(['xcrun','simctl','shutdown',udid],check=False,timeout=30)
