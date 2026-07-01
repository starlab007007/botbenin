#!/usr/bin/env python3
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'lib/live/live_broadcast_screen.dart'
s = path.read_text(encoding='utf-8')
s = s.replace("title: 'Préparer le message',", "title: 'Message IA & aperçu live',")
s = s.replace("subtitle: 'Le message sera contrôlé par un administrateur avant envoi.',", "subtitle: 'Générez, modifiez et visualisez le message avant validation.',")
path.write_text(s, encoding='utf-8')
print('done')
