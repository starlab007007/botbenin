#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# 1. Use the canonical logo mark a little larger in the assistant card.
radar = ROOT / 'lib/live/live_inbox_production.dart'
r = radar.read_text(encoding='utf-8')
r = r.replace("const BrandMark(size: 48, semanticLabel: 'WAOUH IA')", "const BrandMark(size: 54, semanticLabel: 'WAOUH IA')")
radar.write_text(r, encoding='utf-8')

# 2. More precise audience targeting and clearer message step labels.
diff = ROOT / 'lib/live/live_broadcast_screen.dart'
s = diff.read_text(encoding='utf-8')
s = s.replace("title: 'Préparer le message',", "title: 'Message IA & aperçu live',")
s = s.replace("subtitle: 'Le message sera contrôlé par un administrateur avant envoi.',", "subtitle: 'Générez, modifiez et visualisez le message avant validation.',")
s = s.replace("'Mode & Beauté', 'Tech & Électronique', 'Auto & Moto', 'Immobilier', 'Alimentaire', 'Services',", "'Mode & Beauté', 'Parfums', 'Cosmétiques', 'Perruques', 'Chaussures', 'Tech & Électronique', 'Téléphones', 'Accessoires', 'Auto & Moto', 'Immobilier', 'Alimentaire', 'Boissons', 'Fruits', 'Services', 'Livraison', 'Réparation',")
# Add an IA suggestion button once, just before the editable message field.
needle = "TextField(controller: _message, minLines: 4, maxLines: 6, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(labelText: 'Message *', alignLabelWithHint: true)),"
insert = "SizedBox(width: double.infinity, child: OutlinedButton.icon(onPressed: () { final ville = _cities.isEmpty ? '{{ville}}' : _cities.first; final cible = _sectors.isEmpty ? '{{categorie_top}}' : _sectors.first; setState(() => _message.text = 'Bonjour {{display_name}} 👋\\nDécouvrez notre offre $cible disponible à $ville. Répondez OUI pour recevoir les détails.'); }, icon: const Icon(Icons.auto_awesome_rounded), label: const Text('Suggérer par IA'))),\n            const SizedBox(height: 12),\n            " + needle
if "Suggérer par IA" not in s:
    s = s.replace(needle, insert)
# Add a simple live preview after the media block if not present.
preview_marker = "Aperçu live du message"
if preview_marker not in s:
    s = s.replace("children: [TextField(controller: _mediaUrl, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'URL du média'))],", "children: [TextField(controller: _mediaUrl, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'URL photo, vidéo ou lien'))],")
    s = s.replace("),\n          ]),\n        ),\n      ]);", "),\n            const SizedBox(height: 14),\n            Container(width: double.infinity, padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFECE5DD), borderRadius: BorderRadius.circular(18)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Aperçu live du message', style: TextStyle(fontWeight: FontWeight.w900, color: WaouhPalette.deep)), const SizedBox(height: 10), Align(alignment: Alignment.centerLeft, child: Container(padding: const EdgeInsets.all(12), constraints: const BoxConstraints(maxWidth: 300), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [if (_mediaUrl.text.trim().isNotEmpty) ...[Container(height: 92, decoration: BoxDecoration(color: const Color(0xFFEAF4EF), borderRadius: BorderRadius.circular(10)), child: const Center(child: Icon(Icons.perm_media_outlined, color: WaouhPalette.jade))), const SizedBox(height: 8)], Text(_message.text.trim().isEmpty ? 'Votre message apparaîtra ici...' : _message.text), const SizedBox(height: 6), const Align(alignment: Alignment.bottomRight, child: Text('11:25 ✓✓', style: TextStyle(fontSize: 10.5, color: WaouhPalette.muted)))]))) ])),\n          ]),\n        ),\n      ]);")
diff.write_text(s, encoding='utf-8')

print('Final UI options applied')
