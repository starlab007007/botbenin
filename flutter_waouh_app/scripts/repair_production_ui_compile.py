#!/usr/bin/env python3
"""Repair the four malformed widget blocks in the production UI workspace.

This script is idempotent. It replaces only the affected widget classes in
live_inbox_production.dart, preserving the surrounding production UI code.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "lib/live/live_inbox_production.dart"


def replace_class(source: str, start: str, end: str, replacement: str) -> str:
    pattern = rf"class {re.escape(start)}.*?(?=class {re.escape(end)})"
    updated, count = re.subn(pattern, replacement.rstrip() + "\n\n", source, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {start} block before {end}; found {count}.")
    return updated


source = TARGET.read_text(encoding="utf-8")

match_tile = r'''class _MatchTile extends StatelessWidget {
  const _MatchTile({required this.match, required this.archived});

  final LiveMatch match;
  final bool archived;

  @override
  Widget build(BuildContext context) {
    final controller = context.read<LiveWaouhController>();
    final unread = archived ? 0 : match.unreadCount;
    return Card(
      margin: const EdgeInsets.only(bottom: 9),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () async {
          await controller.markMatchRead(match);
          if (context.mounted) {
            context.go('/app/chat/match/${Uri.encodeComponent(match.key)}', extra: match);
          }
        },
        child: Padding(
          padding: const EdgeInsets.fromLTRB(11, 10, 8, 10),
          child: Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(13),
                    child: SizedBox(
                      width: 56,
                      height: 56,
                      child: _RemoteImage(url: match.photo, fallback: Icons.shopping_bag_outlined),
                    ),
                  ),
                  if (unread > 0)
                    Positioned(
                      top: -6,
                      right: -6,
                      child: _CountBubble(value: unread, small: true),
                    ),
                ],
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            match.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontWeight: FontWeight.w900,
                              color: unread > 0 ? const Color(0xFF10211B) : null,
                            ),
                          ),
                        ),
                        if (unread > 0)
                          const Padding(
                            padding: EdgeInsets.only(left: 5),
                            child: Icon(Icons.circle, size: 9, color: Color(0xFF22C98B)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      match.role == 'seller' ? 'Acheteur intéressé' : 'Nouvelle annonce correspondante',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Color(0xFF667A73), fontSize: 12.5),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _compactTime(match.lastAt),
                      style: const TextStyle(color: Color(0xFF667A73), fontSize: 11.5, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: archived ? 'Restaurer' : 'Archiver',
                onPressed: () => controller.archiveMatch(match, !archived),
                icon: Icon(
                  archived ? Icons.unarchive_outlined : Icons.archive_outlined,
                  color: const Color(0xFF667A73),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}'''

radar_scope_state = r'''class _RadarScopeState extends State<_RadarScope> with SingleTickerProviderStateMixin {
  late final AnimationController _animation = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 5),
  )..repeat();

  @override
  void dispose() {
    _animation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (_, constraints) {
          final side = math.min(constraints.maxWidth, 330.0);
          final center = side / 2;
          final radius = center - 13;
          return Center(
            child: SizedBox(
              width: side,
              height: side,
              child: Stack(
                children: [
                  CustomPaint(
                    size: Size.square(side),
                    painter: _RadarPainter(
                      animation: _animation,
                      maxRadiusKm: widget.maxRadiusKm,
                      active: widget.active,
                    ),
                  ),
                  ...widget.items.take(24).map((item) {
                    final ratio = math.sqrt((item.distanceKm / widget.maxRadiusKm).clamp(0.0, 1.0));
                    final pointRadius = math.max(27.0, radius * ratio);
                    final angle = (item.bearing - 90) * math.pi / 180;
                    final x = center + pointRadius * math.cos(angle);
                    final y = center + pointRadius * math.sin(angle);
                    return Positioned(
                      left: x - 20,
                      top: y - 20,
                      child: _RadarNode(item: item, onTap: () => widget.onTap(item)),
                    );
                  }),
                  Positioned(
                    bottom: 14,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(99),
                          border: Border.all(color: const Color(0xFFD8E5DF)),
                        ),
                        child: Text(
                          widget.active ? 'Analyse autour de vous' : 'Résultats enregistrés',
                          style: const TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF075E54),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
}'''

radar_result_card = r'''class _RadarResultCard extends StatelessWidget {
  const _RadarResultCard({required this.item, required this.onTap});

  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _RemoteImage(
                      url: item.photoUrl,
                      fallback: item.type == LiveRadarItemType.status
                          ? Icons.auto_awesome_rounded
                          : Icons.shopping_bag_outlined,
                    ),
                    Positioned(
                      left: 7,
                      top: 7,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: Color(item.ring.colorValue),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          item.distanceLabel,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 7,
                      bottom: 7,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xBF10211B),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          item.typeLabel,
                          style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(9, 8, 9, 9),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.priceLabel.isEmpty ? (item.city ?? 'À proximité') : item.priceLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF08756A)),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}'''

sheet_meta = r'''class _SheetMeta extends StatelessWidget {
  const _SheetMeta({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF667A73)),
          const SizedBox(width: 4),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 210),
            child: Text(
              text,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11.5, color: Color(0xFF667A73)),
            ),
          ),
        ],
      );
}'''

source = replace_class(source, "_MatchTile extends StatelessWidget", "_ConversationTile extends StatelessWidget", match_tile)
source = replace_class(source, "_RadarScopeState extends State<_RadarScope> with SingleTickerProviderStateMixin", "_RadarPainter extends CustomPainter", radar_scope_state)
source = replace_class(source, "_RadarResultCard extends StatelessWidget", "_RadarEmpty extends StatelessWidget", radar_result_card)
source = replace_class(source, "_SheetMeta extends StatelessWidget", "_RadarFiltersSheet extends StatefulWidget", sheet_meta)

TARGET.write_text(source, encoding="utf-8")
print("Production UI syntax repair completed.")
