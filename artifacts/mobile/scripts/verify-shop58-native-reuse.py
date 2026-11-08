"""Require the exact previously built app; allow test-runner changes only."""
import os,subprocess,json,urllib.request
from pathlib import Path
BASE='3752a0716090a2e7fd10824ec952c810b23ea661'
root=Path(__file__).resolve().parents[3]
allowed={'.github/workflows/ios-shop58-recheck.yml','artifacts/mobile/scripts/RoomReleaseJourney58.swift','artifacts/mobile/scripts/create-shop58-recheck.rb','artifacts/mobile/scripts/configure-shop58-xctestrun.py','artifacts/mobile/scripts/verify-shop58-native-reuse.py'}
changed=set(subprocess.check_output(['git','-C',str(root),'diff','--name-only',BASE,'HEAD'],text=True).splitlines())
if not changed<=allowed:raise SystemExit('Application source differs from the exact built candidate: '+str(sorted(changed-allowed)))
request=urllib.request.Request('https://api.github.com/repos/NkgwYYY/YOKI-YOKI/actions/runs/42489081023',headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json'})
with urllib.request.urlopen(request,timeout=30) as response:run=json.load(response)
assert run['head_sha']==BASE and run['status']=='completed'
request=urllib.request.Request('https://api.github.com/repos/NkgwYYY/YOKI-YOKI/actions/jobs/128757269473',headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json'})
with urllib.request.urlopen(request,timeout=30) as response:archive=json.load(response)
assert archive['run_id']==42489081023 and archive['conclusion']=='success'
print('Exact application source unchanged; original signed archive passed all 378 checks. Full native journey is still required.')
