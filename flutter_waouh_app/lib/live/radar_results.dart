import 'package:flutter/material.dart';

import 'live_radar_models.dart';

enum RadarItemAction { interested, negotiate, contact }

class RadarResults extends StatelessWidget {
  const RadarResults({super.key, required this.items, required this.onTap});
  final List<LiveRadarItem> items;
  final ValueChanged<LiveRadarItem> onTap;

  @override
  Widget build(BuildContext context) => GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: items.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: .78,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
        itemBuilder: (_, index) => _ResultCard(item: items[index], onTap: () => onTap(items[index])),
      );
}

class RadarEmpty extends StatelessWidget {
  const RadarEmpty({super.key, required this.radiusKm, required this.onFilters, required this.onScan});
  final int radiusKm;
  final VoidCallback onFilters;
  final VoidCallback onScan;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22), border: Border.all(color: const Color(0xFFE0EAE6))),
        child: Column(children: [
          const Icon(Icons.radar_rounded, size: 50, color: Color(0xFF7E9A90)),
          const SizedBox(height: 12),
          const Text('Aucune opportunité détectée', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          Text('Aucune annonce géolocalisée ne correspond aux critères dans un rayon de $radiusKm km.', textAlign: TextAlign.center, style: const TextStyle(color: Color(0xFF667A73), height: 1.35)),
          const SizedBox(height: 16),
          Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.center, children: [
            OutlinedButton.icon(onPressed: onFilters, icon: const Icon(Icons.tune_rounded), label: const Text('Modifier les filtres')),
            FilledButton.icon(onPressed: onScan, icon: const Icon(Icons.refresh_rounded), label: const Text('Relancer')),
          ]),
        ]),
      );
}

class _ResultCard extends StatelessWidget {
  const _ResultCard({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Stack(fit: StackFit.expand, children: [
              _Image(url: item.photoUrl, type: item.type),
              Positioned(left: 7, top: 7, child: _Tag(text: item.distanceLabel, color: Color(item.ring.colorValue))),
              Positioned(right: 7, bottom: 7, child: _Tag(text: item.typeLabel, color: const Color(0xD9002F2B))),
            ])),
            Padding(
              padding: const EdgeInsets.fromLTRB(9, 8, 9, 10),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
                const SizedBox(height: 3),
                Text(item.priceLabel.isEmpty ? (item.city ?? 'À proximité') : item.priceLabel, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, color: Color(0xFF08756A), fontWeight: FontWeight.w800)),
              ]),
            ),
          ]),
        ),
      );
}

class _Image extends StatelessWidget {
  const _Image({required this.url, required this.type});
  final String? url;
  final LiveRadarItemType type;

  @override
  Widget build(BuildContext context) {
    final icon = type == LiveRadarItemType.buy ? Icons.search_rounded : type == LiveRadarItemType.status ? Icons.auto_awesome_rounded : Icons.sell_outlined;
    if (url == null || url!.trim().isEmpty) {
      return ColoredBox(color: const Color(0xFFEAF5F0), child: Center(child: Icon(icon, color: const Color(0xFF08756A), size: 34)));
    }
    return Image.network(url!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => ColoredBox(color: const Color(0xFFEAF5F0), child: Center(child: Icon(icon, color: const Color(0xFF08756A), size: 34))));
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.text, required this.color});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4), decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99)), child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)));
}

Future<RadarItemAction?> showRadarItemSheet(BuildContext context, LiveRadarItem item) => showModalBottomSheet<RadarItemAction>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => SafeArea(
        top: false,
        child: Container(
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 22),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: const Color(0xFFCBD9D3), borderRadius: BorderRadius.circular(99)))),
            const SizedBox(height: 18),
            Text(item.title, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
            if (item.priceLabel.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 7), child: Text(item.priceLabel, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: Color(0xFF08756A)))),
            if ((item.description ?? '').trim().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 8), child: Text(item.description!, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF667A73)))),
            const SizedBox(height: 10),
            Text('${item.city ?? 'À proximité'} · ${item.distanceLabel}', style: const TextStyle(color: Color(0xFF667A73), fontWeight: FontWeight.w700)),
            const SizedBox(height: 18),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context, RadarItemAction.interested), child: const Text('Intéressé'))),
              const SizedBox(width: 8),
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context, RadarItemAction.negotiate), child: const Text('Négocier'))),
              const SizedBox(width: 8),
              Expanded(child: FilledButton(onPressed: () => Navigator.pop(context, RadarItemAction.contact), child: const Text('Contacter'))),
            ]),
          ]),
        ),
      ),
    );
