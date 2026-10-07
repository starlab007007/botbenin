#!/usr/bin/env python3
"""Reject drift between the Web, Flutter and Supabase release manifests."""
import json
from pathlib import Path
import re
import tomllib

root = Path(__file__).resolve().parents[1]
paths = ["public/waouh-release.json", "flutter_waouh_app/assets/waouh-release.json", "supabase/functions/_shared/waouh-release.json"]
release = json.loads((root / paths[0]).read_text())
for path in paths[1:]:
    if json.loads((root / path).read_text()) != release:
        raise SystemExit(f"Release drift: {path}")
pubspec = (root / "flutter_waouh_app/pubspec.yaml").read_text()
version = re.search(r"^version: (.+)$", pubspec, re.M).group(1)
if version != release["release_id"]:
    raise SystemExit("Flutter version differs from the release manifest")
config = tomllib.loads((root / "supabase/config.toml").read_text())
if config["project_id"] != release["project_ref"]:
    raise SystemExit("Supabase project differs from the release manifest")
if f"flutter={version}" not in (root / "public/waouh-ui-version.txt").read_text():
    raise SystemExit("Web version marker differs from Flutter")
for source in release["runtime_aliases"].values():
    if not (root / "supabase/functions" / source / "index.ts").is_file():
        raise SystemExit(f"Missing canonical runtime: {source}")
print(f"WAOUH release aligned: {version} / {release['branch']} / {release['project_ref']}")
