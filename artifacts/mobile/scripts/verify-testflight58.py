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

# Read-only verification after the separately gated distribution workflow.
APP = '6808389457'
GROUP = '255b6676-7deb-484a-898e-1ac35e613b5e'
def get(path):
    request = urllib.request.Request('https://api.appstoreconnect.apple.com' + path,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise SystemExit('Apple availability read failed: HTTP ' + str(exc.code))

result = get('/v1/builds?filter[app]=' + APP + '&filter[version]=58&include=preReleaseVersion')
builds = result.get('data', [])
if len(builds) != 1:
    raise SystemExit('Expected exactly one uploaded build 58')
build = builds[0]
bid = build['id']
version = get('/v1/builds/' + bid + '/preReleaseVersion')['data']['attributes']['version']
if version != '1.2.6' or build['attributes']['version'] != '58':
    raise SystemExit('Unexpected version/build')
if build['attributes'].get('processingState') != 'VALID' or build['attributes'].get('expired'):
    raise SystemExit('Build is not a valid unexpired TestFlight build')
groups = get('/v1/apps/' + APP + '/betaGroups?limit=200').get('data', [])
if not any(g['id'] == GROUP and g['attributes'].get('isInternalGroup') for g in groups):
    raise SystemExit('Previously verified internal group is unavailable')
assigned = get('/v1/betaGroups/' + GROUP + '/builds?limit=200').get('data', [])
if not any(b['id'] == bid for b in assigned):
    raise SystemExit('Build is not assigned to the existing internal tester group')
for attempt in range(24):
    detail = get('/v1/builds/' + bid + '/buildBetaDetail')['data']['attributes']
    state = detail.get('internalBuildState')
    print('INTERNAL_TESTFLIGHT_STATE', state, flush=True)
    if state == 'IN_BETA_TESTING':
        print('TESTFLIGHT_AVAILABLE', json.dumps({'version': version, 'build': '58',
            'build_id': bid, 'group': 'Team (Expo)', 'internal_state': state}))
        break
    if state not in ('PROCESSING', 'READY_FOR_BETA_TESTING'):
        raise SystemExit('Internal TestFlight is not available: ' + str(state))
    time.sleep(10)
else:
    raise SystemExit('Internal TestFlight availability is not confirmed yet')
