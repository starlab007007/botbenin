#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() { echo "PRODUCTION UI APK BLOCKED: $1" >&2; exit 1; }

command -v flutter >/dev/null || fail "Flutter absent du PATH."
command -v python3 >/dev/null || fail "Python 3 absent du PATH."
command -v unzip >/dev/null || fail "unzip absent du PATH."

test -f lib/live/live_app_production.dart || fail "Entrypoint production UI absent."
test -f scripts/repair_compile_errors.py || fail "Script de réparation Flutter absent."
test -f scripts/apply_final_ui_options.py || fail "Script final UI absent."
test -f scripts/apply_radar_backend_workspace.py || fail "Script Radar backend absent."
test -f scripts/apply_radar_filter_radius.py || fail "Script de portée Radar absent."
grep -q '^name: waouh_app_native$' pubspec.yaml || fail "Mauvais projet Flutter."

python3 scripts/repair_compile_errors.py
python3 scripts/apply_final_ui_options.py
python3 scripts/apply_radar_filter_radius.py
python3 scripts/apply_radar_backend_workspace.py

flutter clean
flutter pub get
flutter analyze --no-fatal-warnings --no-fatal-infos
flutter test

WAOUH_TEST_RELEASE=1 flutter build apk \
  --release \
  --target lib/live/live_app_production.dart \
  --target-platform android-arm64 \
  --split-per-abi \
  --obfuscate \
  --split-debug-info=build/symbols

APK="build/app/outputs/flutter-apk/app-arm64-v8a-release.apk"
test -f "$APK" || fail "APK ARM64 production UI absente."
unzip -l "$APK" | grep -q 'lib/arm64-v8a/libflutter.so' || fail "Bibliothèque ARM64 Flutter absente de l’APK."

mkdir -p test-apks
OUT="test-apks/WaouhApp-arm64-production-ui-test.apk"
cp "$APK" "$OUT"
shasum -a 256 "$OUT" > "$OUT.sha256"

printf '\nAPK PRODUCTION UI DE TEST : %s\n' "$PWD/$OUT"
printf '%s\n' 'Signature : certificat Debug Android automatique. Ne pas téléverser sur Google Play.'
ls -lh "$OUT" "$OUT.sha256"
