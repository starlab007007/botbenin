#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() { echo "TEST APK BLOCKED: $1" >&2; exit 1; }

command -v flutter >/dev/null || fail "Flutter absent du PATH."
command -v python3 >/dev/null || fail "Python 3 absent."
command -v unzip >/dev/null || fail "unzip absent."

test -f lib/live/live_app.dart || fail "Cible Flutter live absente."
grep -q '^name: waouh_app_native$' pubspec.yaml || fail "Mauvais projet Flutter."
grep -q 'applicationId = "bj.bot.waouhapp"' android/app/build.gradle || fail "Identifiant Android attendu : bj.bot.waouhapp."

if [ -n "${ANDROID_HOME:-}" ] && [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  fail "Installez platform android-36 et build-tools 36.0.0 avec sdkmanager."
fi

if grep -R -nE 'Flutter Demo Home Page|_incrementCounter|You have pushed the button' lib >/dev/null 2>&1; then
  fail "Le template Flutter Demo est encore présent dans lib/."
fi

# Flutter requires every installable APK to carry a signature. This test build
# uses Flutter/Android's automatic DEBUG certificate only. It never reads
# android/key.properties and never produces a release-signed artifact.
TMP="$(mktemp -d)"
FILES=(
  lib/main.dart
  lib/live/live_chat_screens.dart
  lib/live/live_match_chat_v2.dart
)
for file in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$file")"
  cp "$file" "$TMP/$file"
done
cleanup() {
  for file in "${FILES[@]}"; do
    cp "$TMP/$file" "$file" 2>/dev/null || true
  done
  rm -rf "$TMP"
}
trap cleanup EXIT

python3 - <<'PY'
from pathlib import Path

replacements = {
    'lib/main.dart': [
        ('cardTheme: CardTheme(', 'cardTheme: CardThemeData('),
    ],
    'lib/live/live_chat_screens.dart': [
        ('.inSeconds.abs < 120', '.inSeconds.abs() < 120'),
        ('Icons.edit_square_rounded', 'Icons.edit_outlined'),
    ],
    'lib/live/live_match_chat_v2.dart': [
        ('.inSeconds.abs < 120', '.inSeconds.abs() < 120'),
    ],
}

for name, edits in replacements.items():
    path = Path(name)
    source = path.read_text(encoding='utf-8')
    updated = source
    for old, new in edits:
        updated = updated.replace(old, new)
    path.write_text(updated, encoding='utf-8')
PY

flutter clean
flutter pub get
flutter analyze --no-fatal-warnings --no-fatal-infos
flutter test
flutter build apk --debug --target lib/live/live_app.dart --split-per-abi

APK="build/app/outputs/flutter-apk/app-arm64-v8a-debug.apk"
test -f "$APK" || fail "APK debug ARM64 absent."
unzip -l "$APK" | grep -q 'lib/arm64-v8a/libflutter.so' || fail "Bibliothèque ARM64 Flutter absente de l'APK."

mkdir -p test-apks
cp "$APK" test-apks/WaouhApp-arm64-test-debug.apk

printf '\nAPK DE TEST CRÉÉ : %s\n' "$PWD/test-apks/WaouhApp-arm64-test-debug.apk"
printf '%s\n' 'Signature : certificat debug automatique Android (aucune clé release utilisée).'
ls -lh test-apks/WaouhApp-arm64-test-debug.apk
