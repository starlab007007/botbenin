#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_REF="mvynepqulhflxtyymtzs"
CONFIG_PATH="$ROOT/supabase/config.toml"
MIGRATION_PATH="$ROOT/supabase/migrations/20260701170000_radar_catalog_location_backfill.sql"
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
test -f "$MIGRATION_PATH" || { echo "Migration Radar introuvable." >&2; exit 1; }
test -f supabase/functions/waouh-radar-nearby/index.ts || { echo "Fonction Radar introuvable." >&2; exit 1; }

restore_config() {
  if [[ -n "$BACKUP_PATH" && -f "$BACKUP_PATH" ]]; then
    mv "$BACKUP_PATH" "$CONFIG_PATH"
  fi
}
trap restore_config EXIT INT TERM

BACKUP_PATH="$(mktemp "$ROOT/supabase/config.toml.radar-backup.XXXXXX")"
cp "$CONFIG_PATH" "$BACKUP_PATH"
cat > "$CONFIG_PATH" <<EOF
project_id = "$PROJECT_REF"

[functions.waouh-radar-nearby]
verify_jwt = true
EOF

echo "[0/3] Liaison du projet Supabase : $PROJECT_REF"
echo "Saisissez le mot de passe de base de données Supabase si la CLI le demande."
"${SUPABASE[@]}" link --project-ref "$PROJECT_REF"

echo "[1/3] Application de la migration Radar : coordonnées exactes des annonces chat"
"${SUPABASE[@]}" db push --linked

echo "[2/3] Déploiement de waouh-radar-nearby"
"${SUPABASE[@]}" functions deploy waouh-radar-nearby --project-ref "$PROJECT_REF"

echo "[3/3] Vérification de la fonction déployée"
"${SUPABASE[@]}" functions list --project-ref "$PROJECT_REF"

echo
printf '%s\n' 'Réparation Radar terminée.'
printf '%s\n' 'Le script a restauré votre supabase/config.toml local.'
printf '%s\n' 'Ouvrez Radar, choisissez 100 km puis appuyez sur Scanner maintenant.'
