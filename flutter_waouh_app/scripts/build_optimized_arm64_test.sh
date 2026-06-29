#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

fail() { echo "OPTIMIZED TEST APK BLOCKED: $1" >&2; exit 1; }

command -v flutter >/dev/null || fail "Flutter absent du PATH."
command -v python3 >/dev/null || fail "Python 3 absent."
command -v unzip >/dev/null || fail "unzip absent."

test -f lib/live/live_app.dart || fail "Cible Flutter live absente."
grep -q '^name: waouh_app_native$' pubspec.yaml || fail "Mauvais projet Flutter."
grep -q 'applicationId = "bj.bot.waouhapp"' android/app/build.gradle || fail "Identifiant Android attendu : bj.bot.waouhapp."

if [ -n "${ANDROID_HOME:-}" ] && [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  fail "Installez platform android-36 et build-tools 36.0.0 avec sdkmanager."
fi
if [ -n "${ANDROID_HOME:-}" ] && [ ! -d "$ANDROID_HOME/ndk/28.2.13676358" ]; then
  fail "Installez le NDK requis : sdkmanager --sdk_root=\"$ANDROID_HOME\" \"ndk;28.2.13676358\""
fi

# This produces an optimized RELEASE-mode binary but signs it only with the
# automatic Android DEBUG certificate. It does not read key.properties and is
# not acceptable for Google Play. It is intended only for compact device tests.
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
    for old, new in edits:
        source = source.replace(old, new)
    path.write_text(source, encoding='utf-8')
PY

flutter clean
flutter pub get
flutter analyze --no-fatal-warnings --no-fatal-infos
flutter test

WAOUH_TEST_RELEASE=1 flutter build apk \
  --release \
  --target lib/live/live_app.dart \
  --target-platform android-arm64 \
  --split-per-abi \
  --obfuscate \
  --split-debug-info=build/symbols

APK="build/app/outputs/flutter-apk/app-arm64-v8a-release.apk"
test -f "$APK" || fail "APK ARM64 optimisée absente."
unzip -l "$APK" | grep -q 'lib/arm64-v8a/libflutter.so' || fail "Bibliothèque ARM64 Flutter absente de l'APK."
if unzip -l "$APK" | grep -qE 'lib/(armeabi-v7a|x86_64)/'; then
  fail "L'APK contient une architecture inutile."
fi

mkdir -p test-apks
OUT="test-apks/WaouhApp-arm64-test-optimized.apk"
cp "$APK" "$OUT"
shasum -a 256 "$OUT" > "$OUT.sha256"

python3 - "$OUT" <<'PY'
import os, sys, zipfile
path = sys.argv[1]
with zipfile.ZipFile(path) as archive:
    entries = sorted(archive.infolist(), key=lambda item: item.compress_size, reverse=True)
    print("\nAnalyse de taille — 10 éléments compressés les plus lourds :")
    for item in entries[:10]:
        print(f"{item.compress_size / 1024 / 1024:6.1f} Mo  {item.filename}")
    raw = sum(item.file_size for item in entries)
    packed = sum(item.compress_size for item in entries)
print(f"\nAPK : {os.path.getsize(path) / 1024 / 1024:.1f} Mo")
print(f"Contenu non compressé : {raw / 1024 / 1024:.1f} Mo")
print(f"Contenu compressé ZIP : {packed / 1024 / 1024:.1f} Mo")
PY

printf '\nAPK OPTIMISÉE DE TEST CRÉÉE : %s\n' "$PWD/$OUT"
printf '%s\n' 'Signature : certificat Debug automatique Android. Aucune clé privée personnelle utilisée.'
printf '%s\n' 'Usage : test interne uniquement ; ne pas importer dans Google Play.'
ls -lh "$OUT" "$OUT.sha256"
