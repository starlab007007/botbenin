import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'brand_mark.dart';
import 'live_radar_models.dart';

class RadarHero extends StatelessWidget {
  const RadarHero({
    super.key,
    required this.animation,
    required this.loading,
    required this.items,
    required this.radiusKm,
    required this.place,
    required this.approximate,
    required this.backendMode,
    required this.scannedAt,
    required this.onScan,
    required this.onItemTap,
  });

  final Animation<double> animation;
  final bool loading;
  final List<LiveRadarItem> items;
  final int radiusKm;
  final String place;
  final bool approximate;
  final bool backendMode;
  final DateTime? scannedAt;
  final VoidCallback onScan;
  final ValueChanged<LiveRadarItem> onItemTap;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: const LinearGradient(
            colors: [Color(0xFF00312C), Color(0xFF08756A), Color(0xFF041D22)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: const [BoxShadow(color: Color(0x33075E54), blurRadius: 26, offset: Offset(0, 14))],
        ),
        child: Column(children: [
          Row(children: [
            const BrandMark(size: 50, semanticLabel: 'WAOUH Radar'),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Radar WAOUH', style: TextStyle(color: Colors.white, fontSize: 23, fontWeight: FontWeight.w900)),
              const SizedBox(height: 3),
              Text(
                approximate ? '$place · position estimée' : '$place · opportunités réelles',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFFC9F6E6), fontSize: 12.5, fontWeight: FontWeight.w700),
              ),
            ])),
            _LiveTag(loading: loading, backendMode: backendMode),
          ]),
          const SizedBox(height: 12),
          RadarCanvas(animation: animation, loading: loading, items: items, radiusKm: radiusKm, onItemTap: onItemTap),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _Metric(label: 'Signaux', value: '${items.length}')),
            const SizedBox(width: 8),
            Expanded(child: _Metric(label: 'Portée', value: '$radiusKm km')),
            const SizedBox(width: 8),
            Expanded(child: _Metric(label: 'Dernier scan', value: _time(scannedAt, loading))),
          ]),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: loading ? null : onScan,
              icon: loading ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF075E54))) : const Icon(Icons.radar_rounded),
              label: Text(loading ? 'Scan en cours…' : 'Scanner maintenant'),
              style: FilledButton.styleFrom(backgroundColor: Colors.white, foregroundColor: const Color(0xFF075E54), minimumSize: const Size.fromHeight(50)),
            ),
          ),
        ]),
      );
}

class RadarCanvas extends StatelessWidget {
  const RadarCanvas({
    super.key,
    required this.animation,
    required this.loading,
    required this.items,
    required this.radiusKm,
    required this.onItemTap,
  });

  final Animation<double> animation;
  final bool loading;
  final List<LiveRadarItem> items;
  final int radiusKm;
  final ValueChanged<LiveRadarItem> onItemTap;

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (_, constraints) {
        final size = math.min(constraints.maxWidth, 288.0);
        final center = size / 2;
        final maxRadius = center - 20;
        return Center(
          child: SizedBox(
            width: size,
            height: size,
            child: Stack(children: [
              CustomPaint(size: Size.square(size), painter: _SweepPainter(animation: animation, loading: loading)),
              ...items.take(18).map((item) {
                final ratio = math.sqrt((item.distanceKm / radiusKm).clamp(0.0, 1.0));
                final distance = math.max(30.0, maxRadius * ratio);
                final angle = (item.bearing - 90) * math.pi / 180;
                return Positioned(
                  left: center + distance * math.cos(angle) - 18,
                  top: center + distance * math.sin(angle) - 18,
                  child: _Dot(item: item, onTap: () => onItemTap(item)),
                );
              }),
              Positioned(
                left: center - 28,
                top: center - 28,
                child: Container(
                  width: 56,
                  height: 56,
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white, border: Border.all(color: const Color(0xFF5BF1C0), width: 2)),
                  child: const BrandMark(size: 42, semanticLabel: 'WAOUH'),
                ),
              ),
              Positioned(
                bottom: 4,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: const Color(0xD9002F2B), borderRadius: BorderRadius.circular(99)),
                    child: Text(loading ? 'Balayage des annonces…' : '${items.length} opportunité${items.length > 1 ? 's' : ''} détectée${items.length > 1 ? 's' : ''}', style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w800)),
                  ),
                ),
              ),
            ]),
          ),
        );
      });
}

class RadarControls extends StatelessWidget {
  const RadarControls({
    super.key,
    required this.filters,
    required this.loading,
    required this.onFilters,
    required this.onUrgent,
    required this.onRefresh,
  });

