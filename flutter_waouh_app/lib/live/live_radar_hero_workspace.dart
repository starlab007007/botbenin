import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'brand_mark.dart';
import 'live_controller.dart';
import 'live_radar_models.dart';
import 'live_radar_service.dart';
import 'live_theme.dart';

/// Hero-first Radar screen.
///
/// Each user action starts one visible sweep and then stops. The UI does not
/// continuously repeat a loading spinner or create a polling loop.
class LiveRadarHeroWorkspace extends StatefulWidget {
  const LiveRadarHeroWorkspace({super.key});

  @override
  State<LiveRadarHeroWorkspace> createState() => _LiveRadarHeroWorkspaceState();
}

class _LiveRadarHeroWorkspaceState extends State<LiveRadarHeroWorkspace>
    with SingleTickerProviderStateMixin {
  late final LiveRadarService _service = LiveRadarService(legacy.supabase);
  late final AnimationController _sweep = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 3400),
  );

  LiveRadarFilters _filters = const LiveRadarFilters(photoOnly: false);
  List<LiveRadarItem> _items = const [];
  bool _loading = true;
  bool _approximate = false;
  String _locationLabel = 'Position actuelle';
  String? _error;
  DateTime? _scannedAt;
  double _latitude = 6.36;
  double _longitude = 2.42;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _scan(refreshLocation: true));
  }

  @override
  void dispose() {
    _sweep.dispose();
    super.dispose();
  }

  Future<void> _resolveLocation() async {
    final controller = context.read<LiveWaouhController>();
    await controller.useDeviceLocation();
    final position = controller.position;
    final city = (await controller.city).trim();
    if (!mounted) return;
    setState(() {
      if (position.available) {
        _latitude = position.latitude!;
        _longitude = position.longitude!;
        _approximate = false;
        _locationLabel = city.isEmpty || city.toLowerCase() == 'autour de vous'
            ? 'Position actuelle'
            : city;
      } else {
        _latitude = 6.36;
        _longitude = 2.42;
        _approximate = true;
        _locationLabel = city.isEmpty ? 'Cotonou' : city;
      }
    });
  }

  Future<void> _scan({bool refreshLocation = false}) async {
    if (_loading && _scannedAt == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    _sweep.forward(from: 0);
    if (refreshLocation) await _resolveLocation();
    try {
      final results = await _service.scan(
        latitude: _latitude,
        longitude: _longitude,
        filters: _filters,
      );
      if (!mounted) return;
      setState(() {
        _items = results;
        _scannedAt = DateTime.now();
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _items = const [];
        _error = 'Le Radar n’a pas pu terminer ce scan. Vérifiez la connexion puis relancez.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openFilters() async {
    final next = await showModalBottomSheet<LiveRadarFilters>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RadarFiltersSheet(value: _filters),
    );
    if (next == null) return;
    setState(() => _filters = next);
    await _scan();
  }

  Future<void> _toggleUrgency() async {
    setState(() => _filters = _filters.copyWith(urgent: !_filters.urgent));
    await _scan(refreshLocation: true);
  }

  Future<void> _openItem(LiveRadarItem item) async {
    final action = await showModalBottomSheet<_RadarAction>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _RadarActionSheet(item: item),
    );
    if (action == null) return;
    final intent = switch (action) {
      _RadarAction.interested => 'Je suis intéressé par « ${item.title} » à ${item.distanceLabel}.',
      _RadarAction.negotiate => 'Je souhaite négocier « ${item.title} » à ${item.distanceLabel}.',
      _RadarAction.buy => 'Je veux acheter « ${item.title} » à ${item.distanceLabel}.',
    };
    final controller = context.read<LiveWaouhController>();
    controller.setComposerSeed(intent, meta: {
      'source': 'flutter_radar',
      'auto_send': true,
      'radar_item_id': item.id,
      'article_id': item.articleId,
      'title': item.title,
      'distance': item.distanceLabel,
      'radar_intent': action.name,
      'role': item.type == LiveRadarItemType.buy ? 'seller' : 'buyer',
    });
    if (!mounted) return;
    if (!context.read<legacy.AuthController>().signedIn) {
      context.go('/app/auth?next=${Uri.encodeComponent('/app/chat/waouh')}');
    } else {
      context.go('/app/chat/waouh');
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: () => _scan(refreshLocation: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
          children: [
            _RadarHero(
              items: _items,
              maxRadiusKm: _filters.maxRadiusKm,
              sweep: _sweep,
              scanning: _loading,
              locationLabel: _locationLabel,
              approximate: _approximate,
              scannedAt: _scannedAt,
              onItemTap: _openItem,
            ),
            const SizedBox(height: 14),
            _RadarControlCard(
              urgent: _filters.urgent,
              filterCount: _filters.activeCount,
              radiusKm: _filters.maxRadiusKm,
              scanning: _loading,
              onUrgent: _toggleUrgency,
              onFilters: _openFilters,
              onScan: () => _scan(refreshLocation: true),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              _RadarFeedback(text: _error!, onRetry: () => _scan(refreshLocation: true)),
            ],
            const SizedBox(height: 18),
            Row(children: [
              const Expanded(
                child: Text('Opportunités détectées', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              ),
              Text('${_items.length}', style: const TextStyle(color: WaouhPalette.jade, fontWeight: FontWeight.w900)),
            ]),
            const SizedBox(height: 10),
            if (_loading && _items.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 46),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_items.isEmpty)
              _RadarEmpty(
                onFilters: _openFilters,
                onScan: () => _scan(refreshLocation: true),
              )
            else
              _RadarResultsGrid(items: _items, onTap: _openItem),
          ],
        ),
      );
}

class _RadarHero extends StatelessWidget {
  const _RadarHero({
    required this.items,
    required this.maxRadiusKm,
    required this.sweep,
    required this.scanning,
    required this.locationLabel,
    required this.approximate,
    required this.scannedAt,
    required this.onItemTap,
  });

  final List<LiveRadarItem> items;
  final int maxRadiusKm;
  final Animation<double> sweep;
  final bool scanning;
  final String locationLabel;
  final bool approximate;
  final DateTime? scannedAt;
  final ValueChanged<LiveRadarItem> onItemTap;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: const LinearGradient(
            colors: [Color(0xFF012F2A), Color(0xFF075E54), Color(0xFF023C35)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: const [BoxShadow(color: Color(0x33075E54), blurRadius: 24, offset: Offset(0, 12))],
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const BrandMark(size: 44, semanticLabel: 'WAOUH'),
            const SizedBox(width: 10),
            const Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Radar WAOUH', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
                SizedBox(height: 2),
                Text('Détection locale en temps réel', style: TextStyle(color: Color(0xFFC9F5E3), fontSize: 12.5, fontWeight: FontWeight.w700)),
              ]),
            ),
            _ScanStatePill(scanning: scanning, count: items.length),
          ]),
          const SizedBox(height: 14),
          LayoutBuilder(builder: (_, constraints) {
            final side = math.min(constraints.maxWidth, 320.0);
            return Center(
              child: SizedBox(
                width: side,
                height: side,
                child: Stack(children: [
                  CustomPaint(
                    size: Size.square(side),
                    painter: _RadarSweepPainter(
                      sweep: sweep,
                      active: scanning || sweep.value < 1,
                      maxRadiusKm: maxRadiusKm,
                    ),
                  ),
                  ...items.take(24).map((item) {
                    final center = side / 2;
                    final fieldRadius = center - 22;
                    final ratio = math.sqrt((item.distanceKm / maxRadiusKm).clamp(0.0, 1.0));
                    final pointRadius = math.max(30.0, fieldRadius * ratio);
                    final angle = (item.bearing - 90) * math.pi / 180;
                    final x = center + pointRadius * math.cos(angle);
                    final y = center + pointRadius * math.sin(angle);
                    return Positioned(
                      left: x - 21,
                      top: y - 21,
                      child: _RadarPoint(item: item, onTap: () => onItemTap(item)),
                    );
                  }),
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF023C35),
                        border: Border.all(color: const Color(0xFF6CE6BE), width: 2),
                        boxShadow: const [BoxShadow(color: Color(0x44000000), blurRadius: 12)],
                      ),
                      child: const BrandMark(size: 56, semanticLabel: 'Radar WAOUH'),
                    ),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 2,
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(color: const Color(0xDE012E29), borderRadius: BorderRadius.circular(99), border: Border.all(color: const Color(0x556CE6BE))),
                        child: Text(
                          scanning ? 'Balayage en cours…' : '${items.length} signal${items.length > 1 ? 's' : ''} à proximité',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 11.5),
                        ),
                      ),
                    ),
                  ),
                ]),
              ),
            );
          }),
          const SizedBox(height: 12),
          Row(children: [
            const Icon(Icons.location_on_outlined, size: 16, color: Color(0xFFC9F5E3)),
            const SizedBox(width: 5),
            Expanded(
              child: Text(
                '$locationLabel${approximate ? ' · position estimée' : ''}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFFC9F5E3), fontSize: 12, fontWeight: FontWeight.w700),
              ),
            ),
            if (scannedAt != null)
              Text('Dernier scan ${_scanTime(scannedAt!)}', style: const TextStyle(color: Color(0xFFA9D7C6), fontSize: 11)),
          ]),
        ]),
      );
}

