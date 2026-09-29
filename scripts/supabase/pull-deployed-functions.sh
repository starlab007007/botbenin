#!/usr/bin/env bash
# Télécharge à l'identique les fonctions Edge déployées qui n'ont pas de source dans supabase/functions/.
# Lecture seule côté Supabase. Nécessite : supabase CLI + SUPABASE_ACCESS_TOKEN.
# Usage : SUPABASE_PROJECT_REF=mvynepqulhflxtyymtzs ./scripts/supabase/pull-deployed-functions.sh [slug ...]
set -euo pipefail

REF="${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF requis}"
DEFAULT_SLUGS=(
  a chat-webhook setup-test-accounts waha-agent-bridge waha-session-mobile
  waouh-apresbac-chat waouh-bots-backend-health-v1 waouh-chat-health waouh-diffusion-suggest
  waouh-e2e-v3-relay waouh-presence-checkin waouh-presence-event-notify waouh-presence-public-page
  waouh-presence-qr-create waouh-presence-qr-preview waouh-radar-nearby waouh-stock-alert-send
  waouh-stock-ingest waouh-stock-query waouh-studio-agent-webhook-v2146 waouh-studio-e2e-v21465
  waouh-studio-pair-code-v2145 waouh-studio-pair-code-v21462 waouh-studio-user-api
)
SLUGS=("$@"); [ ${#SLUGS[@]} -gt 0 ] || SLUGS=("${DEFAULT_SLUGS[@]}")

OUT="${OUT_DIR:-.pulled-functions}"   # jamais directement dans supabase/functions : on relit le diff d'abord
mkdir -p "$OUT"
for slug in "${SLUGS[@]}"; do
  echo "→ $slug"
  (cd "$OUT" && supabase functions download "$slug" --project-ref "$REF" --use-api)
done
echo "Téléchargé dans $OUT/. Relire, comparer avec supabase/functions/DEPLOYED_MANIFEST.md, puis copier ce qui doit être versionné."
