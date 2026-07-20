#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
rehash 2>/dev/null || true

PROJECT="$HOME/Downloads/botbenin_codex_clean_20260703_154939"
EDGE="$PROJECT/supabase/functions/waouh-apresbac-chat/index.ts"
REF="mvynepqulhflxtyymtzs"
CLI_VERSION="2.109.0"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$EDGE.backup_cors_v2_15_$STAMP"
LOG="$HOME/Downloads/apresbac_web_cors_v2_15_$STAMP.log"

exec > >(tee -a "$LOG") 2>&1

echo "============================================================"
echo " APRÈSBAC IA WEB V2.15 — CORRECTION CORS PERMANENTE"
echo "============================================================"

[ -f "$EDGE" ] || {
  echo "ERREUR : fonction locale introuvable : $EDGE"
  exit 1
}

command -v python3 >/dev/null 2>&1 || {
  echo "ERREUR : python3 introuvable."
  exit 1
}

command -v npx >/dev/null 2>&1 || {
  echo "ERREUR : npx introuvable."
  exit 1
}

cp "$EDGE" "$BACKUP"
echo "Sauvegarde : $BACKUP"

python3 - "$EDGE" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

# La page Web envoyait x-request-id. Il doit être autorisé dans le preflight.
pattern = re.compile(
    r'("Access-Control-Allow-Headers"\s*:\s*\n?\s*)'
    r'"authorization, x-client-info, apikey, content-type(?:, x-request-id)?(?:, x-region)?"'
)
replacement = (
    r'\1"authorization, x-client-info, apikey, content-type, '
    r'x-request-id, x-region"'
)

updated, count = pattern.subn(replacement, text, count=1)

if count == 0:
    # Variante tolérante si la chaîne est formatée autrement.
    old = "authorization, x-client-info, apikey, content-type"
    if old not in text:
        raise SystemExit(
            "ERREUR : déclaration Access-Control-Allow-Headers introuvable."
        )
    updated = text.replace(
        old,
        "authorization, x-client-info, apikey, content-type, "
        "x-request-id, x-region",
        1,
    )

if 'request.method === "OPTIONS"' not in updated:
    raise SystemExit("ERREUR : gestion OPTIONS absente de la fonction.")

if '"Access-Control-Allow-Origin": "*"' not in updated:
    raise SystemExit("ERREUR : Access-Control-Allow-Origin absent.")

path.write_text(updated, encoding="utf-8")
print("PASS : x-request-id et x-region autorisés par CORS.")
PY

echo
echo "=== DÉPLOIEMENT DE LA FONCTION ==="
cd "$PROJECT"

npx --yes "supabase@$CLI_VERSION" functions deploy \
  waouh-apresbac-chat \
  --project-ref "$REF" \
  --no-verify-jwt \
  --use-api

echo
echo "=== TEST DU PREFLIGHT CORS ==="
OPTIONS_HEADERS="$HOME/Downloads/apresbac_options_$STAMP.txt"

curl -sS -D "$OPTIONS_HEADERS" -o /dev/null \
  -X OPTIONS \
  -H "Origin: https://bot.bj" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,apikey,content-type,x-request-id" \
  "https://${REF}.supabase.co/functions/v1/waouh-apresbac-chat"

cat "$OPTIONS_HEADERS"

grep -Eqi '^access-control-allow-origin:[[:space:]]*\*' "$OPTIONS_HEADERS" || {
  echo "ERREUR : Access-Control-Allow-Origin non confirmé."
  exit 1
}

grep -Eqi '^access-control-allow-headers:.*x-request-id' "$OPTIONS_HEADERS" || {
  echo "ERREUR : x-request-id non confirmé dans Access-Control-Allow-Headers."
  exit 1
}

echo "PASS : preflight CORS valide pour https://bot.bj."

echo
echo "=== TEST PUBLIC HEALTH ==="
HEALTH="$HOME/Downloads/apresbac_health_$STAMP.json"
HTTP_CODE="$(curl -sS -o "$HEALTH" -w '%{http_code}' \
  -X POST \
  -H "Origin: https://bot.bj" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  --data '{"action":"health","context":{"locale":"fr-BJ","channel":"public-web"}}' \
  "https://${REF}.supabase.co/functions/v1/waouh-apresbac-chat" || true)"

cat "$HEALTH" 2>/dev/null || true
echo
echo "HTTP : $HTTP_CODE"

[ "$HTTP_CODE" = "200" ] || {
  echo "ERREUR : test public non concluant."
  exit 1
}

echo
echo "============================================================"
echo " SUCCÈS — APRÈSBAC IA WEB V2.15"
echo "============================================================"
echo "Fonction : waouh-apresbac-chat"
echo "Sauvegarde : $BACKUP"
echo "Journal : $LOG"
echo "Actualisez ensuite https://bot.bj/apresbacia avec Cmd+Maj+R."
