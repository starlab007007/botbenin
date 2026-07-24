#!/bin/zsh
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_REF="mvynepqulhflxtyymtzs"
CLI_VERSION="2.109.0"
STAMP="$(date +%Y%m%d_%H%M%S)"
LOG="$HOME/Downloads/fa_admin_v16_deploiement_${STAMP}.log"
MIGRATION="supabase/migrations/20260724113000_fa_admin_console_v16.sql"

exec > >(tee -a "$LOG") 2>&1

fail() { echo "ERREUR : $1" >&2; echo "Journal : $LOG"; exit 1; }
ok() { echo "✓ $1"; }
step() { echo; echo "▶ $1"; }

cd "$PROJECT" || fail "Projet introuvable : $PROJECT"
[ -f supabase/config.toml ] || fail "supabase/config.toml introuvable"
[ -f "$MIGRATION" ] || fail "Migration introuvable : $MIGRATION"
[ -f supabase/functions/waouh-fa-chat/index.ts ] || fail "waouh-fa-chat introuvable"
[ -f supabase/functions/fa-admin/index.ts ] || fail "fa-admin introuvable"

CURRENT_REF="$(grep -E '^[[:space:]]*project_id[[:space:]]*=' supabase/config.toml | head -1 | sed -E 's/.*=[[:space:]]*"([^"]+)".*/\1/')"
[ "$CURRENT_REF" = "$PROJECT_REF" ] || fail "Mauvais projet Supabase : $CURRENT_REF"

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  fail "Le dépôt contient des modifications suivies. Exécutez d’abord : git reset --hard origin/prod"
fi

if command -v supabase >/dev/null 2>&1; then
  SUPABASE=(supabase)
else
  SUPABASE=(npx --yes "supabase@${CLI_VERSION}")
fi

step "Projet de déploiement"
echo "Dossier : $PROJECT"
echo "Branche : $(git branch --show-current)"
echo "Commit : $(git rev-parse --short HEAD)"
ok "Aucune synchronisation Git automatique ne sera exécutée"

step "Connexion et liaison Supabase"
"${SUPABASE[@]}" login
"${SUPABASE[@]}" link --project-ref "$PROJECT_REF"
ok "Projet Supabase lié"

step "Vérification de la clé Gemini existante"
SECRETS="$("${SUPABASE[@]}" secrets list --project-ref "$PROJECT_REF")"
echo "$SECRETS"
if echo "$SECRETS" | grep -q 'GEMINI_API_KEY'; then
  ok "GEMINI_API_KEY existante détectée — aucune nouvelle clé ne sera créée"
elif echo "$SECRETS" | grep -q 'GOOGLE_API_KEY'; then
  ok "GOOGLE_API_KEY existante détectée — aucune nouvelle clé ne sera créée"
else
  fail "Aucune clé Gemini existante détectée"
fi

if ! echo "$SECRETS" | grep -q 'SUPABASE_ACCESS_TOKEN'; then
  echo
  echo "Pour permettre à l’administrateur de remplacer plus tard la clé Gemini depuis l’interface,"
  echo "vous pouvez enregistrer votre Personal Access Token Supabase comme secret serveur."
  echo "Ce n’est pas une nouvelle clé Gemini."
  read -r -s "SUPABASE_PAT?Personal Access Token Supabase (laisser vide pour ignorer) : "
  echo
  if [ -n "${SUPABASE_PAT:-}" ]; then
    "${SUPABASE[@]}" secrets set "SUPABASE_ACCESS_TOKEN=${SUPABASE_PAT}" --project-ref "$PROJECT_REF"
    ok "Gestion sécurisée des secrets activée dans l’interface admin"
  else
    echo "⚠ Mise à jour de la clé depuis l’UI désactivée ; le reste fonctionnera normalement."
  fi
else
  ok "SUPABASE_ACCESS_TOKEN déjà configuré"
fi

step "Application de la migration FA Admin V16"
"${SUPABASE[@]}" db push --linked --include-all
ok "Migration appliquée"

step "Déploiement de waouh-fa-chat"
"${SUPABASE[@]}" functions deploy waouh-fa-chat \
  --project-ref "$PROJECT_REF" \
  --no-verify-jwt \
  --use-api
ok "waouh-fa-chat déployée"

step "Déploiement de fa-admin"
"${SUPABASE[@]}" functions deploy fa-admin \
  --project-ref "$PROJECT_REF" \
  --use-api
ok "fa-admin déployée avec authentification JWT"

step "Vérification des fonctions distantes"
"${SUPABASE[@]}" functions list --project-ref "$PROJECT_REF" | tee /tmp/fa_admin_v16_functions.txt
grep -q 'waouh-fa-chat' /tmp/fa_admin_v16_functions.txt || fail "waouh-fa-chat absente"
grep -q 'fa-admin' /tmp/fa_admin_v16_functions.txt || fail "fa-admin absente"
ok "Deux fonctions confirmées"

step "Construction du frontend"
if [ -f package.json ]; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
  npm run build
  ok "Frontend compilé"
else
  echo "⚠ package.json introuvable, compilation ignorée"
fi

echo
echo "============================================================"
echo " SUCCÈS — FA ADMIN V16 DÉPLOYÉ"
echo "============================================================"
echo "Projet local : $PROJECT"
echo "Projet Supabase : $PROJECT_REF"
echo "Fonctions : waouh-fa-chat, fa-admin"
echo "Quota gratuit : 1 consultation/jour"
echo "Code : 3 consultations par défaut"
echo "Génération : saisir uniquement 10, 20, 30, etc."
echo "Gemini : clé existante conservée"
echo "Modèle : gemini-3.1-flash-lite"
echo "Journal : $LOG"
echo
echo "Ouvrez ensuite le panneau administrateur FA IA dans bot.bj."
