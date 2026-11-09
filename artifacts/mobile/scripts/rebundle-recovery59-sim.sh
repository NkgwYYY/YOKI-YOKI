#!/usr/bin/env bash
# Reuse only unchanged native code; rebuild all candidate JS and assets using
# React Native's normal Release phase and the Pod-installed Hermes compiler.
set -euo pipefail
export PROJECT_ROOT="$PWD"
export NODE_BINARY="$(command -v node)"
export ENTRY_FILE="$(node --print "require.resolve('expo-router/entry')")"
export CLI_PATH="$(node --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
export BUNDLE_COMMAND=export:embed
export CONFIGURATION=Release PLATFORM_NAME=iphonesimulator USE_HERMES=true
export PODS_ROOT="$PWD/ios/Pods"
export CONFIGURATION_BUILD_DIR="$RUNNER_TEMP/recovery59-sim"
export UNLOCALIZED_RESOURCES_FOLDER_PATH=YOKIYOKI.app
test -x "$PODS_ROOT/hermes-engine/destroot/bin/hermesc"
native_file="$YOKI_LOCAL_SIM_APP/YOKIYOKI"
before="$(shasum -a 256 "$native_file")"
rn_root="$(node --print "require('path').dirname(require.resolve('react-native/package.json'))")"
bash "$rn_root/scripts/react-native-xcode.sh" > native59-recovery-results/bundle.log 2>&1 || { tail -100 native59-recovery-results/bundle.log; exit 1; }
test "$before" = "$(shasum -a 256 "$native_file")"
test -s "$YOKI_LOCAL_SIM_APP/main.jsbundle"
shasum -a 256 "$YOKI_LOCAL_SIM_APP/main.jsbundle" > native59-recovery-results/bundle-sha256.txt
codesign --force --sign - --preserve-metadata=identifier,entitlements --timestamp=none "$YOKI_LOCAL_SIM_APP"
codesign --verify --deep --strict "$YOKI_LOCAL_SIM_APP"
printf '%s\n' 'Candidate Hermes bundle rebuilt; native executable unchanged before resource re-signing.'
