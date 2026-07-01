#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v supabase >/dev/null || {
  echo "Supabase CLI absente. Installez-la puis reconnectez-vous avant le déploiement." >&2
  exit 1
}

test -f supabase/functions/waouh-radar-nearby/index.ts || {
  echo "Fonction waouh-radar-nearby introuvable." >&2
  exit 1
}

supabase functions deploy waouh-radar-nearby

echo "Backend Radar déployé. Le Flutter utilisera waouh-radar-nearby au prochain scan."
