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
key_dir = Path(os.environ['RUNNER_TEMP']) / 'yoki-upload51' / 'private_keys'
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
# Read only the target application's release status; never print auth data.
versions_request = urllib.request.Request('https://api.appstoreconnect.apple.com/v1/apps/6808389457/appStoreVersions?filter[platform]=IOS&limit=10', headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
try:
    with urllib.request.urlopen(versions_request, timeout=60) as response:
        versions_data = json.load(response)
    for version in versions_data.get('data', []):
        attrs = version.get('attributes', {})
        print('Apple release: ' + str(attrs.get('versionString')) + ' / ' + str(attrs.get('appStoreState')))
        if attrs.get('versionString')=='1.2.5' and attrs.get('appStoreState') in ('READY_FOR_SALE','PENDING_APPLE_RELEASE','PENDING_DEVELOPER_RELEASE','PROCESSING_FOR_APP_STORE'):
            raise SystemExit('1.2.5 has already been approved. Prepare the next version before archiving.')
except urllib.error.HTTPError as exc:
    raise SystemExit('Apple release status unavailable (HTTP ' + str(exc.code) + ').')
query = urllib.parse.urlencode({'filter[app]': '6808389457', 'filter[version]': '51', 'include': 'preReleaseVersion', 'limit': '200'})
request = urllib.request.Request('https://api.appstoreconnect.apple.com/v1/builds?' + query,
    headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
try:
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.load(response)
except urllib.error.HTTPError as exc:
    raise SystemExit('Apple preflight failed (HTTP ' + str(exc.code) + '). No IPA was uploaded. Check the key role and all three Secrets.')
except urllib.error.URLError:
    raise SystemExit('Apple could not be reached. No IPA was uploaded.')
versions = {v['id']: v['attributes']['version'] for v in data.get('included', []) if v.get('type') == 'preReleaseVersions'}
found = []
for build in data.get('data', []):
    rel = build.get('relationships', {}).get('preReleaseVersion', {}).get('data') or {}
    version = versions.get(rel.get('id'))
    if version != '1.2.5':
        raise SystemExit('Build number 51 exists with another or unknown version. Stop instead of re-uploading.')
    found.append(build)
if len(found) > 1:
    raise SystemExit('Multiple build 51 records found. Stop for manual inspection.')
if found:
    state = found[0]['attributes'].get('processingState', 'UNKNOWN')
    if state in ('FAILED', 'INVALID'):
        raise SystemExit('Apple already has build 51 with processing state ' + state + '. No duplicate upload attempted.')
    print('Apple already has YOKI YOKI 1.2.5 (51); processing state: ' + state + '. Skipping duplicate upload.')
else:
    print('Apple authentication succeeded. Build 51 not found; safe to attempt the first upload.')
with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
    output.write('already_uploaded=' + ('true' if found else 'false') + '\n')
