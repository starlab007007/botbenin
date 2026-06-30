#!/usr/bin/env python3
"""Apply narrowly scoped source repairs after a Flutter SDK API update.

The script is idempotent. It refuses to silently patch an unexpected source shape.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count == 0:
        return
    if count != 1:
        raise RuntimeError(f"{path}: expected one occurrence of {old!r}, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    ROOT / "lib/main.dart",
    "cardTheme: CardTheme(",
    "cardTheme: CardThemeData(",
)

replace_once(
    ROOT / "lib/live/live_match_chat_v2.dart",
    "item.createdAt.difference(local.createdAt).inSeconds.abs < 120",
    "item.createdAt.difference(local.createdAt).inSeconds.abs() < 120",
)

replace_once(
    ROOT / "lib/live/live_radar_screen.dart",
    "fontWeight: FontWeight.w800))),\n             ])),",
    "fontWeight: FontWeight.w800)))),\n             ])),",
)

broadcast = ROOT / "lib/live/live_broadcast_screen.dart"
broadcast_text = broadcast.read_text(encoding="utf-8")
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

pattern = r"class _ContactSummary extends StatelessWidget \{.*?class _SessionSummary extends StatelessWidget"
if re.search(pattern, broadcast_text, flags=re.S):
    broadcast.write_text(re.sub(pattern, fixed_contact, broadcast_text, count=1, flags=re.S), encoding="utf-8")

print("Flutter source repair completed.")
