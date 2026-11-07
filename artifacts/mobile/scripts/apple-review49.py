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
key_dir = Path(os.environ['RUNNER_TEMP']) / 'yoki-upload49' / 'private_keys'
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
    if v['attributes']['versionString'] not in ('1.2.4','1.2.5'):continue
    localizations=items('/v1/appStoreVersions/'+v['id']+'/appStoreVersionLocalizations')
    for loc in localizations:
        sets=items('/v1/appStoreVersionLocalizations/'+loc['id']+'/appScreenshotSets?include=appScreenshots')
        print('LOCALIZATION',v['attributes']['versionString'],loc['id'],loc['attributes']['locale'],'screenshots',[(s['attributes']['screenshotDisplayType'],len(s.get('relationships',{}).get('appScreenshots',{}).get('data',[]))) for s in sets])
    detail=api('/v1/appStoreVersions/'+v['id']+'/appStoreReviewDetail',optional=True).get('data')
    print('REVIEW_DETAIL',v['attributes']['versionString'],'exists='+str(bool(detail)),'fields='+str(sorted(k for k,val in (detail or {}).get('attributes',{}).items() if val)))
submissions=items('/v1/apps/'+APP+'/reviewSubmissions?filter[platform]=IOS&limit=20')
for s in submissions: print('SUBMISSION',s['id'],s['attributes'].get('state'))
builds=items('/v1/builds?filter[app]='+APP+'&filter[version]=49&include=preReleaseVersion')
for b in builds:print('BUILD49',b['id'],b['attributes'].get('processingState'),b['attributes'].get('usesNonExemptEncryption'))
# Release operations target only the inspected app and exact version/build.
mode=os.environ.get('YOKI_RELEASE_MODE','inspect')
if mode not in ('inspect','prepare','finish'):raise SystemExit('Unknown release mode')
if mode=='inspect':raise SystemExit(0)
previous=next(v for v in versions if v['attributes']['versionString']=='1.2.4')
current=next((v for v in versions if v['attributes']['versionString']=='1.2.5'),None)
if not current:
    other=[v for v in versions if v['attributes'].get('appStoreState') not in ('READY_FOR_SALE','REMOVED_FROM_SALE','DEVELOPER_REMOVED_FROM_SALE')]
    if other:raise SystemExit('Another editable release exists; no duplicate version created')
    attrs={'platform':'IOS','versionString':'1.2.5','releaseType':'AFTER_APPROVAL'}
    if previous['attributes'].get('copyright'):attrs['copyright']=previous['attributes']['copyright']
    current=api('/v1/appStoreVersions','POST',{'data':{'type':'appStoreVersions','attributes':attrs,'relationships':{'app':rel('apps',APP)}}})['data']
    print('CREATED_VERSION',current['id'])
vid=current['id']
editable=current['attributes'].get('appStoreState') in ('PREPARE_FOR_SUBMISSION','DEVELOPER_REJECTED','REJECTED','METADATA_REJECTED','READY_FOR_REVIEW')
notes_ja=Path('release-notes/1.2.5-ja.md').read_text().strip()
notes_en='Improved the character startup display. Added 24 everyday scenarios to the emotional self-care battles, adapted from public expert and health-organization resources with in-app source links. Added a clearer optional rewarded-ad entry: 10 points per completed view, up to three times per day.'
new_localizations=items('/v1/appStoreVersions/'+vid+'/appStoreVersionLocalizations')
old_localizations=items('/v1/appStoreVersions/'+previous['id']+'/appStoreVersionLocalizations')
if {l['attributes']['locale'] for l in new_localizations}!={l['attributes']['locale'] for l in old_localizations}:raise SystemExit('Inherited localization mismatch; stop before review')
for loc in new_localizations:
    locale=loc['attributes']['locale']
    if editable:
        api('/v1/appStoreVersionLocalizations/'+loc['id'],'PATCH',{'data':{'type':'appStoreVersionLocalizations','id':loc['id'],'attributes':{'whatsNew':notes_ja if locale=='ja' else notes_en}}})
    sets=items('/v1/appStoreVersionLocalizations/'+loc['id']+'/appScreenshotSets?include=appScreenshots')
    count=sum(len(s.get('relationships',{}).get('appScreenshots',{}).get('data',[])) for s in sets)
    if count<3:raise SystemExit('Existing screenshots did not carry over; stop before review')
    print('PREPARED_LOCALIZATION',locale,'screenshots='+str(count))
old_detail=api('/v1/appStoreVersions/'+previous['id']+'/appStoreReviewDetail')['data']
new_detail=api('/v1/appStoreVersions/'+vid+'/appStoreReviewDetail',optional=True).get('data')
if editable:
    fields=['contactFirstName','contactLastName','contactPhone','contactEmail','demoAccountRequired','demoAccountName','demoAccountPassword']
    attrs={k:old_detail['attributes'][k] for k in fields if old_detail['attributes'].get(k) is not None}
    attrs['notes']=(old_detail['attributes'].get('notes') or '')+'\n\nVersion 1.2.5 (49): optimized initial character rendering; 24 source-attributed self-care battle scenarios including handling irritation toward other people. To view a battle, complete the daily check-in and select an available worry topic. The battle screen includes reference-source links and explains that the material is adapted for everyday self-care. The optional rewarded-ad entry is available from the home point balance/menu for eligible users (age 20+); each server-verified completion grants 10 points, shared daily cap 3. Advertising is optional. No reward is granted solely from a client callback. Existing account and review access instructions above still apply.'
    if len(attrs['notes'])>4000:raise SystemExit('Review notes exceed Apple limit; preserve existing instructions')
    if new_detail:
        api('/v1/appStoreReviewDetails/'+new_detail['id'],'PATCH',{'data':{'type':'appStoreReviewDetails','id':new_detail['id'],'attributes':attrs}})
    else:
        api('/v1/appStoreReviewDetails','POST',{'data':{'type':'appStoreReviewDetails','attributes':attrs,'relationships':{'appStoreVersion':rel('appStoreVersions',vid)}}})
    print('PREPARED_REVIEW_DETAILS (credentials and contacts preserved without logging)')
