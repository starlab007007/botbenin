#!/usr/bin/env bash
# Run on an independent observer host, never on the monitored VPS.
set -euo pipefail
umask 077
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
config="${1:?Path to private external observer config required}"
if [[ ! -f "$config" || -L "$config" || ! -r "$config" || "$(stat -c '%a' -- "$config")" != 600 ]]; then
  echo 'GUARDIAN external: private observer configuration unavailable' >&2
  exit 1
fi
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
# A failed browser probe must never manufacture a healthy observation.
node browser.mjs "$work/render.json"
test -s "$work/render.json"
python3 external.py "$config" "$work/render.json"
