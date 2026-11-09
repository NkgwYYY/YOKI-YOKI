import base64
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

# Credentials are runner environment variables; never print their values.
key_id = os.environ.get('YOKI_ASC_KEY_ID', '').strip()
issuer = os.environ.get('YOKI_ASC_ISSUER_ID', '').strip()
pem = os.environ.get('YOKI_ASC_PRIVATE_KEY', '').replace('\r\n', '\n').strip() + '\n'
if not re.fullmatch(r'[A-Z0-9]{10}', key_id):
    raise SystemExit('YOKI_ASC_KEY_ID must be the new key ID, not the filename.')
if not re.fullmatch(r'[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}', issuer):
    raise SystemExit('YOKI_ASC_ISSUER_ID is not a valid Issuer ID.')
if not pem.startswith('-----BEGIN PRIVATE KEY-----\n') or not pem.rstrip().endswith('-----END PRIVATE KEY-----'):
    raise SystemExit('YOKI_ASC_PRIVATE_KEY must contain the complete .p8 text, including its BEGIN/END lines.')
key_dir = Path(os.environ['RUNNER_TEMP']) / 'yoki-upload59' / 'private_keys'
key_dir.mkdir(parents=True, exist_ok=True)
key_dir.chmod(0o700)
key_file = key_dir / ('AuthKey_' + key_id + '.p8')
key_file.write_text(pem, encoding='utf-8')
key_file.chmod(0o600)
check = subprocess.run(['openssl', 'pkey', '-in', str(key_file), '-check', '-noout'], capture_output=True)
if check.returncode:
    raise SystemExit('The private key could not be read. Check the full .p8 text in GitHub Secrets.')

