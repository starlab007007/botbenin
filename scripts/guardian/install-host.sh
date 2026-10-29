#!/bin/sh
set -eu
ROOT=/home/debian/waouh-guardian
SOURCE=$1
command -v python3 >/dev/null
command -v crontab >/dev/null
command -v flock >/dev/null
mkdir -p "$ROOT"
chmod 700 "$ROOT"
exec 8>"$ROOT/agent.lock"
flock -x 8
install -m 600 "$SOURCE/guardian-config.json" "$ROOT/config.json"
install -m 700 "$SOURCE/scripts/guardian/agent.py" "$ROOT/agent.py"
rm -f "$SOURCE/guardian-config.json"
EXISTING=$(crontab -l 2>/dev/null || true)
{ printf '%s\n' "$EXISTING" | sed '/# waouh-guardian$/d'; printf '%s\n' '* * * * * /usr/bin/python3 /home/debian/waouh-guardian/agent.py >/dev/null 2>&1 # waouh-guardian'; } | crontab -
flock -u 8
/usr/bin/python3 "$ROOT/agent.py"
echo 'GUARDIAN host observer installed'
