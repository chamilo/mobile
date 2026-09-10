#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f package.json || ! -f capacitor.config.ts ]]; then
  echo "ERROR: Run this script from the Chamilo Mobile repository." >&2
  exit 1
fi

if ! grep -q '"@capacitor/ios": "8.4.1"' package.json; then
  echo "ERROR: @capacitor/ios 8.4.1 is not declared in package.json." >&2
  exit 1
fi

if ! command -v yarn >/dev/null 2>&1; then
  echo "ERROR: Yarn is not available. Enable Corepack/Yarn 4.17.1 first." >&2
  exit 1
fi

printf '%s\n' "===== iOS preparation ====="
printf 'OS: %s\n' "$(uname -s)"
printf 'Node: %s\n' "$(node --version)"
printf 'Yarn: %s\n' "$(yarn --version)"

# package.json changes intentionally require one non-immutable install so Yarn can
# add @capacitor/ios to yarn.lock. The resulting lockfile must be reviewed and committed.
yarn install

yarn build

if [[ -d ios ]]; then
  echo "iOS platform already exists; synchronizing it."
  yarn ios:sync
else
  echo "Creating the Capacitor iOS SPM project."
  yarn ios:add
fi

required=(
  "ios/App/App.xcodeproj/project.pbxproj"
  "ios/App/CapApp-SPM/Package.swift"
)

for path in "${required[@]}"; do
  if [[ ! -f "$path" ]]; then
    echo "ERROR: Expected iOS project file was not generated: $path" >&2
    exit 1
  fi
done

echo
echo "iOS platform preparation: PASS"
echo "Generated native project: ios/"
echo "Xcode build, signing, simulator/device tests and App Store delivery remain pending on macOS."
echo "Chamilo iOS secure storage, biometrics, push, native document handling and native SCORM are not enabled by this preparation batch."
