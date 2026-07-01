#!/usr/bin/env python3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / 'lib/live/radar_view.dart'
source = path.read_text(encoding='utf-8')

if "import 'radar_item_sheet.dart';" not in source:
    source = source.replace("import 'radar_hero.dart';", "import 'radar_hero.dart';\nimport 'radar_item_sheet.dart';")

source = source.replace('duration: const Duration(seconds: 4),', 'duration: const Duration(seconds: 9),')
source = source.replace('    super.initState();\n    WidgetsBinding.instance.addPostFrameCallback', '    super.initState();\n    _sweep.repeat();\n    WidgetsBinding.instance.addPostFrameCallback')
source = source.replace('    _sweep.repeat();\n    try {', '    try {')
source = source.replace('      _sweep.stop();\n      _sweep.value = 0;\n', '')
source = source.replace('showRadarItemSheet(context, item)', 'showRadarProductSheet(context, item)')
source = source.replace('RadarItemAction.negotiate', 'RadarProductAction.negotiate')
source = source.replace("action == RadarProductAction.negotiate\n          ? 'Je souhaite négocier « ${item.title} » à ${item.distanceLabel}.'\n          : 'Je suis intéressé par « ${item.title} » à ${item.distanceLabel}.'", "switch (action) {\n        RadarProductAction.interested => 'Je suis intéressé par « ${item.title} » à ${item.distanceLabel}.',\n        RadarProductAction.negotiate => 'Je souhaite négocier « ${item.title} » à ${item.distanceLabel}.',\n        RadarProductAction.contact => 'Je souhaite contacter le vendeur pour « ${item.title} ».',\n      }")
source = source.replace("'title': item.title,\n      },", "'title': item.title,\n        'radar_action': action.name,\n      },")
path.write_text(source, encoding='utf-8')
print('Radar interaction polish applied.')
