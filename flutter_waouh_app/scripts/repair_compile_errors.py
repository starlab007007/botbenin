#!/usr/bin/env python3
"""Repair known Flutter SDK and syntax blockers in the native test branch.

The edits are idempotent and deliberately limited to the files reported by
flutter analyze. Run before analysis, tests or the test APK build.
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
    if not count:
        return False
    path.write_text(updated, encoding="utf-8")
    return True


changed: list[str] = []

main = ROOT / "lib/main.dart"
if replace_all(main, "cardTheme: CardTheme(", "cardTheme: CardThemeData("):
    changed.append(main.name)

for filename in ("live_chat_screens.dart", "live_match_chat_v2.dart"):
    path = ROOT / "lib/live" / filename
    if replace_all(path, ".inSeconds.abs < 120", ".inSeconds.abs() < 120"):
        changed.append(filename)

radar = ROOT / "lib/live/live_radar_screen.dart"
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

fixed_session_and_metrics = '''class _SessionSummary extends StatelessWidget {
  const _SessionSummary({required this.items});

  final List<LiveDiffusionSession> items;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const _Info(
            title: 'Sessions WhatsApp',
            body: 'Une session WORKING doit être active pour les campagnes classiques.',
            icon: Icons.phone_android_rounded,
          ),
          const SizedBox(height: 14),
          if (items.isEmpty)
            const _Empty(
              title: 'Aucune session',
              body: 'Connectez votre compte dans IA.',
              icon: Icons.qr_code_rounded,
            )
          else
            ...items.map(
              (item) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(
                    Icons.phone_iphone_rounded,
                    color: item.active ? WaouhPalette.jade : WaouhPalette.orange,
                  ),
                  title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.w900)),
                  subtitle: Text(item.phone ?? 'QR à connecter'),
                  trailing: _Tag(value: item.status),
                ),
              ),
            ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => context.go('/app/whatsapp'),
            icon: const Icon(Icons.qr_code_rounded),
            label: const Text('Gérer dans IA'),
          ),
        ],
      );
}

class _Metrics extends StatelessWidget {
  const _Metrics({required this.items});

  final List<LiveDiffusionCampaign> items;

  @override
  Widget build(BuildContext context) {
    final values = <(String, int)>[
      ('Planifiés', items.fold(0, (sum, item) => sum + item.total)),
      ('Envoyés', items.fold(0, (sum, item) => sum + item.sent)),
      ('Livrés', items.fold(0, (sum, item) => sum + item.delivered)),
      ('Lus', items.fold(0, (sum, item) => sum + item.read)),
      ('Réponses', items.fold(0, (sum, item) => sum + item.replied)),
    ];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GridView.count(
          shrinkWrap: true,
          crossAxisCount: 2,
          childAspectRatio: 1.9,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          physics: const NeverScrollableScrollPhysics(),
          children: values
              .map(
                (item) => Card(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('${item.$2}', style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
                        Text(item.$1, style: const TextStyle(fontSize: 12, color: WaouhPalette.muted)),
                      ],
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

class _Card extends StatelessWidget'''
if replace_regex(
    broadcast,
    r"class _SessionSummary extends StatelessWidget\s*\{.*?class _Card extends StatelessWidget",
    fixed_session_and_metrics,
):
    changed.append(broadcast.name)

print("Flutter source repair completed: " + (", ".join(dict.fromkeys(changed)) if changed else "already clean"))
