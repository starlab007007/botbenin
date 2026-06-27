#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_REF="mvynepqulhflxtyymtzs"

fail() {
  echo "BACKEND DEPLOY BLOCKED: $1" >&2
  exit 1
}

command -v supabase >/dev/null 2>&1 || fail "Installez Supabase CLI puis connectez-vous avec: supabase login"

echo "Projet Supabase attendu : $PROJECT_REF"
echo "Fonctions à déployer : whatsapp-otp-send, whatsapp-otp-verify"
echo
supabase projects list
read -r -p "Confirmez le déploiement vers $PROJECT_REF (oui/non) : " ANSWER
[ "$ANSWER" = "oui" ] || fail "Déploiement annulé."

supabase functions deploy whatsapp-otp-send --project-ref "$PROJECT_REF" --no-verify-jwt
supabase functions deploy whatsapp-otp-verify --project-ref "$PROJECT_REF" --no-verify-jwt

printf '\nSecrets à vérifier dans Supabase Dashboard > Edge Functions > Secrets :\n'
printf '%s\n' '  - WAHA_BASE_URL'
printf '%s\n' '  - WAHA_API_KEY ou WAHA_API_KEY_PLAIN'
printf '%s\n' '  - WAHA_DEFAULT_SESSION'
printf '%s\n' '  - SUPABASE_SERVICE_ROLE_KEY (géré par Supabase selon l’environnement)'
printf '%s\n' '  - OTP_DEV_MODE doit être absent ou différent de 1 en production'

printf '\nDéploiement terminé. Exécutez ensuite le scénario OTP du test fermé avant toute publication.\n'
