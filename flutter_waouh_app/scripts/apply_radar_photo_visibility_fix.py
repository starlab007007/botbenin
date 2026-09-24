#!/usr/bin/env python3
"""Keep the Radar visual grid photo-first.

The card fallback is intentionally retained for users who manually disable the
photo filter, but the normal Radar entry point must not request listings with
no photo. This script is idempotent and safe to run before an APK build.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "lib/live/radar_view.dart"
source = path.read_text(encoding="utf-8")

old = """  LiveRadarFilters _filters = const LiveRadarFilters(
    photoOnly: false,
    autoPauseMs: null,
  );"""
new = """  // The normal Radar experience is visual: no photo URL means no card.
  // Users can still disable this filter explicitly from Radar filters.
  LiveRadarFilters _filters = const LiveRadarFilters(
    photoOnly: true,
    autoPauseMs: null,
  );"""

if old in source:
    source = source.replace(old, new, 1)
elif "photoOnly: true," not in source:
    raise SystemExit("Radar photo filter anchor not found; no change was made.")

path.write_text(source, encoding="utf-8")
print("Radar photo-first filter applied.")
