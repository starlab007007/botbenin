#!/usr/bin/env bash
set -euo pipefail
OUT="${OUT_DIR:-emulator-out}"
mkdir -p "$OUT"
# This script is invoked only after the runner installs and boots Android.
SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/usr/local/lib/android/sdk}}"
if ! "$SDK_ROOT/emulator/emulator" -version > "$OUT/emulator-runtime.txt" 2>&1; then
  cat "$OUT/emulator-runtime.txt"
  exit 1
fi
if ! "$SDK_ROOT/emulator/emulator" -accel-check >> "$OUT/emulator-runtime.txt" 2>&1; then
  cat "$OUT/emulator-runtime.txt"
  exit 1
fi
cat "$OUT/emulator-runtime.txt"
if [ "$(adb get-state)" != device ] || [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" != 1 ]; then
  echo "Android device unavailable or not fully booted" >&2
  exit 1
fi
