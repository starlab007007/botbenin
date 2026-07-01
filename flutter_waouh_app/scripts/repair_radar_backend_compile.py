#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'lib/live/live_radar_service.dart'
source = path.read_text(encoding='utf-8')
source = source.replace("id: _int(ringRaw['id']).clamp(1, 4),", "id: _int(ringRaw['id']).clamp(1, 4).toInt(),")
path.write_text(source, encoding='utf-8')
print('Radar backend compile repair completed.')
