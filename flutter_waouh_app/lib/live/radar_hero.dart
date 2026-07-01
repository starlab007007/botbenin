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
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
        decoration: BoxDecoration(
          color: const Color(0xFFF7FFFB),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFB8E8D3), width: 1.2),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1A08756A),
              blurRadius: 24,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: Column(children: [
          Row(children: [
            Container(
              width: 54,
              height: 54,
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFC8EBDD)),
              ),
              child: const BrandMark(size: 42, semanticLabel: 'WAOUH Radar'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text(
                  'Radar WAOUH',
                  style: TextStyle(
                    color: Color(0xFF075E54),
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -.3,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  approximate
                      ? '$place · position estimée'
                      : '$place · opportunités autour de vous',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF637B72),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ]),
            ),
            _LiveTag(loading: loading, backendMode: backendMode),
          ]),
          const SizedBox(height: 10),
          RadarCanvas(
            animation: animation,
            loading: loading,
            items: items,
            radiusKm: radiusKm,
            onItemTap: onItemTap,
          ),
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
              icon: loading
                  ? const SizedBox(
                      width: 17,
                      height: 17,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.radar_rounded),
              label: Text(loading ? 'Recherche en cours…' : 'Scanner maintenant'),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF08756A),
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(50),
                textStyle: const TextStyle(fontWeight: FontWeight.w900),
              ),
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
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (_, constraints) {
          final size = math.min(constraints.maxWidth, 300.0);
          final center = size / 2;
          final maxRadius = center - 23;
          return Center(
            child: SizedBox(
              width: size,
              height: size,
              child: Stack(clipBehavior: Clip.none, children: [
                CustomPaint(
                  size: Size.square(size),
                  painter: _SweepPainter(
                    animation: animation,
                    scanning: loading,
                  ),
                ),
                ...items.take(18).map((item) {
                  final ratio = math.sqrt(
                    (item.distanceKm / radiusKm).clamp(0.0, 1.0),
                  );
                  final distance = math.max(34.0, maxRadius * ratio);
                  final angle = (item.bearing - 90) * math.pi / 180;
                  return Positioned(
                    left: center + distance * math.cos(angle) - 19,
                    top: center + distance * math.sin(angle) - 19,
                    child: _Dot(item: item, onTap: () => onItemTap(item)),
                  );
                }),
                Positioned(
                  left: center - 31,
                  top: center - 31,
                  child: Container(
                    width: 62,
                    height: 62,
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white,
                      border: Border.all(
                        color: const Color(0xFF51CF98),
                        width: 2.2,
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x6651CF98),
                          blurRadius: 18,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const BrandMark(size: 46, semanticLabel: 'WAOUH'),
                  ),
                ),
                Positioned(
                  bottom: 2,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 11,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(.92),
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(color: const Color(0xFFC5EBD9)),
                      ),
                      child: Text(
                        loading
                            ? 'Balayage des opportunités…'
                            : 'Surveillance active · ${items.length} signal${items.length > 1 ? 's' : ''}',
                        style: const TextStyle(
                          color: Color(0xFF075E54),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                ),
              ]),
            ),
          );
        },
      );
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
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFDCEBE5)),
        ),
        child: LayoutBuilder(
          builder: (_, constraints) {
            final compact = constraints.maxWidth < 350;
            final filtersButton = OutlinedButton.icon(
              onPressed: onFilters,
              icon: const Icon(Icons.tune_rounded, size: 18),
              label: Text(filters.activeCount > 0
                  ? 'Filtres (${filters.activeCount})'
                  : 'Filtres'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 46),
                textStyle: const TextStyle(fontWeight: FontWeight.w800),
              ),
            );
            final urgentButton = OutlinedButton.icon(
              onPressed: onUrgent,
              icon: Icon(
                Icons.sos_rounded,
                size: 18,
                color: filters.urgent ? const Color(0xFFE44B53) : null,
              ),
              label: const Text('Urgence'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 46),
                foregroundColor: filters.urgent
                    ? const Color(0xFFE44B53)
                    : const Color(0xFF40514B),
                textStyle: const TextStyle(fontWeight: FontWeight.w800),
              ),
            );
            if (compact) {
              return Column(children: [
                Row(children: [
                  Expanded(child: filtersButton),
                  const SizedBox(width: 8),
                  Expanded(child: urgentButton),
                ]),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: loading ? null : onRefresh,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Actualiser le Radar'),
                  ),
                ),
              ]);
            }
            return Row(children: [
              Expanded(child: filtersButton),
              const SizedBox(width: 8),
              Expanded(child: urgentButton),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                onPressed: loading ? null : onRefresh,
                icon: const Icon(Icons.refresh_rounded),
                tooltip: 'Actualiser les opportunités',
              ),
            ]);
          },
        ),
      );
}

