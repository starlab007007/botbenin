#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

command -v flutter >/dev/null 2>&1 || fail "Flutter n'est pas disponible dans le PATH."
command -v unzip >/dev/null 2>&1 || fail "La commande unzip est requise."
command -v strings >/dev/null 2>&1 || fail "La commande strings est requise."
command -v python3 >/dev/null 2>&1 || fail "Python 3 est requis."

test -f pubspec.yaml || fail "Ce dossier n'est pas le projet Flutter WaouhApp."
test -f lib/main.dart || fail "lib/main.dart est introuvable."
test -f lib/live/live_app.dart || fail "La cible WAOUH connectee est introuvable. Faites git pull origin codex."
test -f android/app/build.gradle || fail "La configuration Android est introuvable."

grep -q '^name: waouh_app_native$' pubspec.yaml || fail "Mauvais projet Flutter : pubspec.yaml ne correspond pas a WaouhApp."
grep -q 'applicationId = "com.botbj.waouhapp"' android/app/build.gradle || fail "Mauvais identifiant Android : com.botbj.waouhapp est attendu."
grep -q 'compileSdk = 36' android/app/build.gradle || fail "compileSdk 36 est requis. Faites git pull origin codex."

if grep -Eq 'Flutter Demo Home Page|_incrementCounter|You have pushed the button' lib/main.dart; then
  fail "Le template Flutter Demo est detecte. Utilisez le depot botbenin, branche codex."
fi

if [ -n "${ANDROID_HOME:-}" ] && [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  fail "Android SDK 36 est absent. Executez : sdkmanager --sdk_root=\"$ANDROID_HOME\" \"platforms;android-36\" \"build-tools;36.0.0\""
fi

# Flutter recent expects CardThemeData in ThemeData. The legacy screens remain
# available under the live router, so the compatibility patch is idempotent.
python3 - <<'PY'
from pathlib import Path
path = Path('lib/main.dart')
source = path.read_text(encoding='utf-8')
if 'cardTheme: CardTheme(' in source:
    path.write_text(source.replace('cardTheme: CardTheme(', 'cardTheme: CardThemeData(', 1), encoding='utf-8')
    print('Applied Flutter Material compatibility: CardThemeData.')
PY

flutter clean
flutter pub get
flutter analyze --no-fatal-warnings --no-fatal-infos
flutter test
flutter build apk --target lib/live/live_app.dart --release --split-per-abi

APK="build/app/outputs/flutter-apk/app-arm64-v8a-release.apk"
test -f "$APK" || fail "APK ARM64 introuvable apres compilation."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
unzip -p "$APK" lib/arm64-v8a/libapp.so > "$TMP_DIR/libapp.so"

if strings "$TMP_DIR/libapp.so" | grep -q 'Flutter Demo Home Page'; then
  fail "L'APK produit contient encore Flutter Demo Home Page : ne pas installer ce fichier."
fi

mkdir -p release-apks
cp "$APK" release-apks/WaouhApp-arm64-test.apk

printf '\nAPK WAOUH valide : %s\n' "$APP_DIR/release-apks/WaouhApp-arm64-test.apk"
ls -lh "$APP_DIR/release-apks/WaouhApp-arm64-test.apk"
