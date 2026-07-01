#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_REF="mvynepqulhflxtyymtzs"
cd "$ROOT"

if command -v supabase >/dev/null 2>&1; then
  SUPABASE=(supabase)
elif command -v npx >/dev/null 2>&1; then
  SUPABASE=(npx --yes supabase)
else
  echo "Supabase CLI introuvable. Installez Node.js 20+ ou la CLI Supabase." >&2
  exit 1
fi

test -f supabase/functions/waouh-radar-nearby/index.ts || {
  echo "Fonction Radar introuvable." >&2
  exit 1
}
test -f supabase/functions/waouh-diffusion-suggest/index.ts || {
  echo "Fonction de suggestion Gemini introuvable." >&2
  exit 1
}

echo "Projet Supabase ciblé : $PROJECT_REF"
echo "CLI utilisée : ${SUPABASE[*]}"
"${SUPABASE[@]}" functions deploy waouh-radar-nearby --project-ref "$PROJECT_REF"
"${SUPABASE[@]}" functions deploy waouh-diffusion-suggest --project-ref "$PROJECT_REF"

echo
printf '%s\n' 'Déploiement terminé : Radar réel et suggestion Diffusion IA sont disponibles.'
printf '%s\n' 'La fonction Gemini utilise le secret GEMINI_API_KEY côté Supabase.'
printf '%s\n' 'Si ce secret est absent, la diffusion reste utilisable avec une suggestion locale protégée.'
