#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
rehash 2>/dev/null || true

PROJECT="${PROJECT:-$HOME/Downloads/botbenin_codex_clean_20260703_154939}"
EDGE="$PROJECT/supabase/functions/waouh-apresbac-chat/index.ts"
REF="mvynepqulhflxtyymtzs"
CLI_VERSION="2.109.0"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$EDGE.backup_security_v2_17_$STAMP"
LOG="$HOME/Downloads/apresbac_edge_security_v2_17_$STAMP.log"

exec > >(tee -a "$LOG") 2>&1

echo "============================================================"
echo " APRÈSBAC IA — SÉCURISATION EDGE V2.17"
echo " CORS limité à https://bot.bj"
echo "============================================================"

[ -f "$EDGE" ] || {
  echo "ERREUR : fonction Edge locale introuvable : $EDGE"
  exit 1
}

for command in python3 npx curl; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "ERREUR : commande introuvable : $command"
    exit 1
  }
done

cp "$EDGE" "$BACKUP"
echo "Sauvegarde : $BACKUP"

python3 - "$EDGE" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

# L'application est publique, mais seul le navigateur servi par bot.bj doit
# recevoir une autorisation CORS. Les appels serveur-à-serveur ne dépendent pas
# de CORS.
patterns = [
    (r'("Access-Control-Allow-Origin"\s*:\s*)"\*"', r'\1"https://bot.bj"'),
    (r"('Access-Control-Allow-Origin'\s*:\s*)'\*'", r"\1'https://bot.bj'"),
]

updated = text
replacements = 0

for pattern, replacement in patterns:
    updated, count = re.subn(pattern, replacement, updated)
    replacements += count

if replacements == 0 and '"Access-Control-Allow-Origin": "https://bot.bj"' not in updated:
    raise SystemExit(
        "ERREUR : en-tête Access-Control-Allow-Origin introuvable. "
        "Aucune modification automatique n'a été appliquée."
    )

allowed_headers = (
    "authorization, x-client-info, apikey, content-type, "
    "x-request-id, x-region"
)

updated = re.sub(
    r'authorization,\s*x-client-info,\s*apikey,\s*content-type'
    r'(?:,\s*x-request-id)?(?:,\s*x-region)?',
    allowed_headers,
    updated,
    count=1,
    flags=re.IGNORECASE,
)

if 'request.method === "OPTIONS"' not in updated and "request.method === 'OPTIONS'" not in updated:
    raise SystemExit("ERREUR : gestion OPTIONS absente de la fonction.")

if "https://bot.bj" not in updated:
    raise SystemExit("ERREUR : origine bot.bj non enregistrée.")

path.write_text(updated, encoding="utf-8")
print("PASS : CORS limité à https://bot.bj.")
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
echo "=== TEST CORS AUTORISÉ ==="
ALLOWED_HEADERS="$HOME/Downloads/apresbac_cors_allowed_$STAMP.txt"

curl -sS -D "$ALLOWED_HEADERS" -o /dev/null \
  -X OPTIONS \
  -H "Origin: https://bot.bj" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,apikey,content-type,x-request-id" \
  "https://${REF}.supabase.co/functions/v1/waouh-apresbac-chat"

cat "$ALLOWED_HEADERS"

grep -Eqi '^access-control-allow-origin:[[:space:]]*https://bot\.bj' "$ALLOWED_HEADERS" || {
  echo "ERREUR : bot.bj n'est pas autorisé par CORS."
  exit 1
}

grep -Eqi '^access-control-allow-headers:.*x-request-id' "$ALLOWED_HEADERS" || {
  echo "ERREUR : x-request-id absent des en-têtes autorisés."
  exit 1
}

echo
echo "=== TEST ORIGINE NON AUTORISÉE ==="
BLOCKED_HEADERS="$HOME/Downloads/apresbac_cors_blocked_$STAMP.txt"

curl -sS -D "$BLOCKED_HEADERS" -o /dev/null \
  -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,apikey,content-type" \
  "https://${REF}.supabase.co/functions/v1/waouh-apresbac-chat"

if grep -Eqi '^access-control-allow-origin:[[:space:]]*\*' "$BLOCKED_HEADERS"; then
  echo "ERREUR : le wildcard CORS est encore actif."
  exit 1
fi

echo "PASS : aucun wildcard CORS détecté."

echo
echo "=== TEST PUBLIC HEALTH ==="
HEALTH="$HOME/Downloads/apresbac_health_security_$STAMP.json"
HTTP_CODE="$(curl -sS -o "$HEALTH" -w '%{http_code}' \
  -X POST \
  -H "Origin: https://bot.bj" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  --data '{"action":"health","context":{"locale":"fr-BJ","channel":"public-web-production"}}' \
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
echo " SUCCÈS — EDGE APRÈSBAC IA SÉCURISÉ V2.17"
echo "============================================================"
echo "Origine autorisée : https://bot.bj"
echo "Fonction : waouh-apresbac-chat"
echo "Sauvegarde : $BACKUP"
echo "Journal : $LOG"
