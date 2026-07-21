#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
rehash 2>/dev/null || true

PROJECT="${APRESBAC_PROJECT_DIR:-$HOME/Downloads/botbenin_codex_clean_20260703_154939}"
REF="${SUPABASE_PROJECT_REF:-mvynepqulhflxtyymtzs}"
CLI_VERSION="${SUPABASE_CLI_VERSION:-2.109.0}"
TARGET_MODEL="google/gemini-2.5-flash-lite"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG="$HOME/Downloads/apresbac_flash_lite_${STAMP}.log"

PUBLIC_EDGE="$PROJECT/supabase/functions/waouh-apresbac-chat/index.ts"
AUTH_CHAT="$PROJECT/supabase/functions/apresbac-chat/index.ts"
AUTH_OCR="$PROJECT/supabase/functions/apresbac-ocr/index.ts"

exec > >(tee -a "$LOG") 2>&1

print_header() {
  echo "============================================================"
  echo " APRÈSBAC IA V2.18 — MIGRATION GEMINI 2.5 FLASH-LITE"
  echo "============================================================"
}

fail() {
  echo "ERREUR : $1" >&2
  exit 1
}

print_header

echo "Projet : $PROJECT"
echo "Projet Supabase : $REF"
echo "Modèle cible : $TARGET_MODEL"
echo

[ -d "$PROJECT" ] || fail "dossier projet introuvable : $PROJECT"
[ -f "$PUBLIC_EDGE" ] || fail "fonction publique introuvable : $PUBLIC_EDGE"
command -v python3 >/dev/null 2>&1 || fail "python3 introuvable"
command -v npx >/dev/null 2>&1 || fail "npx introuvable"

FILES=("$PUBLIC_EDGE")
[ -f "$AUTH_CHAT" ] && FILES+=("$AUTH_CHAT")
[ -f "$AUTH_OCR" ] && FILES+=("$AUTH_OCR")

BACKUP_DIR="$PROJECT/.backups/apresbac_flash_lite_$STAMP"
mkdir -p "$BACKUP_DIR"

for file in "${FILES[@]}"; do
  relative="${file#$PROJECT/}"
  destination="$BACKUP_DIR/$relative"
  mkdir -p "${destination:h}"
  cp "$file" "$destination"
done

echo "Sauvegarde : $BACKUP_DIR"

echo
 echo "=== MISE À JOUR CONTRÔLÉE DU MODÈLE ==="
python3 - "$TARGET_MODEL" "${FILES[@]}" <<'PY'
from pathlib import Path
import re
import sys

target = sys.argv[1]
paths = [Path(value) for value in sys.argv[2:]]

# Remplace uniquement Gemini 2.5 Flash non-Lite. Le negative lookahead
# empêche de transformer une valeur déjà correcte en "flash-lite-lite".
patterns = [
    re.compile(r"google/gemini-2\.5-flash(?!-lite)"),
    re.compile(r"(?<!google/)gemini-2\.5-flash(?!-lite)"),
]

for path in paths:
    text = path.read_text(encoding="utf-8")
    updated = text
    replacements = 0

    for pattern in patterns:
        replacement = target if pattern.pattern.startswith("google/") else "gemini-2.5-flash-lite"
        updated, count = pattern.subn(replacement, updated)
        replacements += count

    path.write_text(updated, encoding="utf-8")

    if target not in updated and "gemini-2.5-flash-lite" not in updated:
        raise SystemExit(
            f"ERREUR : aucun modèle Gemini 2.5 Flash-Lite détecté dans {path}"
        )

    forbidden = re.findall(r"(?:google/)?gemini-2\.5-flash(?!-lite)", updated)
    if forbidden:
        raise SystemExit(
            f"ERREUR : une ancienne référence Gemini 2.5 Flash subsiste dans {path}"
        )

    print(f"PASS : {path} — {replacements} remplacement(s), modèle={target}")
PY

echo
 echo "=== CONTRÔLE DES FICHIERS APRÈSBAC ==="
for file in "${FILES[@]}"; do
  echo "--- ${file#$PROJECT/}"
  grep -nE 'gemini-2\.5-flash(-lite)?' "$file" || true
  if grep -nE 'gemini-2\.5-flash([^_-]|$)' "$file" >/dev/null 2>&1; then
    fail "ancienne référence Gemini 2.5 Flash détectée dans $file"
  fi
done

echo
 echo "=== DÉPLOIEMENT SUPABASE EDGE FUNCTIONS ==="
cd "$PROJECT"

npx --yes "supabase@$CLI_VERSION" functions deploy \
  waouh-apresbac-chat \
  --project-ref "$REF" \
  --no-verify-jwt \
  --use-api

if [ -f "$AUTH_CHAT" ]; then
  npx --yes "supabase@$CLI_VERSION" functions deploy \
    apresbac-chat \
    --project-ref "$REF" \
    --use-api
fi

if [ -f "$AUTH_OCR" ]; then
  npx --yes "supabase@$CLI_VERSION" functions deploy \
    apresbac-ocr \
    --project-ref "$REF" \
    --use-api
fi

echo
 echo "=== TEST DU SERVICE PUBLIC ==="
HEALTH_FILE="$HOME/Downloads/apresbac_flash_lite_health_${STAMP}.json"
HTTP_CODE="$(curl -sS -o "$HEALTH_FILE" -w '%{http_code}' \
  -X POST \
  -H "Origin: https://bot.bj" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  --data '{"action":"health","context":{"locale":"fr-BJ","channel":"model-migration-check","expected_model":"google/gemini-2.5-flash-lite"}}' \
  "https://${REF}.supabase.co/functions/v1/waouh-apresbac-chat" || true)"

cat "$HEALTH_FILE" 2>/dev/null || true
echo
echo "HTTP : $HTTP_CODE"
[ "$HTTP_CODE" = "200" ] || fail "le health-check public a retourné HTTP $HTTP_CODE"

echo
 echo "=== VÉRIFICATION FINALE LOCALE ==="
python3 - "$PUBLIC_EDGE" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

if "google/gemini-2.5-flash-lite" not in text and "gemini-2.5-flash-lite" not in text:
    raise SystemExit("ERREUR : le modèle Flash-Lite n'est pas présent dans la fonction publique")

if re.search(r"(?:google/)?gemini-2\.5-flash(?!-lite)", text):
    raise SystemExit("ERREUR : l'ancien modèle Flash est encore présent")

print("PASS : waouh-apresbac-chat utilise Gemini 2.5 Flash-Lite dans le code déployé.")
PY

echo
echo "============================================================"
echo " SUCCÈS — APRÈSBAC IA UTILISE GEMINI 2.5 FLASH-LITE"
echo "============================================================"
echo "Fonction publique : waouh-apresbac-chat"
echo "Fonctions complémentaires : apresbac-chat, apresbac-ocr"
echo "Modèle : $TARGET_MODEL"
echo "Sauvegarde : $BACKUP_DIR"
echo "Journal : $LOG"
echo "Lien public : https://bot.bj/apresbacia"
