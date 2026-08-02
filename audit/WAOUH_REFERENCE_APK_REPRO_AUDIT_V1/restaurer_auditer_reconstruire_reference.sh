#!/usr/bin/env bash
set -Eeuo pipefail
APP="${1:-$HOME/Downloads/WAOUH_BOTS_ROUTE_ONLY_20260726_200613}"
REF="${2:-$HOME/Downloads/WAOUH_CHAT_UI_PREMIUM_V1_20260730_232304.apk}"
BACKUP="${3:-$HOME/Downloads/WAOUH_CHAT_UI_AVANT_PREMIUM_V2_20260731_004636}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
RESTORE="${RESTORE:-0}"
BUILD="${BUILD:-0}"
EXPECTED_APK_SHA='d27b04e2a66d066db645475177005054a51e6dd701a1075173bd1d57d479e2c2'
EXPECTED_CERT_SHA='D8:2A:D6:A8:84:F7:21:9D:1A:1B:62:6D:87:DF:D5:0B:F0:F6:3D:87:10:E0:C6:BF:2C:27:95:7B:AB:82:D5:21'
EXPECTED_FLUTTER='3.44.4'
TARGETS=(
 'lib/live/live_widgets.dart:d5c74b84e4a0b565ddbd4578ca2a30d96dcc5d3049009a325db0166a0d6d2acc'
 'lib/live/live_smart_timeline.dart:89ed4298f9fa72b2108feef6deaf3d8e441aa8a0b6345fe4f27468ede9773b14'
 'lib/live/live_match_chat_v2.dart:730fd19654d8d0271114eb0b7e6c9c3c8d57674bb30ea8226c4ecb4c68786e92'
 'lib/live/live_inbox_production.dart:d75bf4a0eb61bd8e9997313917a21b788a4c7578ab2d102bd9aaea6cc6c345c8'
)
line(){ printf '%*s\n' 76 '' | tr ' ' '='; }
sha(){ shasum -a 256 "$1" | awk '{print $1}'; }
line; echo 'WAOUH — RESTAURATION/AUDIT/REBUILD APK DE REFERENCE'; line
echo "Projet    : $APP"; echo "Référence : $REF"; echo "Sauvegarde: $BACKUP"; echo "RESTORE=$RESTORE BUILD=$BUILD"
[[ -f "$APP/pubspec.yaml" ]] || { echo 'ERREUR: projet Flutter absent'; exit 1; }
[[ -f "$REF" ]] || { echo 'ERREUR: APK de référence absent'; exit 1; }
[[ "$(sha "$REF")" == "$EXPECTED_APK_SHA" ]] || { echo 'ERREUR: mauvais APK de référence'; exit 1; }

if [[ "$RESTORE" == 1 ]]; then
  [[ -d "$BACKUP" ]] || { echo 'ERREUR: sauvegarde source absente'; exit 1; }
  SAFE="$HOME/Downloads/WAOUH_SECURITE_AVANT_RESTAURATION_REFERENCE_$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$SAFE"
  for spec in "${TARGETS[@]}"; do rel="${spec%%:*}"; mkdir -p "$SAFE/$(dirname "$rel")"; cp -p "$APP/$rel" "$SAFE/$rel"; done
  [[ -f "$APP/pubspec.lock" ]] && cp -p "$APP/pubspec.lock" "$SAFE/pubspec.lock"
  for spec in "${TARGETS[@]}"; do rel="${spec%%:*}"; [[ -f "$BACKUP/$rel" ]] || { echo "ERREUR sauvegarde: $rel"; exit 1; }; cp -p "$BACKUP/$rel" "$APP/$rel"; done
  [[ -f "$BACKUP/pubspec.lock" ]] && cp -p "$BACKUP/pubspec.lock" "$APP/pubspec.lock"
  rm -f "$APP/lib/live/live_premium_message_content.dart"
  echo "Restauration ciblée effectuée. Sécurité: $SAFE"
fi

