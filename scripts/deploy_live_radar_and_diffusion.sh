#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v supabase >/dev/null || {
  echo "Supabase CLI absente. Installez-la puis reconnectez-vous." >&2
  exit 1
}

test -f supabase/functions/waouh-radar-nearby/index.ts || {
  echo "Fonction Radar introuvable." >&2
  exit 1
}
test -f supabase/functions/waouh-diffusion-suggest/index.ts || {
  echo "Fonction de suggestion Gemini introuvable." >&2
  exit 1
}

supabase functions deploy waouh-radar-nearby
supabase functions deploy waouh-diffusion-suggest

echo
printf '%s\n' 'Déploiement terminé : Radar réel et suggestion Diffusion IA sont disponibles.'
printf '%s\n' 'La fonction Gemini utilise le secret GEMINI_API_KEY côté Supabase.'
printf '%s\n' 'Si ce secret est absent, la diffusion reste utilisable avec une suggestion locale protégée.'