class _RadarSweepPainter extends CustomPainter {
  const _RadarSweepPainter({required this.sweep, required this.active, required this.maxRadiusKm}) : super(repaint: sweep);

  final Animation<double> sweep;
  final bool active;
  final int maxRadiusKm;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 18;
    final fill = Paint()..color = const Color(0x1F71F6C5);
    canvas.drawCircle(center, radius, fill);
    final rings = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = const Color(0x5577E6BF);
    for (final factor in const [0.28, 0.54, 0.79, 1.0]) {
      canvas.drawCircle(center, radius * factor, rings);
    }
    canvas.drawLine(Offset(center.dx, 14), Offset(center.dx, size.height - 14), rings);
    canvas.drawLine(Offset(14, center.dy), Offset(size.width - 14, center.dy), rings);
    if (active) {
      final angle = sweep.value * math.pi * 2 - math.pi / 2;
      final sector = Path()
        ..moveTo(center.dx, center.dy)
        ..lineTo(center.dx + radius * math.cos(angle), center.dy + radius * math.sin(angle))
        ..arcTo(Rect.fromCircle(center: center, radius: radius), angle, math.pi / 4.5, false)
        ..close();
      canvas.drawPath(sector, Paint()..color = const Color(0x4D6AF1C2));
      canvas.drawLine(
        center,
        Offset(center.dx + radius * math.cos(angle), center.dy + radius * math.sin(angle)),
        Paint()..color = const Color(0xFF6AF1C2)..strokeWidth = 2,
      );
    }
    final labelStyle = const TextStyle(color: Color(0xFFA9D7C6), fontSize: 10, fontWeight: FontWeight.w800);
    _label(canvas, '${math.max(1, maxRadiusKm ~/ 4)} km', Offset(center.dx + 7, center.dy - radius * .53), labelStyle);
    _label(canvas, '$maxRadiusKm km', Offset(center.dx + 7, center.dy - radius + 8), labelStyle);
  }

  void _label(Canvas canvas, String text, Offset offset, TextStyle style) {
    final painter = TextPainter(text: TextSpan(text: text, style: style), textDirection: TextDirection.ltr)..layout();
    painter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant _RadarSweepPainter oldDelegate) =>
      oldDelegate.maxRadiusKm != maxRadiusKm || oldDelegate.active != active;
}

