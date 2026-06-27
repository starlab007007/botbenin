#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

fail() {
  echo "PLAY RELEASE BLOCKED: $1" >&2
  exit 1
}

command -v flutter >/dev/null 2>&1 || fail "Flutter n'est pas disponible dans le PATH."
command -v python3 >/dev/null 2>&1 || fail "Python 3 est requis."
command -v keytool >/dev/null 2>&1 || fail "keytool est requis par le JDK Android."
command -v jarsigner >/dev/null 2>&1 || fail "jarsigner est requis par le JDK Android."

test -f pubspec.yaml || fail "Exécutez ce script dans flutter_waouh_app."
test -f android/key.properties || fail "Créez android/key.properties à partir de android/key.properties.example."
test -f android/app/build.gradle || fail "Configuration Android introuvable."
test -f lib/live/live_app.dart || fail "Entrée Flutter live introuvable."

grep -q '^name: waouh_app_native$' pubspec.yaml || fail "Mauvais projet Flutter."
grep -q 'applicationId = "bj.bot.waouhapp"' android/app/build.gradle || fail "Identifiant Android inattendu."
grep -q 'targetSdk = 36' android/app/build.gradle || fail "targetSdk 36 est requis."
grep -q 'signingConfigs.getByName("release")' android/app/build.gradle || fail "La signature Play release n'est pas configurée."

if grep -R -nE 'Flutter Demo Home Page|_incrementCounter|You have pushed the button' lib >/dev/null 2>&1; then
  fail "Le template Flutter Demo est encore présent dans lib/."
fi

# Compatible with Flutter versions that require CardThemeData. This is an
# idempotent source migration and remains visible in Git after the build.
python3 - <<'PY'
from pathlib import Path
path = Path('lib/main.dart')
source = path.read_text(encoding='utf-8')
updated = source.replace('cardTheme: CardTheme(', 'cardTheme: CardThemeData(', 1)
if updated != source:
    path.write_text(updated, encoding='utf-8')
    print('Applied source migration: CardThemeData.')
PY

flutter clean
flutter pub get
flutter analyze --no-fatal-warnings --no-fatal-infos
flutter test
flutter build appbundle --target lib/live/live_app.dart --release

AAB="build/app/outputs/bundle/release/app-release.aab"
test -f "$AAB" || fail "Le bundle AAB est introuvable après compilation."

jarsigner -verify -strict -certs "$AAB" >/dev/null || fail "La vérification de signature AAB a échoué."
if keytool -printcert -jarfile "$AAB" 2>/dev/null | grep -qi 'Android Debug'; then
  fail "Le bundle est signé avec un certificat Android Debug."
fi

VERSION="$(grep '^version:' pubspec.yaml | awk '{print $2}' | tr '+' '_')"
mkdir -p release-bundles
OUT="release-bundles/WaouhApp-${VERSION}-play.aab"
cp "$AAB" "$OUT"

printf '\nAAB PLAY PRÊT POUR TEST INTERNE : %s\n' "$APP_DIR/$OUT"
ls -lh "$OUT"
