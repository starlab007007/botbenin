#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'lib/live/live_inbox_production.dart'
source = path.read_text(encoding='utf-8')

import_line = "import 'live_radar_service.dart';"
if "import 'radar_view.dart';" not in source:
    if import_line not in source:
        raise RuntimeError('Expected radar service import is missing.')
    source = source.replace(import_line, import_line + "\nimport 'radar_view.dart';", 1)

old = "2 => const _ProductionRadarFeed(),"
new = "2 => const RadarView(),"
if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise RuntimeError('Expected Radar tab route is missing.')
path.write_text(source, encoding='utf-8')

service = root / 'lib/live/live_radar_service.dart'
content = service.read_text(encoding='utf-8')
content = content.replace("id: _int(ringRaw['id']).clamp(1, 4),", "id: _int(ringRaw['id']).clamp(1, 4).toInt(),")
service.write_text(content, encoding='utf-8')

print('Backend Radar workspace activated.')