class _RadarPoint extends StatelessWidget {
  const _RadarPoint({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkResponse(
        onTap: onTap,
        radius: 28,
        child: Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: Color(item.ring.colorValue),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: const [BoxShadow(color: Color(0x55000000), blurRadius: 8, offset: Offset(0, 3))],
          ),
          child: Center(
            child: Icon(
              item.type == LiveRadarItemType.buy ? Icons.search_rounded : Icons.shopping_bag_outlined,
              color: Colors.white,
              size: 20,
            ),
          ),
        ),
      );
}

class _ScanStatePill extends StatelessWidget {
  const _ScanStatePill({required this.scanning, required this.count});
  final bool scanning;
  final int count;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
        decoration: BoxDecoration(
          color: scanning ? const Color(0x33F6BD60) : const Color(0x286AF1C2),
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: scanning ? const Color(0x55F6BD60) : const Color(0x556AF1C2)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(scanning ? Icons.radar_rounded : Icons.check_circle_outline_rounded, color: Colors.white, size: 14),
          const SizedBox(width: 5),
          Text(scanning ? 'Scan' : '$count trouvé${count > 1 ? 's' : ''}', style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w900)),
        ]),
      );
}

class _RadarControlCard extends StatelessWidget {
  const _RadarControlCard({
    required this.urgent,
    required this.filterCount,
    required this.radiusKm,
    required this.scanning,
    required this.onUrgent,
    required this.onFilters,
    required this.onScan,
  });

