#!/usr/bin/env bash
# Lancé dans l'émulateur par la CI : enregistre la vidéo pendant le parcours.
set -u
APK="$1"
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
adb shell pm disable-user --user 0 com.google.android.apps.nexuslauncher >/dev/null 2>&1 || true
adb shell getprop ro.build.version.release > "$OUT/android-version.txt"
adb shell getprop ro.product.cpu.abilist >> "$OUT/android-version.txt"
# Capture vidéo facultative pour éviter de concurrencer uiautomator sur le runner.
if [ "${CAPTURE_SCREEN_VIDEO:-1}" = 1 ]; then
  ( for i in 1 2 3 4; do adb shell screenrecord --bit-rate 2000000 --time-limit 175 "/sdcard/run_$i.mp4" || break; done ) &
  REC=$!
fi
python3 scripts/android-emulator-smoke.py "$APK"
STATUS=$?
if [ -n "${REC:-}" ]; then
  adb shell pkill -INT screenrecord || true
  sleep 4
  kill "$REC" 2>/dev/null || true
  for i in 1 2 3 4; do adb pull "/sdcard/run_$i.mp4" "$OUT/video_$i.mp4" 2>/dev/null || true; done
fi
exit $STATUS
