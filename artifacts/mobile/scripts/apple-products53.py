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
key_dir = Path(os.environ['RUNNER_TEMP']) / 'yoki-products53' / 'private_keys'
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

# Register only the seven explicitly scoped, non-consumable room products.
# Existing product prices are inspected, never overwritten by this script.
catalog=json.loads((Path(__file__).parent/'room-products53.json').read_text())
existing=items('/v1/apps/'+APP+'/inAppPurchasesV2?limit=200')
for product in catalog:
    sku=product['productId']
    if not sku.startswith('yokiyoki.room.') or product['yen'] not in (200,500):raise SystemExit('Unexpected product')
    matches=[p for p in existing if p['attributes']['productId']==sku]
    if len(matches)>1:raise SystemExit('Duplicate Apple product identity')
    if matches:
        item=matches[0]
        if item['attributes']['inAppPurchaseType']!='NON_CONSUMABLE':raise SystemExit('Existing product has wrong type')
    else:
        item=api('/v2/inAppPurchases','POST',{'data':{'type':'inAppPurchases','attributes':{'name':product['name'],'productId':sku,'inAppPurchaseType':'NON_CONSUMABLE'},'relationships':{'app':rel('apps',APP)}}})['data']
    ident=item['id']
    print('ROOM_PRODUCT',sku,ident,item['attributes'].get('state'),flush=True)
    review_note='YOKI YOKI 1.2.6 (53). Home > Closet > Matching furniture / Room sets. One-time purchase; optional points exchange is separate. Restore Purchases is on the same screen. '+product['reviewNote']
    if item['attributes'].get('reviewNote')!=review_note:
        api('/v2/inAppPurchases/'+ident,'PATCH',{'data':{'type':'inAppPurchases','id':ident,'attributes':{'reviewNote':review_note}}})
    # Use the current version-based localization API; do not mutate an approved version.
    versions=items('/v2/inAppPurchases/'+ident+'/versions?limit=50')
    draft=next((v for v in versions if v['attributes'].get('state')=='PREPARE_FOR_SUBMISSION'),None)
    if not draft and not versions:
        draft=api('/v1/inAppPurchaseVersions','POST',{'data':{'type':'inAppPurchaseVersions','relationships':{'inAppPurchase':rel('inAppPurchases',ident)}}})['data']
    if draft:
        localizations=items('/v1/inAppPurchaseVersions/'+draft['id']+'/localizations?limit=50')
        for locale,name,description in [('ja',product['name'],product['description']),('en-US',product['englishName'],product['englishDescription'])]:
            found=next((l for l in localizations if l['attributes']['locale']==locale),None)
            if not found:api('/v2/inAppPurchaseLocalizations','POST',{'data':{'type':'inAppPurchaseLocalizations','attributes':{'locale':locale,'name':name,'description':description},'relationships':{'version':rel('inAppPurchaseVersions',draft['id'])}}})
    schedule=api('/v2/inAppPurchases/'+ident+'/iapPriceSchedule',optional=True).get('data')
    if not schedule:
        points=items('/v2/inAppPurchases/'+ident+'/pricePoints?filter[territory]=JPN&limit=8000')
        prices=[p for p in points if float(p['attributes']['customerPrice'])==product['yen']]
        if len(prices)!=1:raise SystemExit('Exact Japanese price point is unavailable or ambiguous')
        temp='${room-price}'
        api('/v1/inAppPurchasePriceSchedules','POST',{'data':{'type':'inAppPurchasePriceSchedules','relationships':{'inAppPurchase':rel('inAppPurchases',ident),'baseTerritory':rel('territories','JPN'),'manualPrices':{'data':[{'type':'inAppPurchasePrices','id':temp}]}}},'included':[{'type':'inAppPurchasePrices','id':temp,'attributes':{'startDate':None},'relationships':{'inAppPurchaseV2':rel('inAppPurchases',ident),'inAppPurchasePricePoint':rel('inAppPurchasePricePoints',prices[0]['id'])}}]})
    availability=api('/v2/inAppPurchases/'+ident+'/inAppPurchaseAvailability',optional=True).get('data')
    if not availability:
        # Match the existing panda costume's sales territories, without broadening them.
        panda=next((p for p in existing if p['attributes']['productId']=='yokiyoki.costume.panda'),None)
        if not panda:raise SystemExit('Existing costume availability reference missing')
        base=api('/v2/inAppPurchases/'+panda['id']+'/inAppPurchaseAvailability')['data']
        territories=items('/v1/inAppPurchaseAvailabilities/'+base['id']+'/availableTerritories?limit=200')
        if not territories:raise SystemExit('Existing sales territories unavailable')
        api('/v1/inAppPurchaseAvailabilities','POST',{'data':{'type':'inAppPurchaseAvailabilities','attributes':{'availableInNewTerritories':False},'relationships':{'inAppPurchase':rel('inAppPurchases',ident),'availableTerritories':{'data':[{'type':'territories','id':t['id']} for t in territories]}}}})
    # Verify the actual configured JPY price instead of assuming a successful POST.
    verification=api('/v1/inAppPurchasePriceSchedules/'+ident+'/manualPrices?filter[territory]=JPN&include=inAppPurchasePricePoint&limit=200')
    live=[p for p in verification.get('included',[]) if p['type']=='inAppPurchasePricePoints']
    if not live or any(float(p['attributes']['customerPrice'])!=product['yen'] for p in live):raise SystemExit('Configured Japanese price does not match the app')
    print('ROOM_PRICE_VERIFIED',sku,product['yen'],'JPY',flush=True)
print('ROOM_PRODUCTS_PREPARED: review screenshots and submission remain separate steps.')