  final bool urgent;
  final int filterCount;
  final int radiusKm;
  final bool scanning;
  final VoidCallback onUrgent;
  final VoidCallback onFilters;
  final VoidCallback onScan;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFFDCE9E4))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Row(children: [
            Icon(Icons.tune_rounded, color: WaouhPalette.jade, size: 18),
            SizedBox(width: 7),
            Text('Contrôles du scan', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          ]),
          const SizedBox(height: 5),
          Text('Affinez le Radar après avoir visualisé les opportunités.', style: TextStyle(color: WaouhPalette.muted, fontSize: 12, height: 1.3)),
          const SizedBox(height: 13),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _ControlPill(icon: Icons.near_me_outlined, label: 'Portée · $radiusKm km', onTap: onFilters),
            _ControlPill(icon: Icons.tune_rounded, label: filterCount == 0 ? 'Filtres' : '$filterCount filtre${filterCount > 1 ? 's' : ''}', badge: filterCount, onTap: onFilters),
            _ControlPill(icon: Icons.sos_rounded, label: urgent ? 'Urgence activée' : 'Urgence', tone: urgent ? _ControlTone.danger : _ControlTone.neutral, onTap: onUrgent),
          ]),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: scanning ? null : onScan,
              icon: scanning ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.radar_rounded),
              label: Text(scanning ? 'Analyse en cours…' : 'Scanner maintenant'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
            ),
          ),
        ]),
      );
}

enum _ControlTone { neutral, danger }

class _ControlPill extends StatelessWidget {
  const _ControlPill({required this.icon, required this.label, required this.onTap, this.badge = 0, this.tone = _ControlTone.neutral});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final int badge;
  final _ControlTone tone;

  @override
  Widget build(BuildContext context) {
    final danger = tone == _ControlTone.danger;
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Stack(clipBehavior: Clip.none, children: [
        Icon(icon, size: 17),
        if (badge > 0)
          Positioned(
            top: -8,
            right: -9,
            child: Container(
              width: 17,
              height: 17,
              alignment: Alignment.center,
              decoration: const BoxDecoration(color: WaouhPalette.red, shape: BoxShape.circle),
              child: Text('$badge', style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900)),
            ),
          ),
      ]),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: danger ? WaouhPalette.red : WaouhPalette.jade,
        side: BorderSide(color: danger ? const Color(0xFFF1B8BC) : const Color(0xFFBDDCD0)),
        backgroundColor: danger ? const Color(0xFFFFF2F3) : const Color(0xFFF8FCFA),
        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12.5),
        minimumSize: const Size(0, 40),
      ),
    );
  }
}

class _RadarFeedback extends StatelessWidget {
  const _RadarFeedback({required this.text, required this.onRetry});
  final String text;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(color: const Color(0xFFFFF7E6), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFF2DCA6))),
        child: Row(children: [
          const Icon(Icons.info_outline_rounded, color: WaouhPalette.orange),
          const SizedBox(width: 9),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 12, color: WaouhPalette.muted))),
          TextButton(onPressed: onRetry, child: const Text('Relancer')),
        ]),
      );
}