line; echo 'AUDIT SOURCE CONNU'; line
bad=0
for spec in "${TARGETS[@]}"; do rel="${spec%%:*}"; exp="${spec#*:}"; got="$(sha "$APP/$rel")"; if [[ "$got" == "$exp" ]]; then echo "PASS $rel"; else echo "ECHEC $rel attendu=$exp obtenu=$got"; bad=1; fi; done
[[ ! -e "$APP/lib/live/live_premium_message_content.dart" ]] && echo 'PASS composant Premium V2/V3 absent' || { echo 'ECHEC composant Premium présent'; bad=1; }
for marker in 'LivePremiumMessageContent' 'WAOUH recherche et organise les résultats' 'WAOUH analyse et organise les résultats' 'Assistant IA · Premium V3'; do
  if grep -RqsF "$marker" "$APP/lib/live"; then echo "ECHEC marqueur présent: $marker"; bad=1; fi
done

grep -qE '^version:[[:space:]]*1\.3\.0\+4([[:space:]]|$)' "$APP/pubspec.yaml" && echo 'PASS version 1.3.0+4' || { echo 'ECHEC version pubspec différente'; bad=1; }
grep -q 'distributionUrl=.*gradle-8\.13-' "$APP/android/gradle/wrapper/gradle-wrapper.properties" && echo 'PASS Gradle 8.13' || { echo 'ECHEC Gradle différent'; bad=1; }
grep -Eq 'com\.android\.tools\.build:gradle[:"'"']?8\.11\.1|id[[:space:]]+["'"']com\.android\.application["'"'][[:space:]]+version[[:space:]]+["'"']8\.11\.1' "$APP/android/settings.gradle" "$APP/android/build.gradle" 2>/dev/null && echo 'PASS AGP 8.11.1' || echo 'INFO: AGP 8.11.1 non confirmé par grep'
grep -Rqs 'bj.bot.waouhapp' "$APP/android/app" && echo 'PASS package bj.bot.waouhapp' || { echo 'ECHEC package Android différent'; bad=1; }

fv="$(flutter --version 2>/dev/null | head -1 | awk '{print $2}')"
[[ "$fv" == "$EXPECTED_FLUTTER" ]] && echo "PASS Flutter $fv" || { echo "ECHEC Flutter attendu=$EXPECTED_FLUTTER obtenu=${fv:-inconnu}"; bad=1; }
if [[ -f "$HOME/.android/debug.keystore" ]]; then
  cert="$(keytool -list -v -alias androiddebugkey -keystore "$HOME/.android/debug.keystore" -storepass android -keypass android 2>/dev/null | awk -F': ' '/SHA256:/{print $2; exit}')"
  [[ "$cert" == "$EXPECTED_CERT_SHA" ]] && echo 'PASS clé Android Debug identique' || { echo "ECHEC certificat debug différent: $cert"; bad=1; }
else echo 'ECHEC ~/.android/debug.keystore absent'; bad=1; fi
[[ "$bad" == 0 ]] || { echo 'AUDIT BLOQUANT: ne pas prétendre à une reproduction exacte.'; exit 3; }

if [[ "$BUILD" != 1 ]]; then echo 'AUDIT TERMINE. Relancer avec BUILD=1 pour compiler et comparer.'; exit 0; fi
line; echo 'BUILD REPRODUCTIBLE ET COMPARAISON'; line
cd "$APP"
rm -rf .dart_tool build android/.gradle android/build
flutter pub get
WAOUH_TEST_RELEASE=1 flutter build apk --release --target-platform android-arm64
CAND="$APP/build/app/outputs/flutter-apk/app-release.apk"
[[ -f "$CAND" ]] || { echo 'ERREUR APK candidat absent'; exit 1; }
cp -f "$CAND" "$HOME/Downloads/WAOUH_CANDIDAT_REFERENCE.apk"
python3 "$ROOT/compare_apk_to_reference.py" "$REF" "$CAND"
