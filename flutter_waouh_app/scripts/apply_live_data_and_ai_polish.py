#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


# --- Radar: keep the live visual scan, show the first 10 real results, then expand.
radar = ROOT / "lib/live/radar_view.dart"
s = radar.read_text(encoding="utf-8")
if "import 'radar_item_sheet.dart';" not in s:
    s = s.replace("import 'radar_hero.dart';", "import 'radar_hero.dart';\nimport 'radar_item_sheet.dart';")
s = s.replace("duration: const Duration(seconds: 4),", "duration: const Duration(seconds: 9),")
s = s.replace(
    "    super.initState();\n    WidgetsBinding.instance.addPostFrameCallback",
    "    super.initState();\n    _sweep.repeat();\n    WidgetsBinding.instance.addPostFrameCallback",
)
s = s.replace("    _sweep.repeat();\n    try {", "    try {")
s = s.replace("      _sweep.stop();\n      _sweep.value = 0;\n", "")
s = s.replace("showRadarItemSheet(context, item)", "showRadarProductSheet(context, item)")
s = s.replace("RadarItemAction.", "RadarProductAction.")
if "bool _showAllResults" not in s:
    s = s.replace("  bool _loading = false;", "  bool _loading = false;\n  bool _showAllResults = false;")
s = s.replace(
    "if (mounted) setState(() => _snapshot = value);",
    "if (mounted) setState(() { _snapshot = value; _showAllResults = false; });",
)
s = s.replace(
    "    final items = snapshot?.items ?? const <LiveRadarItem>[];\n    return RefreshIndicator(",
    "    final items = snapshot?.items ?? const <LiveRadarItem>[];\n"
    "    final displayedItems = _showAllResults ? items : items.take(10).toList();\n"
    "    return RefreshIndicator(",
)
s = s.replace("            items: items,\n            radiusKm:", "            items: displayedItems,\n            radiusKm:", 1)
old_results = """          else\n            RadarResults(items: items, onTap: _openItem),"""
new_results = """          else ...[\n            RadarResults(items: displayedItems, onTap: _openItem),\n            if (items.length > 10)\n              Padding(\n                padding: const EdgeInsets.only(top: 14),\n                child: Center(\n                  child: OutlinedButton.icon(\n                    onPressed: () => setState(() => _showAllResults = !_showAllResults),\n                    icon: Icon(_showAllResults ? Icons.expand_less_rounded : Icons.expand_more_rounded),\n                    label: Text(_showAllResults ? 'Réduire les résultats' : 'Voir plus (${items.length - 10})'),\n                  ),\n                ),\n              ),\n          ],"""
s = s.replace(old_results, new_results)
# Make the contact action semantically distinct, not a generic interest message.
seed_pattern = re.compile(
    r"controller\.setComposerSeed\(\s*action == RadarProductAction\.negotiate\s*\?\s*'Je souhaite négocier « \$\{item\.title\} » à \$\{item\.distanceLabel\}\.'\s*:\s*'Je suis intéressé par « \$\{item\.title\} » à \$\{item\.distanceLabel\}\.',\s*meta:",
    flags=re.S,
)
seed_replacement = """final seed = switch (action) {\n      RadarProductAction.interested => 'Je suis intéressé par « ${item.title} » à ${item.distanceLabel}.',\n      RadarProductAction.negotiate => 'Je souhaite négocier « ${item.title} » à ${item.distanceLabel}.',\n      RadarProductAction.contact => 'Je souhaite contacter le vendeur pour « ${item.title} ».',\n    };\n    controller.setComposerSeed(\n      seed,\n      meta:"""
s = seed_pattern.sub(seed_replacement, s, count=1)
s = s.replace("        'title': item.title,\n      },", "        'title': item.title,\n        'radar_action': action.name,\n      },")
write(radar, s)

# --- Inbox: simplify the assistant wording and put presence beneath WAOUH.
inbox = ROOT / "lib/live/live_inbox_production.dart"
s = inbox.read_text(encoding="utf-8")
assistant_pattern = re.compile(
    r"Row\(children: const \[\s*Text\('WAOUH',\s*style: TextStyle\(\s*fontSize: 20, fontWeight: FontWeight\.w900\)\),\s*SizedBox\(width: 6\),\s*_OnlineDot\(\),\s*SizedBox\(width: 5\),\s*Text\('En ligne',\s*style: TextStyle\(\s*color: Color\(0xFF08756A\),\s*fontWeight: FontWeight\.w900,\s*fontSize: 12\.5\)\),\s*\]\),\s*const SizedBox\(height: 2\),\s*const Text\('Assistant IA pour acheter, vendre et négocier\.',\s*maxLines: 2,\s*style: TextStyle\(\s*color: Color\(0xFF667A73\),\s*fontSize: 12\.5,\s*height: 1\.25,\s*fontWeight: FontWeight\.w600\)\),",
    flags=re.S,
)
assistant_replacement = """const Text('WAOUH',\n                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),\n                  const SizedBox(height: 4),\n                  Row(mainAxisSize: MainAxisSize.min, children: const [\n                    _OnlineDot(),\n                    SizedBox(width: 5),\n                    Text('En ligne',\n                        style: TextStyle(\n                            color: Color(0xFF08756A),\n                            fontWeight: FontWeight.w900,\n                            fontSize: 12.5)),\n                  ]),\n                  const SizedBox(height: 7),\n                  const Text('Assistant IA',\n                      maxLines: 1,\n                      style: TextStyle(\n                          color: Color(0xFF667A73),\n                          fontSize: 12.5,\n                          height: 1.25,\n                          fontWeight: FontWeight.w700)),"""
s = assistant_pattern.sub(assistant_replacement, s, count=1)
s = s.replace("Assistant IA pour acheter, vendre et négocier.", "Assistant IA")
write(inbox, s)