class _RadarResultsGrid extends StatelessWidget {
  const _RadarResultsGrid({required this.items, required this.onTap});
  final List<LiveRadarItem> items;
  final ValueChanged<LiveRadarItem> onTap;

  @override
  Widget build(BuildContext context) => GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: math.min(items.length, 24),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: .82,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
        ),
        itemBuilder: (_, index) => _RadarResultCard(item: items[index], onTap: () => onTap(items[index])),
      );
}

class _RadarResultCard extends StatelessWidget {
  const _RadarResultCard({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Stack(fit: StackFit.expand, children: [
                _NetworkOrFallback(url: item.photoUrl, icon: item.type == LiveRadarItemType.buy ? Icons.search_rounded : Icons.shopping_bag_outlined),
                Positioned(
                  left: 7,
                  top: 7,
                  child: _CardBadge(label: item.distanceLabel, color: Color(item.ring.colorValue)),
                ),
              ]),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(9, 8, 9, 9),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900)),
                const SizedBox(height: 2),
                Text(item.priceLabel.isEmpty ? (item.city ?? 'À proximité') : item.priceLabel, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: WaouhPalette.jade)),
              ]),
            ),
          ]),
        ),
      );
}

class _CardBadge extends StatelessWidget {
  const _CardBadge({required this.label, required this.color});
  final String label;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(99)),
        child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)),
      );
}

class _NetworkOrFallback extends StatelessWidget {
  const _NetworkOrFallback({required this.url, required this.icon});
  final String? url;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return ColoredBox(color: const Color(0xFFE9F6F1), child: Center(child: Icon(icon, color: WaouhPalette.jade, size: 34)));
    }
    return Image.network(
      url!,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => ColoredBox(color: const Color(0xFFE9F6F1), child: Center(child: Icon(icon, color: WaouhPalette.jade, size: 34))),
    );
  }
}

class _RadarEmpty extends StatelessWidget {
  const _RadarEmpty({required this.onFilters, required this.onScan});
  final VoidCallback onFilters;
  final VoidCallback onScan;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(color: Colors.white, border: Border.all(color: const Color(0xFFDFEAE6)), borderRadius: BorderRadius.circular(22)),
        child: Column(children: [
          const BrandMark(size: 58, semanticLabel: 'WAOUH'),
          const SizedBox(height: 14),
          const Text('Aucune opportunité détectée', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          const Text('Élargissez la portée ou les filtres, puis relancez un scan ponctuel.', textAlign: TextAlign.center, style: TextStyle(color: WaouhPalette.muted, height: 1.35)),
          const SizedBox(height: 16),
          Wrap(spacing: 10, runSpacing: 10, alignment: WrapAlignment.center, children: [
            OutlinedButton.icon(onPressed: onFilters, icon: const Icon(Icons.tune_rounded), label: const Text('Filtres')),
            FilledButton.icon(onPressed: onScan, icon: const Icon(Icons.radar_rounded), label: const Text('Scanner')),
          ]),
        ]),
      );
}

enum _RadarAction { interested, negotiate, buy }

class _RadarActionSheet extends StatelessWidget {
  const _RadarActionSheet({required this.item});
  final LiveRadarItem item;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .84),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(26))),
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 24),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: const Color(0xFFD1DFD9), borderRadius: BorderRadius.circular(99)))),
                const SizedBox(height: 18),
                if (item.photoUrl != null && item.photoUrl!.isNotEmpty)
                  ClipRRect(borderRadius: BorderRadius.circular(18), child: SizedBox(height: 190, width: double.infinity, child: _NetworkOrFallback(url: item.photoUrl, icon: Icons.shopping_bag_outlined))),
                if (item.photoUrl != null && item.photoUrl!.isNotEmpty) const SizedBox(height: 16),
                Text(item.title, style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900)),
                if (item.priceLabel.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 7), child: Text(item.priceLabel, style: const TextStyle(fontSize: 18, color: WaouhPalette.jade, fontWeight: FontWeight.w900))),
                if ((item.description ?? '').trim().isNotEmpty) Padding(padding: const EdgeInsets.only(top: 9), child: Text(item.description!, style: const TextStyle(color: WaouhPalette.muted, height: 1.35))),
                const SizedBox(height: 12),
                Text('${item.city ?? 'À proximité'} · ${item.distanceLabel} · ${liveRadarFreshness(item.freshnessMs)}', style: const TextStyle(color: WaouhPalette.muted, fontSize: 12)),
                const SizedBox(height: 20),
                Row(children: [
                  Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context, _RadarAction.interested), child: const Text('Intéressé'))),
                  const SizedBox(width: 8),
                  Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context, _RadarAction.negotiate), child: const Text('Négocier'))),
                  const SizedBox(width: 8),
                  Expanded(child: FilledButton(onPressed: () => Navigator.pop(context, _RadarAction.buy), child: const Text('Acheter'))),
                ]),
              ]),
            ),
          ),
        ),
      );
}

