#!/usr/bin/env bash
# Distribution signing executes only on the ephemeral GitHub macOS runner.
set -euo pipefail
umask 077
: "${YOKI_DISTRIBUTION_P12_BASE64:?Missing distribution certificate secret}"
: "${YOKI_DISTRIBUTION_P12_PASSWORD:?Missing certificate password secret}"
: "${YOKI_PROVISIONING_PROFILE_BASE64:?Missing provisioning profile secret}"
YOKI_SIGNING_DIR="$RUNNER_TEMP/yoki-signing"
YOKI_KEYCHAIN_PATH="$YOKI_SIGNING_DIR/release.keychain-db"
YOKI_PROFILE_PATH=''
mkdir -p "$YOKI_SIGNING_DIR" release45-results
cleanup() {
  security delete-keychain "$YOKI_KEYCHAIN_PATH" >/dev/null 2>&1 || true
  if [[ -n "$YOKI_PROFILE_PATH" ]]; then rm -f "$YOKI_PROFILE_PATH"; fi
  rm -rf "$YOKI_SIGNING_DIR"
}
trap cleanup EXIT
printf '%s' "$YOKI_DISTRIBUTION_P12_BASE64" | base64 --decode > "$YOKI_SIGNING_DIR/certificate.p12"
printf '%s' "$YOKI_PROVISIONING_PROFILE_BASE64" | base64 --decode > "$YOKI_SIGNING_DIR/profile.mobileprovision"
security cms -D -i "$YOKI_SIGNING_DIR/profile.mobileprovision" > "$YOKI_SIGNING_DIR/profile.plist"
export YOKI_SIGNING_DIR
python3 - <<'PY'
import os,plistlib,datetime,pathlib
p=plistlib.loads((pathlib.Path(os.environ['YOKI_SIGNING_DIR'])/'profile.plist').read_bytes())
assert p['TeamIdentifier']==['9C784EZR52']
assert p['Entitlements']['application-identifier']=='9C784EZR52.app.replit.yokiyoki--'
assert p['Entitlements'].get('get-task-allow') is False
assert p['ExpirationDate']>datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
assert 'ProvisionedDevices' not in p
PY
YOKI_PROFILE_UUID=$(/usr/libexec/PlistBuddy -c 'Print UUID' "$YOKI_SIGNING_DIR/profile.plist")
export YOKI_PROFILE_UUID
YOKI_PROFILE_PATH="$HOME/Library/MobileDevice/Provisioning Profiles/$YOKI_PROFILE_UUID.mobileprovision"
mkdir -p "$(dirname "$YOKI_PROFILE_PATH")"
cp "$YOKI_SIGNING_DIR/profile.mobileprovision" "$YOKI_PROFILE_PATH"
YOKI_TEMP_KEYCHAIN_PASSWORD=$(openssl rand -hex 24)
security create-keychain -p "$YOKI_TEMP_KEYCHAIN_PASSWORD" "$YOKI_KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$YOKI_KEYCHAIN_PATH"
security unlock-keychain -p "$YOKI_TEMP_KEYCHAIN_PASSWORD" "$YOKI_KEYCHAIN_PATH"
security import "$YOKI_SIGNING_DIR/certificate.p12" -P "$YOKI_DISTRIBUTION_P12_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security -t cert -f pkcs12 -k "$YOKI_KEYCHAIN_PATH" >/dev/null
security set-key-partition-list -S apple-tool:,apple: -k "$YOKI_TEMP_KEYCHAIN_PASSWORD" "$YOKI_KEYCHAIN_PATH" >/dev/null
security list-keychains -d user -s "$YOKI_KEYCHAIN_PATH" "$HOME/Library/Keychains/login.keychain-db"
unset YOKI_DISTRIBUTION_P12_BASE64 YOKI_DISTRIBUTION_P12_PASSWORD YOKI_PROVISIONING_PROFILE_BASE64
ruby - <<'RUBY'
require 'xcodeproj'
p = Xcodeproj::Project.open('ios/YOKIYOKI.xcodeproj')
t = p.targets.find { |target| target.name == 'YOKIYOKI' }
raise 'Application target missing' unless t
t.build_configurations.each do |c|
  c.build_settings['DEVELOPMENT_TEAM'] = '9C784EZR52'
  c.build_settings['CODE_SIGN_STYLE'] = 'Manual'
  c.build_settings['CODE_SIGN_IDENTITY'] = 'Apple Distribution'
  c.build_settings['PROVISIONING_PROFILE_SPECIFIER'] = ENV.fetch('YOKI_PROFILE_UUID')
end
p.save
RUBY
python3 - <<'PY'
import os,plistlib,pathlib
options={'method':'app-store-connect','teamID':'9C784EZR52','signingStyle':'manual','signingCertificate':'Apple Distribution','provisioningProfiles':{'app.replit.yokiyoki--':os.environ['YOKI_PROFILE_UUID']},'manageAppVersionAndBuildNumber':False,'uploadSymbols':True}
(pathlib.Path(os.environ['YOKI_SIGNING_DIR'])/'ExportOptions.plist').write_bytes(plistlib.dumps(options))
PY
xcodebuild -workspace ios/YOKIYOKI.xcworkspace -scheme YOKIYOKI -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -archivePath "$RUNNER_TEMP/YOKIYOKI.xcarchive" -derivedDataPath "$RUNNER_TEMP/yoki-device-derived" -jobs 2 archive > release45-results/archive.log 2>&1 || { tail -100 release45-results/archive.log; exit 1; }
YOKI_ARCHIVED_APP="$RUNNER_TEMP/YOKIYOKI.xcarchive/Products/Applications/YOKIYOKI.app"
test "$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$YOKI_ARCHIVED_APP/Info.plist")" = 1.2.2
test "$(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$YOKI_ARCHIVED_APP/Info.plist")" = 45
if find "$YOKI_ARCHIVED_APP" -iname '*.storekit' -print -quit | read -r unexpected; then
  echo 'Refusing to export an app containing a StoreKit test configuration.'; exit 1
fi
codesign --verify --deep --strict "$YOKI_ARCHIVED_APP"
codesign -d --entitlements :- "$YOKI_ARCHIVED_APP" > release45-results/entitlements.plist 2>/dev/null
xcodebuild -exportArchive -archivePath "$RUNNER_TEMP/YOKIYOKI.xcarchive" -exportOptionsPlist "$YOKI_SIGNING_DIR/ExportOptions.plist" -exportPath release45-results/export > release45-results/export.log 2>&1 || { tail -100 release45-results/export.log; exit 1; }
test -f release45-results/export/YOKIYOKI.ipa
printf '%s\n' "$GITHUB_SHA" > release45-results/source-commit.txt
shasum -a 256 release45-results/export/*.ipa > release45-results/ipa-sha256.txt