# --- Diffusion: actual Gemini call from the existing data service and protected samples.
broadcast = ROOT / "lib/live/live_broadcast_screen.dart"
s = broadcast.read_text(encoding="utf-8")
if "bool _suggesting = false;" not in s:
    s = s.replace("  bool _busy = false;", "  bool _busy = false;\n  bool _suggesting = false;")

if "Future<void> _suggestMessage() async" not in s:
    ai_method = r'''
  Future<void> _suggestMessage() async {
    if (_suggesting) return;
    if (_preview == null) {
      await _previewAudience();
      if (!mounted || _preview == null || _preview!.total <= 0) return;
    }
    setState(() => _suggesting = true);
    try {
      final sector = _sectors.isEmpty ? '{{categorie_top}}' : _sectors.first;
      final cities = _cities.toList();
      final suggestions = await widget.data.suggestMessages(
        offerName: _name.text.trim(),
        sector: sector,
        subcategories: const [],
        cities: cities,
        tone: 'Convivial',
        objective: 'Lancement',
      );
      if (!mounted) return;
      final message = suggestions.isEmpty
          ? 'Bonjour {{display_name}} 👋\nDécouvrez notre offre {{categorie_top}} disponible à {{ville}}. Répondez OUI pour recevoir les détails.'
          : suggestions.first;
      setState(() {
        _message.text = message;
        if (_name.text.trim().isEmpty) {
          final city = cities.isEmpty ? 'votre zone' : cities.first;
          _name.text = 'Diffusion $sector · $city';
        }
      });
      _notice('Proposition IA générée. Vous pouvez encore la modifier avant validation.', success: true);
    } catch (error) {
      if (mounted) _notice(error.toString());
    } finally {
      if (mounted) setState(() => _suggesting = false);
    }
  }

'''
    s = s.replace("  Future<void> _submit() async {", ai_method + "  Future<void> _submit() async {")

# Remove the earlier local-only suggestion button injected by a previous build script.
s = re.sub(
    r"SizedBox\(width: double\.infinity, child: OutlinedButton\.icon\(onPressed: \(\) \{.*?label: const Text\('Suggérer par IA'\)\)\),\s*const SizedBox\(height: 12\),\s*",
    "",
    s,
    count=1,
    flags=re.S,
)
s = s.replace("title: 'Préparer le message',", "title: 'Message IA & aperçu live',")
s = s.replace(
    "subtitle: 'Le message sera contrôlé par un administrateur avant envoi.',",
    "subtitle: 'Générez, adaptez et contrôlez votre message avant validation.',",
)
message_field = "TextField(controller: _message, minLines: 4, maxLines: 6, textCapitalization: TextCapitalization.sentences, decoration: const InputDecoration(labelText: 'Message *', alignLabelWithHint: true)),"
ai_button_and_field = """SizedBox(\n              width: double.infinity,\n              child: OutlinedButton.icon(\n                onPressed: _suggesting ? null : _suggestMessage,\n                icon: _suggesting\n                    ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2))\n                    : const Icon(Icons.auto_awesome_rounded),\n                label: Text(_suggesting ? 'Génération IA…' : 'Suggérer par IA'),\n                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),\n              ),\n            ),\n            const SizedBox(height: 12),\n            TextField(\n              controller: _message,\n              onChanged: (_) => setState(() {}),\n              minLines: 4,\n              maxLines: 6,\n              textCapitalization: TextCapitalization.sentences,\n              decoration: const InputDecoration(labelText: 'Message *', alignLabelWithHint: true),\n            ),"""
if message_field in s:
    s = s.replace(message_field, ai_button_and_field, 1)

s = s.replace("subtitle: const Text('Ajoutez une URL image ou vidéo si nécessaire.', style: TextStyle(fontSize: 11.5)),", "subtitle: const Text('Ajoutez une URL photo, vidéo ou lien si nécessaire.', style: TextStyle(fontSize: 11.5)),")
s = s.replace("decoration: const InputDecoration(labelText: 'URL du média')", "decoration: const InputDecoration(labelText: 'URL photo, vidéo ou lien')")

old_sample = """if (preview.sample.isNotEmpty) ...[\n            const SizedBox(height: 12),\n            Text('Exemple masqué : ${preview.sample.first['phone_masked'] ?? '—'}', style: const TextStyle(fontSize: 11.5, color: WaouhPalette.muted, fontWeight: FontWeight.w700)),\n          ],"""
new_sample = """if (preview.sample.isNotEmpty) ...[\n            const SizedBox(height: 12),\n            const Text('Numéros trouvés · aperçus protégés', style: TextStyle(fontSize: 11.5, color: WaouhPalette.muted, fontWeight: FontWeight.w800)),\n            const SizedBox(height: 7),\n            Wrap(\n              spacing: 7,\n              runSpacing: 7,\n              children: preview.sample.take(5).map((item) {\n                final masked = '${item['phone_masked'] ?? ''}'.trim();\n                if (masked.isEmpty) return const SizedBox.shrink();\n                return Container(\n                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),\n                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(99), border: Border.all(color: const Color(0xFFC9E8DB))),\n                  child: Text(masked, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: WaouhPalette.jade)),\n                );\n              }).toList(),\n            ),\n          ],"""
s = s.replace(old_sample, new_sample)
write(broadcast, s)

print('Live Radar data and Gemini diffusion UX polish applied.')
