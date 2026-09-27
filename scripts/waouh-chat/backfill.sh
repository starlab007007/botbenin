#!/usr/bin/env bash
set -euo pipefail

APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true
BATCH_SIZE="${WAOUH_BACKFILL_BATCH_SIZE:-100}"
MAX_BATCHES="${WAOUH_BACKFILL_MAX_BATCHES:-1}"
: "${SUPABASE_DB_URL:?Exporter SUPABASE_DB_URL (connexion Postgres de production)}"

if ! [[ "$BATCH_SIZE" =~ ^[0-9]+$ ]] || [ "$BATCH_SIZE" -lt 1 ] || [ "$BATCH_SIZE" -gt 5000 ]; then
  echo "WAOUH_BACKFILL_BATCH_SIZE doit être entre 1 et 5000" >&2
  exit 1
fi
if ! [[ "$MAX_BATCHES" =~ ^[0-9]+$ ]] || [ "$MAX_BATCHES" -lt 1 ] || [ "$MAX_BATCHES" -gt 100 ]; then
  echo "WAOUH_BACKFILL_MAX_BATCHES doit être entre 1 et 100" >&2
  exit 1
fi

REPORT_SQL="select public.waouh_reconcile_chat_integrity('report', null);"
BATCH_SQL="select public.waouh_backfill_message_threads(${BATCH_SIZE}, null);"

echo "WAOUH Chat v2 — backfill historique contrôlé"
echo "  lot: ${BATCH_SIZE} · max lots: ${MAX_BATCHES}"
echo "  rapport avant toute mutation"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "$REPORT_SQL"

if ! $APPLY; then
  echo "Plan uniquement. Relancer avec --apply après validation du rapport."
  exit 0
fi

for ((i=1; i<=MAX_BATCHES; i++)); do
  echo "  lot $i/$MAX_BATCHES"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "$BATCH_SQL"
done

echo "  rapport après backfill"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c "$REPORT_SQL"
