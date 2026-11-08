"""Allow reuse of build 53 native QA only for its one presentation-only patch."""
import subprocess
from pathlib import Path

base = 'fa007fc962856cbb4a06c1f4ff35f37696f6dc32'
root = Path(__file__).resolve().parents[3]
def git(*args):
    return subprocess.check_output(['git', '-C', str(root), *args], text=True)

allowed = {
    '.github/workflows/ios-room-sets53.yml',
    '.github/workflows/ios-room-sets53-reverify.yml',
    'artifacts/mobile/components/CostumeShop.tsx',
    'artifacts/mobile/scripts/RoomReleaseJourney53.swift',
    'artifacts/mobile/scripts/create-room53-xctest.rb',
    'artifacts/mobile/scripts/prepare-ios-review.py',
    'artifacts/mobile/scripts/verify-room53-native-reuse.py',
}
changed = set(git('diff', '--name-only', base, 'HEAD').splitlines())
if not changed <= allowed:
    raise SystemExit('Native QA reuse requires a new build for other source changes: ' + ', '.join(sorted(changed-allowed)))
path = 'artifacts/mobile/components/CostumeShop.tsx'
before = git('show', base+':'+path)
after = git('show', 'HEAD:'+path)
old = 'style={s.pointsButton}><Text style={s.pointsText}>おそろい家具とあわせて見る'
new = 'style={[s.button,s.pointsButton,{borderRadius:24}]}><Text style={s.pointsText}>おそろい家具とあわせて見る'
if old not in before or before.replace(old, new) != after:
    raise SystemExit('The production diff is not the reviewed button-shape adjustment')
print('Native purchase, persistence, room scenes and product UI are byte-identical; only the closet shortcut button shape changed.')
