import 'package:flutter/material.dart';

import 'live_radar_models.dart';

enum RadarProductAction { interested, negotiate, contact }

Future<RadarProductAction?> showRadarProductSheet(
  BuildContext context,
  LiveRadarItem item,
) => showModalBottomSheet<RadarProductAction>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RadarProductSheet(item: item),
    );

class _RadarProductSheet extends StatelessWidget {
  const _RadarProductSheet({required this.item});
  final LiveRadarItem item;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .86),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 11, 18, 22),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Center(
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: const Color(0xFFC9D8D2),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              _Header(item: item),
              const SizedBox(height: 16),
              const Divider(height: 1, color: Color(0xFFE1EAE6)),
              const SizedBox(height: 16),
              _Actions(item: item),
            ]),
          ),
        ),
      );
}

class _Header extends StatelessWidget {
  const _Header({required this.item});
  final LiveRadarItem item;

  @override
  Widget build(BuildContext context) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(width: 96, height: 96, child: _ProductImage(item: item)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(
                item.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, height: 1.12),
              ),
              if (item.priceLabel.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  item.priceLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 19, color: Color(0xFF08756A), fontWeight: FontWeight.w900),
                ),
              ],
              const SizedBox(height: 8),
              Row(children: [
                const Icon(Icons.location_on_outlined, size: 18, color: Color(0xFF667A73)),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    '${item.city ?? 'À proximité'} · ${item.distanceLabel}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Color(0xFF667A73), fontSize: 13.5, fontWeight: FontWeight.w700),
                  ),
                ),
              ]),
            ]),
          ),
        ],
      );
}

class _Actions extends StatelessWidget {
  const _Actions({required this.item});
  final LiveRadarItem item;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (_, constraints) {
          final interested = _ActionButton.outline(
            icon: Icons.favorite_border_rounded,
            label: 'Intéressé',
            onPressed: () => Navigator.pop(context, RadarProductAction.interested),
          );
          final negotiate = _ActionButton.outline(
            icon: Icons.handshake_outlined,
            label: 'Négocier',
            onPressed: () => Navigator.pop(context, RadarProductAction.negotiate),
          );
          final contact = _ActionButton.primary(
            icon: Icons.chat_bubble_outline_rounded,
            label: 'Contacter',
            onPressed: () => Navigator.pop(context, RadarProductAction.contact),
          );

          // On compact phones the primary action uses its own line. Every label
          // remains readable; no word is wrapped or truncated.
          if (constraints.maxWidth < 430) {
            return Column(children: [
              Row(children: [
                Expanded(child: interested),
                const SizedBox(width: 10),
                Expanded(child: negotiate),
              ]),
              const SizedBox(height: 10),
              SizedBox(width: double.infinity, child: contact),
            ]);
          }
          return Row(children: [
            Expanded(child: interested),
            const SizedBox(width: 8),
            Expanded(child: negotiate),
            const SizedBox(width: 8),
            Expanded(child: contact),
          ]);
        },
      );
}

class _ActionButton extends StatelessWidget {
  const _ActionButton.outline({
    required this.icon,
    required this.label,
    required this.onPressed,
  }) : primary = false;

  const _ActionButton.primary({
    required this.icon,
    required this.label,
    required this.onPressed,
  }) : primary = true;

  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    final content = Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(icon, size: 19),
      const SizedBox(width: 7),
      Flexible(
        child: Text(label, maxLines: 1, softWrap: false, overflow: TextOverflow.clip),
      ),
    ]);
    return primary
        ? FilledButton(
            onPressed: onPressed,
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 50),
              backgroundColor: const Color(0xFF08756A),
              foregroundColor: Colors.white,
              textStyle: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w900),
            ),
            child: content,
          )
        : OutlinedButton(
            onPressed: onPressed,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 50),
              foregroundColor: const Color(0xFF075E54),
              side: const BorderSide(color: Color(0xFF90AAA0)),
              textStyle: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w900),
            ),
            child: content,
          );
  }
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.item});
  final LiveRadarItem item;

  @override
  Widget build(BuildContext context) {
    final fallback = item.type == LiveRadarItemType.buy
        ? Icons.search_rounded
        : item.type == LiveRadarItemType.status
            ? Icons.auto_awesome_rounded
            : Icons.sell_outlined;
    final url = item.photoUrl?.trim() ?? '';
    if (url.isEmpty) {
      return ColoredBox(
        color: const Color(0xFFEAF5F0),
        child: Center(child: Icon(fallback, color: const Color(0xFF08756A), size: 34)),
      );
    }
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => ColoredBox(
        color: const Color(0xFFEAF5F0),
        child: Center(child: Icon(fallback, color: const Color(0xFF08756A), size: 34)),
      ),
    );
  }
}