class RadarNotice extends StatelessWidget {
  const RadarNotice({super.key, required this.text, required this.backendMode});
  final String text;
  final bool backendMode;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: backendMode
              ? const Color(0xFFEAF9F2)
              : const Color(0xFFFFF6E3),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: backendMode
                ? const Color(0xFFC7EAD9)
                : const Color(0xFFF1DCAB),
          ),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(
            backendMode
                ? Icons.info_outline_rounded
                : Icons.cloud_off_outlined,
            color: backendMode
                ? const Color(0xFF08756A)
                : const Color(0xFFB7791F),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF536861),
                height: 1.3,
              ),
            ),
          ),
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
        decoration: BoxDecoration(
          color: const Color(0xFFE7F8F0),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: const Color(0xFFBDE6D4)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: loading
                  ? const Color(0xFF18B981)
                  : backendMode
                      ? const Color(0xFF14A66E)
                      : const Color(0xFF94AAA2),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            loading ? 'Scan' : backendMode ? 'Live' : 'Cache',
            style: const TextStyle(
              color: Color(0xFF075E54),
              fontSize: 10.5,
              fontWeight: FontWeight.w900,
            ),
          ),
        ]),
      );
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFD2EBDF)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF6B8279),
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFF075E54),
              fontSize: 15.5,
              fontWeight: FontWeight.w900,
            ),
          ),
        ]),
      );
}

class _SweepPainter extends CustomPainter {
  const _SweepPainter({required this.animation, required this.scanning})
      : super(repaint: animation);
  final Animation<double> animation;
  final bool scanning;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 12;
    final bounds = Rect.fromCircle(center: center, radius: radius);
    final fill = Paint()
      ..shader = const RadialGradient(
        colors: [
          Color(0xFFF4FFF9),
          Color(0xFFC9F1DE),
          Color(0xFF9BDEBF),
        ],
        stops: [0.02, .62, 1],
      ).createShader(bounds);
    final rings = Paint()
      ..color = const Color(0xFF08756A).withOpacity(.25)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.15;
    canvas.drawCircle(center, radius, fill);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = const Color(0xFF5ACF9D)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
    for (final part in [0.2, 0.4, 0.6, 0.8]) {
      canvas.drawCircle(center, radius * part, rings);
    }
    canvas.drawLine(
      Offset(center.dx, 12),
      Offset(center.dx, size.height - 12),
      rings,
    );
    canvas.drawLine(
      Offset(12, center.dy),
      Offset(size.width - 12, center.dy),
      rings,
    );

    final angle = animation.value * math.pi * 2 - math.pi / 2;
    final sweepSpan = scanning ? math.pi / 2.8 : math.pi / 5.3;
    final sweep = Path()
      ..moveTo(center.dx, center.dy)
      ..lineTo(
        center.dx + radius * math.cos(angle),
        center.dy + radius * math.sin(angle),
      )
      ..arcTo(bounds, angle, sweepSpan, false)
      ..close();
    canvas.drawPath(
      sweep,
      Paint()
        ..shader = RadialGradient(
          colors: scanning
              ? const [Color(0xAA43D999), Color(0x0052E3AA)]
              : const [Color(0x6643D999), Color(0x0052E3AA)],
        ).createShader(bounds),
    );
    canvas.drawLine(
      center,
      Offset(
        center.dx + radius * math.cos(angle),
        center.dy + radius * math.sin(angle),
      ),
      Paint()
        ..color = const Color(0xFF12A56E)
        ..strokeWidth = scanning ? 2.4 : 1.8,
    );
  }

  @override
  bool shouldRepaint(covariant _SweepPainter oldDelegate) =>
      oldDelegate.scanning != scanning;
}

class _Dot extends StatelessWidget {
  const _Dot({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(99),
          child: Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: Color(item.ring.colorValue),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: [
                BoxShadow(
                  color: Color(item.ring.colorValue).withOpacity(.48),
                  blurRadius: 13,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Icon(
              item.type == LiveRadarItemType.buy
                  ? Icons.search_rounded
                  : item.type == LiveRadarItemType.status
                      ? Icons.auto_awesome_rounded
                      : Icons.sell_outlined,
              size: 18,
              color: Colors.white,
            ),
          ),
        ),
      );
}

String _time(DateTime? value, bool loading) {
  if (loading) return '…';
  if (value == null) return '—';
  final diff = DateTime.now().difference(value);
  if (diff.inSeconds < 10) return 'maintenant';
  if (diff.inMinutes < 1) return '${diff.inSeconds}s';
  return '${diff.inMinutes} min';
}
