#!/usr/bin/env bash
# =============================================================================
# WAOUH Chat v2 — déploiement du lot du 27/09/2026 (docs/WAOUH_CHAT_THREAD_MIGRATION.md)
#
# Par défaut : AFFICHE le plan, n'exécute rien.
#   ./scripts/waouh-chat/deploy.sh                 # plan seulement
#   ./scripts/waouh-chat/deploy.sh --apply         # exécute
#
# Pré-requis : supabase CLI connecté (supabase login), SUPABASE_PROJECT_REF
# exporté, et le lot appliqué sur une branche partie de prod @ 8c909bae ou plus
# récente. Aucune commande git push n'est exécutée par ce script.
#
# Ordre volontaire : base de données d'abord (tout est inactif par défaut),
# puis fonctions. À chaque étape, la plateforme reste dans un état cohérent :
#   - migrations seules : interrupteurs OFF, aucun appel au nouveau code ;
#   - fonctions déployées : chemin v2 présent mais inactif (chat_writer_v2 OFF),
#     seuls les correctifs toujours actifs s'appliquent (voir la doc).
# =============================================================================
set -euo pipefail

APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true
: "${SUPABASE_PROJECT_REF:?Exporter SUPABASE_PROJECT_REF (réf. du projet de production)}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MIGRATIONS=(
  supabase/migrations/20260927120000_waouh_chat_messages_thread_base.sql
  supabase/migrations/20260927120500_waouh_chat_messages_thread_backfill.sql
  supabase/migrations/20260927121000_waouh_chat_reconcile.sql
)

# Fonctions modifiées + fonctions qui embarquent un module _shared modifié
# (waouh-sync.ts : payment, buyer-interest, deal-dispatch, notify-dispatch).
# Toutes sont en verify_jwt = false dans supabase/config.toml : on conserve.
FUNCTIONS=(
  waouh-match-history
  waouh-negotiation-router
  waouh-deal-ops
  waouh-buyer-interest
  waouh-payment
  waouh-deal-dispatch
  waouh-notify-dispatch
  waouh-webhook
  waouh-channel-in
)

step() { echo; echo "▶ $*"; }
run() { if $APPLY; then echo "+ $*"; "$@"; else echo "  (plan) $*"; fi; }

for f in "${MIGRATIONS[@]}"; do
  test -f "$f" || { echo "Fichier manquant : $f" >&2; exit 1; }
done
test ! -e supabase/migrations/20260927130000_waouh_chat_thread_constraint.sql || {
  echo "La phase 6 ne doit PAS être dans supabase/migrations (voir supabase/deferred/)." >&2; exit 1; }

step "1/4 Vérifier les migrations en attente sur la production"
echo "  ⚠️  'supabase db push' applique TOUTES les migrations en attente, pas seulement"
echo "      celles de ce lot. Contrôler la liste avant d'appliquer :"
run supabase migration list --linked

step "2/4 Simulation puis application des migrations (additives, interrupteurs OFF, sans backfill historique automatique)"
run supabase db push --linked --dry-run
if $APPLY; then
  read -r -p "  La simulation ne liste-t-elle QUE les 3 migrations du 27/09 (ou des migrations attendues) ? [oui/NON] " answer
  [ "$answer" = "oui" ] || { echo "  Arrêt : rien n'a été appliqué."; exit 1; }
fi
run supabase db push --linked

step "3/4 Déploiement des edge functions (chemin v2 présent mais inactif)"
for fn in "${FUNCTIONS[@]}"; do
  run supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
done

step "4/4 Contrôle"
echo "  • Admin > WAOUH > Health Check : carte « Réconciliation du chat » visible, bouton « Analyser »."
echo "  • Command Center : modules « Chat — écrivain unique (v2) » (OFF) et « Chat — réconciliation automatique »."
echo "  • Backfill historique : script séparé scripts/waouh-chat/backfill.sh (plan par défaut)."\necho "  • Activation progressive : voir docs/WAOUH_CHAT_THREAD_MIGRATION.md, section « Activation »."
if ! $APPLY; then
  echo
  echo "Plan affiché uniquement. Relancer avec --apply pour exécuter."
fi
