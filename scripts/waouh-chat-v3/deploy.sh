#!/usr/bin/env bash
# =============================================================================
# WAOUH Chat — Parcours unifié v3 : déploiement des Lots 1 et 2.
# Doc : docs/WAOUH_CHAT_PARCOURS_V3.md
#
# Par défaut : AFFICHE le plan, n'exécute rien.
#   ./scripts/waouh-chat-v3/deploy.sh            # plan seulement
#   ./scripts/waouh-chat-v3/deploy.sh --apply    # exécute
#
# Pré-requis : supabase CLI connecté, SUPABASE_PROJECT_REF exporté, branche
# partie de prod @ 9be01e74 (ou plus récente). Aucun « git push » ici.
#
# Ordre : base (interrupteurs) → fonctions. Après ce script :
#   - Lot 1 actif (chat_interest_fastpath installé ACTIVÉ) ;
#   - Lot 2 déployé mais COUPÉ (chat_catalog_v3, commerce_action_v3).
# Activation du Lot 2 : scripts/waouh-chat-v3/flags.sql (étapes commentées).
# =============================================================================
set -euo pipefail

APPLY=false
[ "${1:-}" = "--apply" ] && APPLY=true
: "${SUPABASE_PROJECT_REF:?Exporter SUPABASE_PROJECT_REF (réf. du projet de production)}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MIGRATIONS=(
  supabase/migrations/20260928092242_waouh_chat_v3_flags.sql
  supabase/migrations/20260928092245_waouh_commerce_actions.sql
)

# Fonctions dont le comportement change. Les autres fonctions qui importent
# _shared/waouh-commands.ts ou waouh-chat-writer.ts n'ont reçu que des ajouts :
# leur version déployée reste valide, pas de redéploiement nécessaire.
FUNCTIONS=(
  waouh-buyer-interest
  waouh-negotiation-router
  waouh-deal-ops
  waouh-webhook
  waouh-channel-in
  waouh-commerce-action
)

step() { echo; echo "▶ $*"; }
run() { if $APPLY; then echo "+ $*"; "$@"; else echo "  (plan) $*"; fi; }

for f in "${MIGRATIONS[@]}"; do
  test -f "$f" || { echo "Fichier manquant : $f" >&2; exit 1; }
done

step "1/4 Migrations en attente sur la production (contrôle)"
echo "  ⚠️  'supabase db push' applique TOUTES les migrations en attente."
run supabase migration list --linked

step "2/4 Simulation puis application des 2 migrations (additives)"
run supabase db push --linked --dry-run
if $APPLY; then
  read -r -p "  La simulation ne liste-t-elle QUE les 2 migrations v3 ? [oui/NON] " answer
  [ "$answer" = "oui" ] || { echo "  Arrêt : rien n'a été appliqué."; exit 1; }
fi
run supabase db push --linked

step "3/4 Déploiement des fonctions (verify_jwt = false, comme aujourd'hui)"
for fn in "${FUNCTIONS[@]}"; do
  run supabase functions deploy "$fn" --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt
done

step "4/4 Contrôles"
echo "  • Command Center : « Chat — ouverture directe de la Deal Room (v3) » = ACTIVÉ ;"
echo "    « catalogue unifié (v3) » et « point d'entrée unique (v3) » = COUPÉS."
echo "  • Scénarios : scripts/waouh-chat-v3/smoke.sh (captures 1 et 2)."
echo "  • Web : build + déploiement habituels (Deal Room, fiches produit)."
echo "  • Flutter : flutter analyze && flutter test, puis build de l'application."
$APPLY || echo; $APPLY || echo "Plan affiché. Relancer avec --apply pour exécuter."
