"""Synthetic data only, within a fresh disposable GitHub macOS simulator."""
import hashlib, json, subprocess
from pathlib import Path
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

def run(*args):
    return subprocess.check_output(args, text=True).strip()

bundle='app.replit.yokiyoki--'
devices=json.loads(run('xcrun','simctl','list','devices','booted','--json'))['devices']
booted=[d for rows in devices.values() for d in rows if d.get('state')=='Booted']
if len(booted)!=1:
    raise SystemExit('Expected exactly one disposable booted simulator')
udid=booted[0]['udid']
container=Path(run('xcrun','simctl','get_app_container',udid,bundle,'data'))
storage=container/'Library/Application Support'/bundle/'RCTAsyncLocalStorage_V1'
storage.mkdir(parents=True,exist_ok=True)
manifest_path=storage/'manifest.json'
if manifest_path.exists():
    existing=json.loads(manifest_path.read_text())
    if existing:
        raise SystemExit('Refusing to overwrite non-empty simulator app data')
today=datetime.now().astimezone().date()
progress={'level':3,'experience':0,'mentalMuscle':0,'streak':0,'totalDays':0,'lastRecordDate':'',
 'evolution':{'version':1,'stage':'odango','declined':[],'usedFree':['egg'],'revision':0,'changedAt':0,
 'wallet':{'evolution':0,'regression':0,'receipts':[]}}}
fixture={'@mentore/profile_v1':{'nickname':'はる','ageRange':'回答しない','gender':'回答しない'},
 '@mentore/progress_v2':progress,'@mentore/feed_state_v1':{'points':0,'lastFeedTime':'','satietyAtFeed':50}}
manifest={}
for key,value in fixture.items():
    encoded=json.dumps(value,ensure_ascii=False,separators=(',',':'))
    if len(encoded.encode('utf-16-le'))//2<=1024:
        manifest[key]=encoded
    else:
        (storage/hashlib.md5(key.encode()).hexdigest()).write_text(encoded)
        manifest[key]=None
manifest['@yoki/first-steps/v1/guest']='done'
for tz in [None,ZoneInfo('Asia/Tokyo')]:
    d=datetime.now(tz).date()
    for offset in range(-1,2):
        manifest['@yoki/daily-letter/v1/guest/'+(d+timedelta(days=offset)).isoformat()]='seen'
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False))
subprocess.run(['xcrun','simctl','status_bar',udid,'override','--time','9:41','--dataNetwork','wifi','--wifiMode','active','--wifiBars','3','--batteryState','charged','--batteryLevel','100'],check=True)
print(json.dumps({'scope':'fresh isolated GitHub macOS simulator','device':booted[0]['name'],'syntheticProfile':True,'productionRuntimeModified':False,'nativeSource':'build43'}))
