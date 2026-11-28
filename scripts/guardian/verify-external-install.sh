#!/usr/bin/env bash
# Read-only local installation check, to be run on the authorized independent host.
set -euo pipefail
service=waouh-guardian-external.service
timer=waouh-guardian-external.timer
fail(){ echo "GUARDIAN: $1" >&2; exit 1; }
systemctl is-enabled --quiet "$timer" || fail 'timer not enabled'
systemctl is-active --quiet "$timer" || fail 'timer not active'
[[ "$(systemctl show "$timer" -p Unit --value)" == "$service" ]] || fail 'unexpected timer target'
[[ "$(systemctl show "$service" -p User --value)" == waouh-guardian-probe ]] || fail 'unexpected service user'
[[ "$(systemctl show "$service" -p Result --value)" == success ]] || fail 'last service invocation failed'
last="$(systemctl show "$service" -p ExecMainExitTimestampMonotonic --value)"
[[ "$last" =~ ^[0-9]+$ && "$last" != 0 ]] || fail 'no completed service invocation'
# Linux monotonic uptime and the systemd timestamp share the boot time origin.
uptime_us="$(python3 -c 'import time; print(int(time.clock_gettime(time.CLOCK_MONOTONIC)*1000000))')"
age=$(( (uptime_us-last)/1000000 ))
(( age >= 0 && age <= 900 )) || fail 'last completed invocation is stale'
next="$(systemctl show "$timer" -p NextElapseUSecMonotonic --value)"
[[ -n "$next" && "$next" != 0 && "$next" != n/a && "$next" != infinity ]] || fail 'next invocation not scheduled'
echo "GUARDIAN: timer enabled, active; last successful service completion ${age}s ago"
echo "GUARDIAN: independently confirm successive fresh external_monitor rows in Supabase"