  final LiveRadarFilters filters;
  final bool loading;
  final VoidCallback onFilters;
  final VoidCallback onUrgent;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFDCEBE5))),
        child: Row(children: [
          Expanded(child: OutlinedButton.icon(onPressed: onFilters, icon: const Icon(Icons.tune_rounded, size: 18), label: Text(filters.activeCount > 0 ? 'Filtres (${filters.activeCount})' : 'Filtres'), style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46)))),
          const SizedBox(width: 8),
          Expanded(child: OutlinedButton.icon(onPressed: onUrgent, icon: Icon(Icons.sos_rounded, size: 18, color: filters.urgent ? const Color(0xFFE44B53) : null), label: const Text('Urgence'), style: OutlinedButton.styleFrom(minimumSize: const Size(0, 46), foregroundColor: filters.urgent ? const Color(0xFFE44B53) : const Color(0xFF40514B)))),
          const SizedBox(width: 8),
          IconButton.filledTonal(onPressed: loading ? null : onRefresh, icon: const Icon(Icons.refresh_rounded), tooltip: 'Actualiser'),
        ]),
      );
}

class RadarNotice extends StatelessWidget {
  const RadarNotice({super.key, required this.text, required this.backendMode});
  final String text;
  final bool backendMode;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: backendMode ? const Color(0xFFEAF9F2) : const Color(0xFFFFF6E3), borderRadius: BorderRadius.circular(14), border: Border.all(color: backendMode ? const Color(0xFFC7EAD9) : const Color(0xFFF1DCAB))),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(backendMode ? Icons.info_outline_rounded : Icons.cloud_off_outlined, color: backendMode ? const Color(0xFF08756A) : const Color(0xFFB7791F)),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: Color(0xFF536861), height: 1.3))),
        ]),
      );
}

class _LiveTag extends StatelessWidget {
  const _LiveTag({required this.loading, required this.backendMode});
  final bool loading;
  final bool backendMode;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        decoration: BoxDecoration(color: Colors.white.withOpacity(.12), borderRadius: BorderRadius.circular(99)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 7, height: 7, decoration: BoxDecoration(color: loading ? const Color(0xFF4FF6A2) : const Color(0xFFC5E0D7), shape: BoxShape.circle)),
          const SizedBox(width: 5),
          Text(loading ? 'Scan' : backendMode ? 'Live' : 'Cache', style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w900)),
        ]),
      );
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.white.withOpacity(.10), borderRadius: BorderRadius.circular(14)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(color: Color(0xFFC3ECDD), fontSize: 10.5, fontWeight: FontWeight.w800)), const SizedBox(height: 3), Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900))]));
}

class _SweepPainter extends CustomPainter {
  const _SweepPainter({required this.animation, required this.loading}) : super(repaint: animation);
  final Animation<double> animation;
  final bool loading;
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 12;
    final rings = Paint()..color = const Color(0xFF89EBD0).withOpacity(.30)..style = PaintingStyle.stroke..strokeWidth = 1.2;
    canvas.drawCircle(center, radius, Paint()..color = const Color(0xFF003C35));
    for (final part in [0.25, 0.5, 0.75, 1.0]) { canvas.drawCircle(center, radius * part, rings); }
    canvas.drawLine(Offset(center.dx, 12), Offset(center.dx, size.height - 12), rings);
    canvas.drawLine(Offset(12, center.dy), Offset(size.width - 12, center.dy), rings);
    if (loading) {
      final angle = animation.value * math.pi * 2 - math.pi / 2;
      final path = Path()..moveTo(center.dx, center.dy)..lineTo(center.dx + radius * math.cos(angle), center.dy + radius * math.sin(angle))..arcTo(Rect.fromCircle(center: center, radius: radius), angle, math.pi / 3.5, false)..close();
      canvas.drawPath(path, Paint()..color = const Color(0x6671F7D0));
      canvas.drawLine(center, Offset(center.dx + radius * math.cos(angle), center.dy + radius * math.sin(angle)), Paint()..color = const Color(0xFF8CFFE0)..strokeWidth = 2);
    }
  }
  @override
  bool shouldRepaint(covariant _SweepPainter oldDelegate) => oldDelegate.loading != loading;
}

class _Dot extends StatelessWidget {
  const _Dot({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(color: Colors.transparent, child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(99), child: Container(width: 36, height: 36, decoration: BoxDecoration(color: Color(item.ring.colorValue), shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2), boxShadow: const [BoxShadow(color: Color(0x55000000), blurRadius: 8)]), child: Icon(item.type == LiveRadarItemType.buy ? Icons.search_rounded : item.type == LiveRadarItemType.status ? Icons.auto_awesome_rounded : Icons.sell_outlined, size: 18, color: Colors.white))));
}

String _time(DateTime? value, bool loading) {
  if (loading) return '…';
  if (value == null) return '—';
  final diff = DateTime.now().difference(value);
  if (diff.inSeconds < 10) return 'maintenant';
  if (diff.inMinutes < 1) return '${diff.inSeconds}s';
  return '${diff.inMinutes} min';
}
