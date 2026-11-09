"""Associate the candidate JavaScript and unchanged native app with the standalone UI test runner."""
from pathlib import Path
import os, plistlib, shutil
root=Path(os.environ['RUNNER_TEMP'])/'yoki-test-derived/Build/Products'
files=list(root.glob('*.xctestrun'))
if len(files)!=1: raise SystemExit('Expected exactly one generated xctestrun')
p=files[0]; data=plistlib.loads(p.read_bytes())
targets=[]
if 'TestConfigurations' in data:
    for config in data['TestConfigurations']: targets.extend(config['TestTargets'])
else:
    targets=[v for k,v in data.items() if isinstance(v,dict) and 'TestBundlePath' in v]
if len(targets)!=1: raise SystemExit('Unexpected UI test target count')
t=targets[0]
t['UseUITargetAppProvidedByTests']=False
t['UITargetAppPath']=os.environ['YOKI_LOCAL_SIM_APP']
t['UITargetAppBundleIdentifier']='app.replit.yokiyoki--'
t['TestLanguage']='ja';t['TestRegion']='JP'
p.write_bytes(plistlib.dumps(data))
shutil.copyfile(p,Path('review-results/iPhone')/'configured.xctestrun')
with open(os.environ['GITHUB_ENV'],'a') as out:out.write('YOKI_XCTESTRUN='+str(p)+'\n')
print('Associated exact prebuilt app with the UI test runner; candidate bundle and unchanged native core.')