def b64(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=')

now = int(time.time())
header = {'alg': 'ES256', 'kid': key_id, 'typ': 'JWT'}
claims = {'iss': issuer, 'iat': now - 10, 'exp': now + 600, 'aud': 'appstoreconnect-v1'}
message = b64(json.dumps(header, separators=(',', ':')).encode()) + b'.' + b64(json.dumps(claims, separators=(',', ':')).encode())
result = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', str(key_file)], input=message, capture_output=True)
if result.returncode:
    raise SystemExit('Could not sign the Apple authentication token.')
der = result.stdout

def tlv(data, position, tag):
    if position >= len(data) or data[position] != tag:
        raise ValueError('Unexpected signature encoding')
    position += 1
    length = data[position]
    position += 1
    if length & 0x80:
        count = length & 0x7f
        length = int.from_bytes(data[position:position + count], 'big')
        position += count
    end = position + length
    if end > len(data):
        raise ValueError('Incomplete signature')
    return data[position:end], end

sequence, end = tlv(der, 0, 0x30)
if end != len(der):
    raise SystemExit('Unexpected signature trailing bytes.')
r, offset = tlv(sequence, 0, 0x02)
s, end = tlv(sequence, offset, 0x02)
if end != len(sequence):
    raise SystemExit('Unexpected signature sequence.')
raw = int.from_bytes(r, 'big').to_bytes(32, 'big') + int.from_bytes(s, 'big').to_bytes(32, 'big')
token = (message + b'.' + b64(raw)).decode()
# Mask the generated token before any tool could log it. Never persist it.
print('::add-mask::' + token)

APP='6808389457'
BASE='https://api.appstoreconnect.apple.com'
def api(path,method='GET',body=None,optional=False):
    request=urllib.request.Request(BASE+path,method=method,headers={'Authorization':'Bearer '+token,'Accept':'application/json','Content-Type':'application/json'},data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(request,timeout=60) as response:
            raw=response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        if optional and exc.code==404:return {'data':None}
        errors=json.loads(exc.read()).get('errors',[])
        # Only error codes and field pointers: never emit request or contact/login data.
        print('Apple API error:',method,path.split('?')[0],exc.code,[{'code':e.get('code'),'title':e.get('title'),'source':e.get('source')} for e in errors])
        raise SystemExit(1)

def rel(kind,ident):return {'data':{'type':kind,'id':ident}}
def items(path):return api(path).get('data',[])
versions=items('/v1/apps/'+APP+'/appStoreVersions?filter[platform]=IOS&limit=20')
for v in versions:print('RELEASE',v['id'],v['attributes']['versionString'],v['attributes'].get('appStoreState'),v['attributes'].get('releaseType'))
groups=items('/v1/apps/'+APP+'/betaGroups?limit=200')
for g in groups: print('GROUP',g['id'],g['attributes'].get('name'), 'internal='+str(g['attributes'].get('isInternalGroup')))
for v in versions:
    if v['attributes']['versionString'] not in ('1.2.4','1.2.6'):continue
    localizations=items('/v1/appStoreVersions/'+v['id']+'/appStoreVersionLocalizations')
    for loc in localizations:
        sets=items('/v1/appStoreVersionLocalizations/'+loc['id']+'/appScreenshotSets?include=appScreenshots')
        print('LOCALIZATION',v['attributes']['versionString'],loc['id'],loc['attributes']['locale'],'screenshots',[(s['attributes']['screenshotDisplayType'],len(s.get('relationships',{}).get('appScreenshots',{}).get('data',[]))) for s in sets])
    detail=api('/v1/appStoreVersions/'+v['id']+'/appStoreReviewDetail',optional=True).get('data')
    print('REVIEW_DETAIL',v['attributes']['versionString'],'exists='+str(bool(detail)),'fields='+str(sorted(k for k,val in (detail or {}).get('attributes',{}).items() if val)))
submissions=items('/v1/apps/'+APP+'/reviewSubmissions?filter[platform]=IOS&limit=20')
for s in submissions: print('SUBMISSION',s['id'],s['attributes'].get('state'))
builds=items('/v1/builds?filter[app]='+APP+'&filter[version]=59&include=preReleaseVersion')
for b in builds:print('BUILD59',b['id'],b['attributes'].get('processingState'),b['attributes'].get('usesNonExemptEncryption'))
mode=os.environ.get('YOKI_RELEASE_MODE','inspect')
if mode not in ('inspect','testflight'):raise SystemExit('Unsupported mode for this API key')
if mode=='inspect':raise SystemExit(0)
for attempt in range(24):
    if builds and builds[0]['attributes'].get('processingState') in ('VALID','FAILED','INVALID'):break
    print('Waiting for Apple processing of build 59',attempt+1,flush=True)
    time.sleep(15)
    builds=items('/v1/builds?filter[app]='+APP+'&filter[version]=59&include=preReleaseVersion')
if not builds:
    raise SystemExit('Build 59 has not arrived at Apple yet; no review submitted')
if len(builds)!=1:raise SystemExit('Ambiguous build 59')
build=builds[0]
bid=build['id']
prv=api('/v1/builds/'+bid+'/preReleaseVersion')['data']
if prv['attributes']['version']!='1.2.6' or build['attributes']['version']!='59':raise SystemExit('Version/build mismatch')
if build['attributes'].get('processingState')!='VALID':raise SystemExit('Apple is still processing build 59')
if build['attributes'].get('usesNonExemptEncryption') is None:
    # app.json / ITSAppUsesNonExemptEncryption is already false in the signed app.
    api('/v1/builds/'+bid,'PATCH',{'data':{'type':'builds','id':bid,'attributes':{'usesNonExemptEncryption':False}}})
known_group=next((g for g in groups if g['id']=='255b6676-7deb-484a-898e-1ac35e613b5e' and g['attributes'].get('isInternalGroup')),None)
if not known_group:raise SystemExit('The previously verified internal tester group changed')
existing_builds=items('/v1/betaGroups/'+known_group['id']+'/builds?limit=200')
if not any(b['id']==bid for b in existing_builds):
    api('/v1/betaGroups/'+known_group['id']+'/relationships/builds','POST',{'data':[{'type':'builds','id':bid}]})
verified_builds=items('/v1/betaGroups/'+known_group['id']+'/builds?limit=200')
if not any(b['id']==bid for b in verified_builds):raise SystemExit('TestFlight group attachment not confirmed')
print('TESTFLIGHT_CONFIRMED',bid,'Team (Expo)')