class _RadarFiltersSheet extends StatefulWidget {
  const _RadarFiltersSheet({required this.value});
  final LiveRadarFilters value;
  @override
  State<_RadarFiltersSheet> createState() => _RadarFiltersSheetState();
}

class _RadarFiltersSheetState extends State<_RadarFiltersSheet> {
  late LiveRadarFilters _value = widget.value;
  late final TextEditingController _category = TextEditingController(text: _value.category ?? '');
  late final TextEditingController _min = TextEditingController(text: _value.priceMin?.toString() ?? '');
  late final TextEditingController _max = TextEditingController(text: _value.priceMax?.toString() ?? '');

  @override
  void dispose() {
    _category.dispose();
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  void _toggleType(LiveRadarItemType type) {
    final types = [..._value.types];
    types.contains(type) ? types.remove(type) : types.add(type);
    setState(() => _value = _value.copyWith(types: types));
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .84),
          padding: EdgeInsets.fromLTRB(18, 12, 18, 18 + MediaQuery.viewInsetsOf(context).bottom),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(26))),
          child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: const Color(0xFFD1DFD9), borderRadius: BorderRadius.circular(99)))),
            const SizedBox(height: 16),
            const Text('Affiner le Radar', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
            const SizedBox(height: 16),
            const Text('Type d’opportunité', style: TextStyle(fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: LiveRadarItemType.values.map((type) => FilterChip(label: Text(type.label), selected: _value.types.contains(type), onSelected: (_) => _toggleType(type))).toList()),
            const SizedBox(height: 16),
            TextField(controller: _category, decoration: const InputDecoration(labelText: 'Catégorie', hintText: 'Ex. Téléphones')),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: TextField(controller: _min, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Prix min'))),
              const SizedBox(width: 10),
              Expanded(child: TextField(controller: _max, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Prix max'))),
            ]),
            const SizedBox(height: 8),
            SwitchListTile(contentPadding: EdgeInsets.zero, value: _value.photoOnly, onChanged: (value) => setState(() => _value = _value.copyWith(photoOnly: value)), title: const Text('Avec photo uniquement')),
            SwitchListTile(contentPadding: EdgeInsets.zero, value: _value.verifiedOnly, onChanged: (value) => setState(() => _value = _value.copyWith(verifiedOnly: value)), title: const Text('Vendeurs vérifiés uniquement')),
            const SizedBox(height: 12),
            SizedBox(width: double.infinity, child: FilledButton(onPressed: () {
              final category = _category.text.trim();
              final min = num.tryParse(_min.text.trim().replaceAll(' ', '').replaceAll(',', '.'));
              final max = num.tryParse(_max.text.trim().replaceAll(' ', '').replaceAll(',', '.'));
              Navigator.pop(context, _value.copyWith(category: category, clearCategory: category.isEmpty, priceMin: min, clearPriceMin: min == null, priceMax: max, clearPriceMax: max == null));
            }, child: const Text('Appliquer les filtres'))),
          ])),
        ),
      );
}

String _scanTime(DateTime value) {
  final diff = DateTime.now().difference(value);
  if (diff.inMinutes <= 0) return 'à l’instant';
  if (diff.inMinutes < 60) return 'il y a ${diff.inMinutes} min';
  return 'il y a ${diff.inHours} h';
}
