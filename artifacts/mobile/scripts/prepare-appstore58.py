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
key_dir = Path(os.environ['RUNNER_TEMP']) / 'yoki-upload58' / 'private_keys'
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

# Prepare only the already verified build. Never cancel an existing review.
BID='933b3443-f378-4ca6-9b32-fa6e14498a75'
SOURCE_VERSION='cf77efbc-8e9e-4ac6-b61a-b965510296c0'
build=api('/v1/builds/'+BID)['data']
assert build['attributes']['version']=='58' and build['attributes']['processingState']=='VALID'
assert not build['attributes'].get('expired')
assert api('/v1/builds/'+BID+'/preReleaseVersion')['data']['attributes']['version']=='1.2.6'
versions=items('/v1/apps/'+APP+'/appStoreVersions?filter[platform]=IOS&limit=30')
base=next(v for v in versions if v['id']==SOURCE_VERSION)
assert base['attributes']['versionString']=='1.2.5' and base['attributes']['appStoreState']=='READY_FOR_SALE'
targets=[v for v in versions if v['attributes']['versionString']=='1.2.6']
assert len(targets)<=1
if not targets:
    attrs={'platform':'IOS','versionString':'1.2.6','releaseType':base['attributes']['releaseType']}
    if base['attributes'].get('copyright'):attrs['copyright']=base['attributes']['copyright']
    target=api('/v1/appStoreVersions','POST',{'data':{'type':'appStoreVersions','attributes':attrs,'relationships':{'app':rel('apps',APP)}}})['data']
else:
    target=targets[0]
vid=target['id']
print('TARGET_VERSION',vid,target['attributes']['versionString'],target['attributes']['appStoreState'],flush=True)
assert target['attributes']['appStoreState'] in ('PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED')
api('/v1/appStoreVersions/'+vid+'/relationships/build','PATCH',rel('builds',BID))
notes={
'ja':'・おみせの商品画像と価格表示を見やすくしました。\n・着ぐるみの試着と購入の操作を整理しました。\n・気分の記録を1問ずつ回答する形式に改善しました。\n・記録の振り返り画面と交換日記の表示を改善しました。',
'en-US':'Improved product images and pricing in the shop.\nSimplified costume previews and purchase controls.\nUpdated daily check-ins to show one question at a time.\nImproved the record overview and shared diary presentation.'
}
locs=items('/v1/appStoreVersions/'+vid+'/appStoreVersionLocalizations')
for loc in locs:
    locale=loc['attributes']['locale']
    if locale in notes:
        api('/v1/appStoreVersionLocalizations/'+loc['id'],'PATCH',{'data':{'type':'appStoreVersionLocalizations','id':loc['id'],'attributes':{'whatsNew':notes[locale]}}})
    sets=items('/v1/appStoreVersionLocalizations/'+loc['id']+'/appScreenshotSets')
    report=[]
    for group in sets:
        shots=items('/v1/appScreenshotSets/'+group['id']+'/appScreenshots')
        report.append({'display':group['attributes']['screenshotDisplayType'],'count':len(shots),'states':[s['attributes'].get('assetDeliveryState',{}).get('state') for s in shots]})
    print('LOCALIZATION_READY',locale,loc['id'],'description='+str(bool(loc['attributes'].get('description'))),'supportURL='+str(bool(loc['attributes'].get('supportUrl'))),'screenshots',json.dumps(report),flush=True)
detail=api('/v1/appStoreVersions/'+vid+'/appStoreReviewDetail',optional=True).get('data')
print('REVIEW_DETAIL_READY',bool(detail),'fields',sorted(k for k,v in (detail or {}).get('attributes',{}).items() if v),flush=True)
linked=api('/v1/appStoreVersions/'+vid+'/build')['data']
assert linked['id']==BID
print('PREPARED_BUILD58',vid,BID,flush=True)
