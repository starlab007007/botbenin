#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_REF="mvynepqulhflxtyymtzs"
CONFIG_PATH="$ROOT/supabase/config.toml"
BACKUP_PATH=""
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
test -f "$CONFIG_PATH" || {
  echo "Configuration Supabase introuvable : $CONFIG_PATH" >&2
  exit 1
}

restore_config() {
  if [[ -n "$BACKUP_PATH" && -f "$BACKUP_PATH" ]]; then
    mv "$BACKUP_PATH" "$CONFIG_PATH"
  fi
}
trap restore_config EXIT INT TERM

# The repository contains a legacy local-development config. Recent Supabase CLI
# versions can reject it before an Edge Function deploy starts. Deployment only
# needs a valid project id and the two function JWT policies, so swap in a tiny
# temporary config and restore the original file automatically afterwards.
BACKUP_PATH="$(mktemp "$ROOT/supabase/config.toml.deploy-backup.XXXXXX")"
cp "$CONFIG_PATH" "$BACKUP_PATH"
cat > "$CONFIG_PATH" <<EOF
project_id = "$PROJECT_REF"

[functions.waouh-radar-nearby]
verify_jwt = true

[functions.waouh-diffusion-suggest]
verify_jwt = true
EOF

echo "Projet Supabase ciblé : $PROJECT_REF"
echo "CLI utilisée : ${SUPABASE[*]}"
echo "Configuration locale de déploiement temporaire activée."
"${SUPABASE[@]}" functions deploy waouh-radar-nearby --project-ref "$PROJECT_REF"
"${SUPABASE[@]}" functions deploy waouh-diffusion-suggest --project-ref "$PROJECT_REF"

echo
printf '%s\n' 'Déploiement terminé : Radar réel et suggestion Diffusion IA sont disponibles.'
printf '%s\n' 'La fonction Gemini utilise le secret GEMINI_API_KEY côté Supabase.'
printf '%s\n' 'La configuration Supabase locale d’origine a été restaurée.'
