#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-mvynepqulhflxtyymtzs}"
ROOT="$(pwd)"
TMP_DIR="$(mktemp -d /tmp/waouh-edge-deploy.XXXXXX)"

if [ ! -d "$ROOT/supabase/functions/waouh-history" ]; then
  echo "Fonction locale manquante: supabase/functions/waouh-history" >&2
  exit 1
fi

if [ ! -d "$ROOT/supabase/functions/waouh-channel-in-secure" ]; then
  echo "Fonction locale manquante: supabase/functions/waouh-channel-in-secure" >&2
  exit 1
fi

mkdir -p "$TMP_DIR/supabase/functions"
cp -R "$ROOT/supabase/functions/_shared" "$TMP_DIR/supabase/functions/_shared"
cp -R "$ROOT/supabase/functions/waouh-history" "$TMP_DIR/supabase/functions/waouh-history"
cp -R "$ROOT/supabase/functions/waouh-channel-in-secure" "$TMP_DIR/supabase/functions/waouh-channel-in-secure"

cat > "$TMP_DIR/supabase/config.toml" <<TOML
project_id = "$PROJECT_REF"

[functions.waouh-history]
verify_jwt = false

[functions.waouh-channel-in-secure]
verify_jwt = false
TOML

echo "WAOUH Edge deploy minimal - Projet: $PROJECT_REF"

cd "$TMP_DIR"
supabase functions deploy waouh-history --project-ref "$PROJECT_REF" --no-verify-jwt
supabase functions deploy waouh-channel-in-secure --project-ref "$PROJECT_REF" --no-verify-jwt

supabase functions list --project-ref "$PROJECT_REF" | grep -E "waouh-history|waouh-channel-in-secure|waouh-channel-in" || true
