"""Preserve a disposable simulator screen without blocking the next device."""
from pathlib import Path
import subprocess
import sys

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
    ('shutdown', ['xcrun', 'simctl', 'shutdown', udid]),
):
    try:
        result = subprocess.run(args, capture_output=True, text=True, timeout=30)
        output = result.stdout + result.stderr
        code = result.returncode
    except subprocess.TimeoutExpired as error:
        output = str(error)
        code = 124
    (evidence / ('cleanup-' + name + '.log')).write_text(output)
    print('Simulator cleanup:', name, 'exit', code, output[-2000:], flush=True)

# Cleanup was already best-effort. The separate final gate still requires the
# actual iPhone and iPad application-test outcomes to succeed.
