#!/usr/bin/env bash
# =============================================================================
# Banc de test SQL des migrations chat du 27/09/2026 — POSTGRES LOCAL UNIQUEMENT.
# Crée une base jetable, reproduit la forme de production, applique les vraies
# migrations (dont admin_command_center et commerce_e2e_v3), puis les nôtres
# DEUX FOIS (rejouabilité), et exécute les scénarios.
#
# Usage : PSQL="psql -h localhost -U postgres" ./scripts/waouh-chat/verify/run-sql-tests.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
VERIFY="$ROOT/scripts/waouh-chat/verify"
MIG="$ROOT/supabase/migrations"
DB="${WAOUH_TEST_DB:-waouh_chat_verify}"
PSQL_BASE="${PSQL:-psql}"

case "$DB" in
  *prod*|*production*|postgres) echo "Refus : nom de base '$DB' interdit pour un banc de test." >&2; exit 2 ;;
esac

run() { $PSQL_BASE -v ON_ERROR_STOP=1 -q -d "$DB" "$@"; }

$PSQL_BASE -q -d postgres -c "DROP DATABASE IF EXISTS $DB;" -c "CREATE DATABASE $DB;"

echo "== Schéma façon production"
run -f "$VERIFY/00_prod_like_schema.sql"
echo "== Migrations existantes (réelles)"
run -f "$MIG/20260926023000_waouh_admin_command_center.sql"
run -f "$MIG/20260926190000_waouh_commerce_e2e_v3.sql"
echo "== Données historiques"
run -f "$VERIFY/05_legacy_fixtures.sql"

echo "== Migrations du 27/09/2026 (1er passage)"
for f in 20260927120000_waouh_chat_messages_thread_base.sql \
         20260927120500_waouh_chat_messages_thread_backfill.sql \
         20260927121000_waouh_chat_reconcile.sql; do
  run -f "$MIG/$f"
done
echo "== Migrations du 27/09/2026 (2e passage : rejouabilité)"
for f in 20260927120000_waouh_chat_messages_thread_base.sql \
         20260927120500_waouh_chat_messages_thread_backfill.sql \
         20260927121000_waouh_chat_reconcile.sql; do
  run -f "$MIG/$f"
done

echo "== Backfill + réconciliation"
run -f "$VERIFY/20_backfill_reconcile.sql"
echo "== Écrivain unique"
run -f "$VERIFY/10_scenarios.sql"

DEFERRED="$ROOT/supabase/deferred/20260927130000_waouh_chat_thread_constraint.sql"
# Le fichier différé doit ÉCHOUER, et pour la raison attendue.
expect_refusal() {
  local label="$1" pattern="$2" out
  if out=$(run -f "$DEFERRED" 2>&1); then
    echo "ÉCHEC : $label — la phase 6 s'est appliquée" >&2; exit 1
  fi
  if ! grep -q "$pattern" <<<"$out"; then
    echo "ÉCHEC : $label — refus pour une autre raison :" >&2; echo "$out" >&2; exit 1
  fi
  echo "PASS $label"
}

echo "== Phase 6 : refus attendu (interrupteur coupé)"
expect_refusal "P6-1 refus interrupteur coupé" "chat_writer_v2 doit être activé"

run -c "UPDATE waouh_admin_module_controls SET enabled = true, automation_enabled = true WHERE module_key = 'chat_writer_v2';"
run -c "INSERT INTO waouh_messages(user_id, direction, text, meta) VALUES ('10000000-0000-4000-8000-00000000000b','out','repli ancien chemin','{\"negotiation_id\":\"10000000-0000-4000-8000-0000000000b1\"}');"
echo "== Phase 6 : refus attendu (écriture Deal Room sans thread récente)"
expect_refusal "P6-2 refus violation récente" "Deal Room sans thread sur 48 h"

run -c "DELETE FROM waouh_messages WHERE text = 'repli ancien chemin';"
echo "== Phase 6 : application"
run -f "$DEFERRED"
run -f "$VERIFY/30_phase6_deferred.sql"

$PSQL_BASE -q -d postgres -c "DROP DATABASE IF EXISTS $DB;"
echo "== TOUS LES SCÉNARIOS SQL SONT PASSÉS"
