#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
model = root / 'lib/live/live_radar_models.dart'
view = root / 'lib/live/radar_view.dart'
filters = root / 'lib/live/radar_filters.dart'

s = model.read_text(encoding='utf-8')
s = s.replace('    this.urgent = false,\n    this.autoPauseMs = 90000,', '    this.urgent = false,\n    this.radiusKm,\n    this.autoPauseMs = 90000,')
s = s.replace('  final bool urgent;\n  final int? autoPauseMs;', '  final bool urgent;\n  final int? radiusKm;\n  final int? autoPauseMs;')
s = s.replace('  int get maxRadiusKm => urgent ? 5 : liveRadarRings.last.maxKm.toInt();', '  int get maxRadiusKm => radiusKm ?? (urgent ? 5 : liveRadarRings.last.maxKm.toInt());')
s = s.replace('    bool? urgent,\n    int? autoPauseMs,', '    bool? urgent,\n    int? radiusKm,\n    bool clearRadiusKm = false,\n    int? autoPauseMs,')
s = s.replace('        urgent: urgent ?? this.urgent,\n        autoPauseMs:', '        urgent: urgent ?? this.urgent,\n        radiusKm: clearRadiusKm ? null : (radiusKm ?? this.radiusKm),\n        autoPauseMs:')
s = s.replace("        'urgent': urgent,\n        'auto_pause_ms': autoPauseMs,", "        'urgent': urgent,\n        'radius_km': radiusKm,\n        'auto_pause_ms': autoPauseMs,")
s = s.replace("        urgent: row['urgent'] == true,\n        autoPauseMs:", "        urgent: row['urgent'] == true,\n        radiusKm: _intOrNull(row['radius_km']),\n        autoPauseMs:")
model.write_text(s, encoding='utf-8')

s = filters.read_text(encoding='utf-8')
s = s.replace('                      urgent: _radius == 5,\n                      autoPauseMs:', '                      urgent: _radius == 5,\n                      radiusKm: _radius,\n                      autoPauseMs:')
filters.write_text(s, encoding='utf-8')

s = view.read_text(encoding='utf-8')
s = s.replace('setState(() => _filters = _filters.copyWith(urgent: !_filters.urgent));', 'setState(() => _filters = _filters.copyWith(urgent: !_filters.urgent, radiusKm: _filters.urgent ? 20 : 5));')
view.write_text(s, encoding='utf-8')

print('Explicit Radar radius support activated.')
