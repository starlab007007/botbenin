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
  echo "Supabase CLI introuvable. Installez Node.js 20+ ou utilisez npx." >&2
  exit 1
fi

test -f "$CONFIG_PATH" || { echo "Config Supabase introuvable." >&2; exit 1; }
test -f supabase/functions/waouh-radar-nearby/index.ts || { echo "Fonction Radar introuvable." >&2; exit 1; }

restore_config() {
  if [[ -n "$BACKUP_PATH" && -f "$BACKUP_PATH" ]]; then
    mv "$BACKUP_PATH" "$CONFIG_PATH"
  fi
}
trap restore_config EXIT INT TERM

# Recent Supabase CLI validates config.toml before deploying. This project has a
# legacy local config, therefore deploy with a minimal temporary config only.
BACKUP_PATH="$(mktemp "$ROOT/supabase/config.toml.radar-backup.XXXXXX")"
cp "$CONFIG_PATH" "$BACKUP_PATH"
cat > "$CONFIG_PATH" <<EOF
project_id = "$PROJECT_REF"

[functions.waouh-radar-nearby]
verify_jwt = true
EOF

echo "[1/2] Déploiement immédiat de waouh-radar-nearby"
"${SUPABASE[@]}" functions deploy waouh-radar-nearby --project-ref "$PROJECT_REF"

echo "[2/2] Vérification de la fonction déployée"
"${SUPABASE[@]}" functions list --project-ref "$PROJECT_REF"

echo
printf '%s\n' 'Radar déployé. La fonction utilise les données existantes du catalogue et les villes connues comme position estimée lorsque le GPS est absent.'
printf '%s\n' 'La configuration Supabase locale d’origine a été restaurée.'
printf '%s\n' 'Ouvrez Radar, sélectionnez 100 km, désactivez les filtres Photo/Vérifié puis appuyez sur Scanner maintenant.'
