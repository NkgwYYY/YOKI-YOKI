"""Preserve a disposable simulator screen without blocking the next device."""
from pathlib import Path
import subprocess
import sys
import re

family = sys.argv[1]
if family not in ('iPhone', 'iPad'):
    raise SystemExit('Unexpected simulator family')
evidence = Path('review-results') / family
device_file = evidence / 'device-id.txt'
if not device_file.exists():
    raise SystemExit(0)
udid = device_file.read_text().strip()

for name, args in (
    ('screenshot', ['xcrun', 'simctl', 'io', udid, 'screenshot', str(evidence / 'final-screen.png')]),
    ('runtime', ['xcrun', 'simctl', 'spawn', udid, 'log', 'show', '--style', 'compact', '--last', '12m', '--info', '--debug', '--predicate', 'process == "YOKIYOKI" AND NOT subsystem BEGINSWITH "com.apple.Accessibility" AND NOT eventMessage CONTAINS[c] "AXXC" AND NOT eventMessage CONTAINS[c] "(no error)" AND (eventMessage CONTAINS[c] "Clerk" OR eventMessage CONTAINS[c] "error" OR eventMessage CONTAINS[c] "exception" OR eventMessage CONTAINS[c] "yoki-auth")']),
    ('shutdown', ['xcrun', 'simctl', 'shutdown', udid]),
):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=30)
        output = result.stdout + result.stderr
        code = result.returncode
    except subprocess.TimeoutExpired as error:
        output = str(error)
        code = 124
    # These simulators contain only synthetic test data. Still redact any token
    # emitted by a dependency before retaining diagnostic output as CI evidence.
    output = re.sub(r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*', '[redacted-token]', output)
    output = re.sub(r'(?i)(bearer\s+)[^\s"\']+', r'\1[redacted]', output)
    (evidence / ('cleanup-' + name + '.log')).write_text(output[-262144:])
    print('Simulator cleanup:', name, 'exit', code, 'diagnostic saved' if name == 'runtime' else output[-2000:], flush=True)

# Cleanup was already best-effort. The separate final gate still requires the
# actual iPhone and iPad application-test outcomes to succeed.
