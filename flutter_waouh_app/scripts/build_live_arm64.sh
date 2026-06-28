#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() { echo "ERROR: $1" >&2; exit 1; }

command -v flutter >/dev/null || fail "Flutter absent du PATH."
command -v python3 >/dev/null || fail "Python 3 absent."
command -v unzip >/dev/null || fail "unzip absent."
command -v strings >/dev/null || fail "strings absent."

test -f lib/live/live_app.dart || fail "Cible Flutter connectee absente."
grep -q '^name: waouh_app_native$' pubspec.yaml || fail "Mauvais projet Flutter."
grep -q 'applicationId = "bj.bot.waouhapp"' android/app/build.gradle || fail "Identifiant Android attendu : bj.bot.waouhapp."
grep -q 'compileSdk = 36' android/app/build.gradle || fail "Android SDK 36 requis."

if [ -n "${ANDROID_HOME:-}" ] && [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  fail "Installez platform android-36 et build-tools 36.0.0 avec sdkmanager."
fi

TMP="$(mktemp -d)"
cp lib/main.dart "$TMP/main.dart"
cleanup() { cp "$TMP/main.dart" lib/main.dart 2>/dev/null || true; rm -rf "$TMP"; }
trap cleanup EXIT

python3 - <<'PY'
from pathlib import Path
p = Path('lib/main.dart')
s = p.read_text(encoding='utf-8')
p.write_text(s.replace('cardTheme: CardTheme(', 'cardTheme: CardThemeData(', 1), encoding='utf-8')
PY

flutter clean
flutter pub get
flutter analyze --no-fatal-warnings --no-fatal-infos
flutter test
flutter build apk --target lib/live/live_app.dart --release --split-per-abi

APK=build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
test -f "$APK" || fail "APK ARM64 absent."
unzip -p "$APK" lib/arm64-v8a/libapp.so > "$TMP/libapp.so"
strings "$TMP/libapp.so" | grep -q 'Flutter Demo Home Page' && fail "APK Flutter Demo detecte."

mkdir -p release-apks
cp "$APK" release-apks/WaouhApp-arm64-live.apk
ls -lh release-apks/WaouhApp-arm64-live.apk
