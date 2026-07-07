#!/usr/bin/env bash

set -euo pipefail

MOBILE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_ROOT="$MOBILE_ROOT/android"

has_release_signing=0
if [ -n "${SPICE_ANDROID_SIGNING_STORE_FILE:-}" ] && \
   [ -n "${SPICE_ANDROID_SIGNING_STORE_PASSWORD:-}" ] && \
   [ -n "${SPICE_ANDROID_SIGNING_KEY_ALIAS:-}" ] && \
   [ -n "${SPICE_ANDROID_SIGNING_KEY_PASSWORD:-}" ]; then
  has_release_signing=1
fi

GRADLE_ARGS=(lintRelease testReleaseUnitTest assembleRelease --stacktrace)
if [ "$has_release_signing" -eq 0 ]; then
  GRADLE_ARGS=("-PspiceAndroidDebugSignRelease=true" "${GRADLE_ARGS[@]}")
fi

pushd "$ANDROID_ROOT"
./gradlew "${GRADLE_ARGS[@]}"

if [ -f "$ANDROID_ROOT/app/build/outputs/apk/release/app-release.apk" ]; then
  echo "Generated signed release APK at app/build/outputs/apk/release/app-release.apk"
else
  echo "Signed release APK not found. Ensure signing key env vars are set or Gradle debug fallback succeeded."
  find app/build/outputs -maxdepth 4 -type f -name '*.apk' -print
  exit 1
fi
popd