if mode=='prepare':
    print('PREPARED_VERSION',vid)
    raise SystemExit(0)
if not builds:
    raise SystemExit('Build 49 has not arrived at Apple yet; no review submitted')
if len(builds)!=1:raise SystemExit('Ambiguous build 49')
build=builds[0]
bid=build['id']
prv=api('/v1/builds/'+bid+'/preReleaseVersion')['data']
if prv['attributes']['version']!='1.2.5' or build['attributes']['version']!='49':raise SystemExit('Version/build mismatch')
if build['attributes'].get('processingState')!='VALID':raise SystemExit('Apple is still processing build 49')
if build['attributes'].get('usesNonExemptEncryption') is None:
    # app.json / ITSAppUsesNonExemptEncryption is already false in the signed app.
    api('/v1/builds/'+bid,'PATCH',{'data':{'type':'builds','id':bid,'attributes':{'usesNonExemptEncryption':False}}})
existing_groups=items('/v1/builds/'+bid+'/betaGroups')
known_group=next((g for g in groups if g['id']=='255b6676-7deb-484a-898e-1ac35e613b5e' and g['attributes'].get('isInternalGroup')),None)
if not known_group:raise SystemExit('The previously verified internal tester group changed')
if not any(g['id']==known_group['id'] for g in existing_groups):
    api('/v1/betaGroups/'+known_group['id']+'/relationships/builds','POST',{'data':[{'type':'builds','id':bid}]})
verified_groups=items('/v1/builds/'+bid+'/betaGroups')
if not any(g['id']==known_group['id'] for g in verified_groups):raise SystemExit('TestFlight group attachment not confirmed')
print('TESTFLIGHT_CONFIRMED',bid,'Team (Expo)')
if editable:
    api('/v1/appStoreVersions/'+vid+'/relationships/build','PATCH',rel('builds',bid))
attached=api('/v1/appStoreVersions/'+vid+'/build')['data']
if attached['id']!=bid:raise SystemExit('App Store build link mismatch')
print('BUILD_ATTACHED',vid,bid)
# The new reward feature must be live before sending Apple to the production server.
with urllib.request.urlopen('https://yoki-yoki.replit.app/api/community/config?rewardPolicy=daily10',timeout=45) as response:config=json.load(response)
if config.get('rewardPolicy')!='daily10' or config.get('bonusPoints')!=10 or config.get('dailyLimit')!=3:
    print('SERVER_NOT_READY: TestFlight distributed and App Store metadata/build prepared; review held until daily10 is live.')
    raise SystemExit(0)
print('PRODUCTION_REWARD_POLICY_CONFIRMED daily10 / 10 points / 3 per day')
active=items('/v1/apps/'+APP+'/reviewSubmissions?filter[platform]=IOS&limit=200')
selected=None
for submission in active:
    state=submission['attributes'].get('state')
    if state=='COMPLETE':continue
    review_items=items('/v1/reviewSubmissions/'+submission['id']+'/items?include=appStoreVersion')
    target=[i for i in review_items if (i.get('relationships',{}).get('appStoreVersion',{}).get('data') or {}).get('id')==vid]
    if target:
        if len(review_items)!=1:raise SystemExit('Review contains additional items; do not submit them implicitly')
        selected=submission
        break
    if state in ('WAITING_FOR_REVIEW','IN_REVIEW','UNRESOLVED_ISSUES','CANCELING','COMPLETING'):
        raise SystemExit('Another active submission exists; no cancellation attempted')
if not selected:
    selected=api('/v1/reviewSubmissions','POST',{'data':{'type':'reviewSubmissions','attributes':{'platform':'IOS'},'relationships':{'app':rel('apps',APP)}}})['data']
    api('/v1/reviewSubmissionItems','POST',{'data':{'type':'reviewSubmissionItems','relationships':{'reviewSubmission':rel('reviewSubmissions',selected['id']),'appStoreVersion':rel('appStoreVersions',vid)}}})
if selected['attributes'].get('state')=='READY_FOR_REVIEW':
    selected=api('/v1/reviewSubmissions/'+selected['id'],'PATCH',{'data':{'type':'reviewSubmissions','id':selected['id'],'attributes':{'submitted':True}}})['data']
confirmed=api('/v1/reviewSubmissions/'+selected['id'])['data']
release=api('/v1/appStoreVersions/'+vid)['data']
print('FINAL_REVIEW',confirmed['id'],confirmed['attributes'].get('state'))
print('FINAL_RELEASE',vid,release['attributes'].get('appStoreState'),release['attributes'].get('releaseType'))
