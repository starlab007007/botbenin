#!/usr/bin/env bash
# Lancé dans l'émulateur par la CI : enregistre la vidéo pendant le parcours.
set -u
APK="$1"
OUT="${OUT_DIR:-emulator-out}"
mkdir -p "$OUT"
adb shell getprop ro.build.version.release > "$OUT/android-version.txt"
adb shell getprop ro.product.cpu.abilist >> "$OUT/android-version.txt"
# Vidéo par segments de 3 minutes (limite d'Android).
( for i in 1 2 3 4; do adb shell screenrecord --bit-rate 2000000 --time-limit 175 "/sdcard/run_$i.mp4" || break; done ) &
REC=$!
python3 scripts/android-emulator-smoke.py "$APK"
STATUS=$?
adb shell pkill -INT screenrecord || true
sleep 4
kill "$REC" 2>/dev/null || true
for i in 1 2 3 4; do adb pull "/sdcard/run_$i.mp4" "$OUT/video_$i.mp4" 2>/dev/null || true; done
exit $STATUS
