#!/usr/bin/env bash
# =============================================================================
# Parcours de bout en bout vendeur A / acheteur B — POSTGRES LOCAL UNIQUEMENT.
# Base jetable : schéma façon production + VRAIES migrations (chat, commerce,
# garde-fou thread du 29/09) puis scénario 40_journey_seller_buyer.sql.
# Aucun accès à Supabase, à WhatsApp ni à la production.
#
# Usage : PSQL="psql -h /tmp -p 55432 -U postgres" ./scripts/waouh-chat/verify/run-journey-e2e.sh
# =============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
VERIFY="$ROOT/scripts/waouh-chat/verify"; MIG="$ROOT/supabase/migrations"
DB="${WAOUH_TEST_DB:-waouh_journey_e2e}"; PSQL_BASE="${PSQL:-psql}"
case "$DB" in *prod*|*production*|postgres) echo "Refus : base '$DB' interdite." >&2; exit 2;; esac
run() { $PSQL_BASE -v ON_ERROR_STOP=1 -q -d "$DB" "$@"; }
$PSQL_BASE -q -d postgres -c "DROP DATABASE IF EXISTS $DB;" -c "CREATE DATABASE $DB;"
run -f "$VERIFY/00_prod_like_schema.sql"
for f in 20260926023000_waouh_admin_command_center.sql 20260926190000_waouh_commerce_e2e_v3.sql \
         20260927120000_waouh_chat_messages_thread_base.sql 20260927120500_waouh_chat_messages_thread_backfill.sql \
         20260927121000_waouh_chat_reconcile.sql 20260929065700_waouh_v3_canonical_thread_guard.sql \
         20260929065715_waouh_v3_commerce_events_rls_lockdown.sql 20260929131943_waouh_v3_thread_guard_fix_uuid_min.sql; do
  echo "== migration $f"; run -f "$MIG/$f" 2>&1 | grep -vE "^(NOTICE|psql:.*NOTICE)" || true
done
echo "== Parcours vendeur A / acheteur B"
run -f "$VERIFY/40_journey_seller_buyer.sql"
$PSQL_BASE -q -d postgres -c "DROP DATABASE IF EXISTS $DB;"
echo "== PARCOURS DE BOUT EN BOUT : TOUTES LES ÉTAPES PASSÉES"
