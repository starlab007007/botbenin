#!/usr/bin/env python3
"""Repair the known Flutter SDK and syntax blockers in the native test branch.

The edits are idempotent and deliberately limited to the files reported by
flutter analyze. Run this script before analysis, tests or the test APK build.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_all(path: Path, old: str, new: str) -> bool:
    source = path.read_text(encoding="utf-8")
    updated = source.replace(old, new)
    if updated == source:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


def replace_regex(path: Path, pattern: str, replacement: str) -> bool:
    source = path.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


changed = []

main = ROOT / "lib/main.dart"
if replace_all(main, "cardTheme: CardTheme(", "cardTheme: CardThemeData("):
    changed.append(main.name)

for filename in ("live_chat_screens.dart", "live_match_chat_v2.dart"):
    path = ROOT / "lib/live" / filename
    if replace_all(path, ".inSeconds.abs < 120", ".inSeconds.abs() < 120"):
        changed.append(filename)

radar = ROOT / "lib/live/live_radar_screen.dart"
# The Positioned widget in _RadarItemCard misses its final closing parenthesis.
if replace_regex(
    radar,
    r"fontWeight: FontWeight\.w800\)\)\),\s*\n\s*\]\)\),",
    "fontWeight: FontWeight.w800)))),\n             ])),",
):
    changed.append(radar.name)

broadcast = ROOT / "lib/live/live_broadcast_screen.dart"
fixed_contact = '''class _ContactSummary extends StatelessWidget {
  const _ContactSummary({required this.items, required this.data, required this.done});

  final List<LiveDiffusionContact> items;
  final LiveDiffusionData data;
  final VoidCallback done;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _Info(
            title: 'Gestion du consentement',
            body: 'Les contacts désinscrits ou archivés sont exclus par le backend.',
            icon: Icons.lock_outline_rounded,
          ),
          const SizedBox(height: 14),
          if (items.isEmpty)
            const _Empty(
              title: 'Aucun contact',
              body: 'Ajoutez un contact depuis le bouton + dans ce module.',
              icon: Icons.people_outline_rounded,
            )
          else
            ...items.map(
              (item) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    child: Icon(item.optOut ? Icons.block_rounded : Icons.person_outline_rounded),
                  ),
                  title: Text(item.name?.isNotEmpty == true ? item.name! : item.phoneE164),
                  subtitle: Text(item.optOut ? '${item.phoneE164} · désinscrit' : item.phoneE164),
                  trailing: IconButton(
                    onPressed: () async {
                      await data.updateContact(item.id, optOut: !item.optOut);
                      done();
                    },
                    icon: Icon(item.optOut ? Icons.check_circle_outline_rounded : Icons.block_rounded),
                  ),
                ),
              ),
            ),
        ],
      );
}

class _SessionSummary extends StatelessWidget'''
if replace_regex(
    broadcast,
    r"class _ContactSummary extends StatelessWidget\s*\{.*?class _SessionSummary extends StatelessWidget",
    fixed_contact,
):
    changed.append(broadcast.name)

print("Flutter source repair completed: " + (", ".join(changed) if changed else "already clean"))
