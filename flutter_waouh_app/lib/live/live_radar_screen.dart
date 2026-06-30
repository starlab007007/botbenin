import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_radar_models.dart';
import 'live_radar_service.dart';

const _radarFiltersStorageKey = 'waouh_radar_filters_v1';
const _radarPauseStorageKey = 'waouh_radar_pause_reason_v1';
const _radarFallbackLatitude = 6.36;
const _radarFallbackLongitude = 2.42;

class LiveRadarFeed extends StatefulWidget {
  const LiveRadarFeed({super.key});

  @override
  State<LiveRadarFeed> createState() => _LiveRadarFeedState();
}

class _LiveRadarFeedState extends State<LiveRadarFeed> with WidgetsBindingObserver {
  final _service = LiveRadarService(legacy.supabase);
  LiveRadarFilters _filters = const LiveRadarFilters();
  List<LiveRadarItem> _items = const [];
  bool _loading = true;
  bool _paused = false;
  bool _radarView = true;
  bool _usingFallbackLocation = false;
  String _locationLabel = 'Cotonou';
  String? _pauseReason;
  DateTime? _scanAt;
  DateTime? _pauseDeadline;
  Timer? _countdownTimer;
  double _latitude = _radarFallbackLatitude;
  double _longitude = _radarFallbackLongitude;

  int? get _effectivePauseMs => _filters.urgent ? 30000 : _filters.autoPauseMs;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused || state == AppLifecycleState.detached) {
      _pause('Radar mis en veille pour économiser la batterie et les données.');
    }
  }

  Future<void> _bootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    try {
      final raw = prefs.getString(_radarFiltersStorageKey);
      if (raw != null && raw.isNotEmpty) {
        _filters = LiveRadarFilters.fromJson(Map<String, dynamic>.from(jsonDecode(raw) as Map));
      }
    } catch (_) {}
    _pauseReason = prefs.getString(_radarPauseStorageKey);
    if (_pauseReason != null && _pauseReason!.isNotEmpty) _paused = true;
    await _resolveLocation(force: true);
    if (!_paused) await _scan();
    if (mounted) setState(() {});
  }

  Future<void> _resolveLocation({bool force = false}) async {
    final controller = context.read<LiveWaouhController>();
    if (force || !controller.position.available) await controller.useDeviceLocation();
    final position = controller.position;
    final city = await controller.city;
    if (!mounted) return;
    setState(() {
      if (position.available) {
        _latitude = position.latitude!;
        _longitude = position.longitude!;
        _usingFallbackLocation = false;
        _locationLabel = city.trim().isEmpty ? 'Autour de vous' : city.trim();
      } else {
        _latitude = _radarFallbackLatitude;
        _longitude = _radarFallbackLongitude;
        _usingFallbackLocation = true;
        _locationLabel = city.trim().isEmpty ? 'Cotonou' : city.trim();
      }
    });
  }

  Future<void> _scan({bool refreshLocation = false}) async {
    _countdownTimer?.cancel();
    if (mounted) setState(() { _loading = true; _paused = false; _pauseReason = null; });
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_radarPauseStorageKey);
    if (refreshLocation) await _resolveLocation(force: true);
    try {
      final items = await _service.scan(latitude: _latitude, longitude: _longitude, filters: _filters);
      if (!mounted) return;
      setState(() {
        _items = items;
        _scanAt = DateTime.now();
      });
      _startAutoPause();
    } catch (_) {
      if (mounted) setState(() => _items = const []);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _startAutoPause() {
    _countdownTimer?.cancel();
    final delay = _effectivePauseMs;
    if (delay == null) {
      if (mounted) setState(() => _pauseDeadline = null);
      return;
    }
    final deadline = DateTime.now().add(Duration(milliseconds: delay));
    setState(() => _pauseDeadline = deadline);
    _countdownTimer = Timer.periodic(const Duration(milliseconds: 500), (_) {
      if (!mounted) return;
      if (DateTime.now().isAfter(deadline)) {
        _pause('Délai d’inactivité atteint. Relancez pour voir les nouveautés.');
      } else {
        setState(() {});
      }
    });
  }

  Future<void> _pause(String reason) async {
    _countdownTimer?.cancel();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_radarPauseStorageKey, reason);
    if (mounted) setState(() { _paused = true; _pauseReason = reason; _pauseDeadline = null; });
  }

  Future<void> _resume() async => _scan(refreshLocation: true);

  Future<void> _saveFilters() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_radarFiltersStorageKey, jsonEncode(_filters.toJson()));
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
    await _saveFilters();
    await _scan();
  }

  Future<void> _toggleUrgent() async {
    setState(() => _filters = _filters.copyWith(urgent: !_filters.urgent));
    await _saveFilters();
    await _scan(refreshLocation: true);
  }

  Future<void> _openItem(LiveRadarItem item) async {
    final action = await showModalBottomSheet<_RadarIntent>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RadarItemSheet(item: item),
    );
    if (action != null) await _startChat(item, action);
  }

  Future<void> _startChat(LiveRadarItem item, _RadarIntent intent) async {
    final distance = item.distanceLabel;
    final text = switch (intent) {
      _RadarIntent.interest => 'Je suis intéressé par « ${item.title} » à $distance. ',
      _RadarIntent.negotiate => 'Je souhaite négocier « ${item.title} » à $distance. ',
      _RadarIntent.buy => 'Je veux acheter « ${item.title} » à $distance. ',
    };
    final intentLabel = switch (intent) {
      _RadarIntent.interest => 'Intéressé',
      _RadarIntent.negotiate => 'Négocier',
      _RadarIntent.buy => 'Acheter',
    };
    final controller = context.read<LiveWaouhController>();
    controller.setComposerSeed(text, meta: {
      'source': 'flutter_radar',
      'auto_send': true,
      'radar_item_id': item.id,
      'radar_source': item.source,
      'radar_intent': intent.name,
      'article_id': item.articleId,
      'title': item.title,
      'distance': distance,
      if (item.priceMin != null) 'price': item.priceMin,
      if (item.currency != null) 'devise': item.currency,
      'role': item.type == LiveRadarItemType.buy ? 'seller' : 'buyer',
    });
    await _pause('Demande « $intentLabel » préparée pour « ${item.title} ». Le radar est en pause.');
    if (!mounted) return;
    if (!context.read<legacy.AuthController>().signedIn) {
      context.go('/app/auth?next=${Uri.encodeComponent('/app/chat/waouh')}');
      return;
    }
    context.go('/app/chat/waouh');
  }

  int get _countdownSeconds {
    final deadline = _pauseDeadline;
    if (deadline == null) return 0;
    return math.max(0, deadline.difference(DateTime.now()).inSeconds + 1);
  }

  @override
  Widget build(BuildContext context) {
    final grouped = <int, List<LiveRadarItem>>{
      for (final ring in liveRadarRings) ring.id: _items.where((item) => item.ring.id == ring.id).toList(),
    };
    return Column(children: [
      _RadarControls(
        urgent: _filters.urgent,
        filtersCount: _filters.activeCount,
        paused: _paused,
        loading: _loading,
        radarView: _radarView,
        onUrgent: _toggleUrgent,
        onFilters: _openFilters,
        onRefresh: _paused ? _resume : () => _scan(refreshLocation: true),
        onToggleView: () => setState(() => _radarView = !_radarView),
      ),
      _RadarLocationLine(
        city: _locationLabel,
        approximate: _usingFallbackLocation,
        radiusKm: _filters.maxRadiusKm,
        results: _items.length,
        paused: _paused,
        countdownSeconds: _countdownSeconds,
      ),
      if (_paused) _RadarPausedBanner(reason: _pauseReason ?? '${_items.length} résultat${_items.length > 1 ? 's' : ''} trouvés. Relancez pour voir les nouveautés.', onResume: _resume),
      Expanded(
        child: RefreshIndicator(
          onRefresh: () => _scan(refreshLocation: true),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 112),
            children: [
              if (_loading && _items.isEmpty)
                const Padding(padding: EdgeInsets.only(top: 68), child: Center(child: CircularProgressIndicator()))
              else ...[
                if (_radarView) ...[
                  LiveRadarCanvas(items: _items, maxRadiusKm: _filters.maxRadiusKm, scanning: !_paused && !_loading, onPick: _openItem),
                  const SizedBox(height: 12),
                  _RadarLegend(groups: grouped),
                  const SizedBox(height: 18),
                ],
                for (final ring in liveRadarRings)
                  if (!_radarView || grouped[ring.id]!.isNotEmpty)
                    _RadarRingSection(ring: ring, items: grouped[ring.id]!, onPick: _openItem),
                if (_items.isEmpty && !_loading) _RadarEmpty(onAdjustFilters: _openFilters, onUrgent: _toggleUrgent),
              ],
            ],
          ),
        ),
      ),
    ]);
  }
}

class _RadarControls extends StatelessWidget {
  const _RadarControls({
    required this.urgent,
    required this.filtersCount,
    required this.paused,
    required this.loading,
    required this.radarView,
    required this.onUrgent,
    required this.onFilters,
    required this.onRefresh,
    required this.onToggleView,
  });
  final bool urgent;
  final int filtersCount;
  final bool paused;
  final bool loading;
  final bool radarView;
  final VoidCallback onUrgent;
  final VoidCallback onFilters;
  final VoidCallback onRefresh;
  final VoidCallback onToggleView;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 7),
        child: Row(children: [
          FilterChip(
            selected: urgent,
            onSelected: (_) => onUrgent(),
            avatar: Icon(Icons.sos_rounded, size: 17, color: urgent ? Colors.white : legacy.WaouhColors.red),
            label: const Text('Urgence', style: TextStyle(fontWeight: FontWeight.w800)),
            selectedColor: legacy.WaouhColors.red,
            labelStyle: TextStyle(color: urgent ? Colors.white : legacy.WaouhColors.ink),
          ),
          const SizedBox(width: 8),
          OutlinedButton.icon(
            onPressed: onFilters,
            icon: Stack(clipBehavior: Clip.none, children: [
              const Icon(Icons.tune_rounded, size: 18),
              if (filtersCount > 0) Positioned(right: -7, top: -7, child: _MiniCount(value: filtersCount)),
            ]),
            label: const Text('Filtres'),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            onPressed: loading ? null : onRefresh,
            style: OutlinedButton.styleFrom(minimumSize: const Size(44, 40), padding: EdgeInsets.zero),
            child: loading
                ? const SizedBox(width: 17, height: 17, child: CircularProgressIndicator(strokeWidth: 2))
                : Icon(paused ? Icons.play_arrow_rounded : Icons.refresh_rounded),
          ),
          const SizedBox(width: 8),
          SegmentedButton<bool>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: true, icon: Icon(Icons.radar_rounded, size: 17), tooltip: 'Vue radar'),
              ButtonSegment(value: false, icon: Icon(Icons.view_list_rounded, size: 17), tooltip: 'Vue liste'),
            ],
            selected: {radarView},
            onSelectionChanged: (_) => onToggleView(),
            style: const ButtonStyle(visualDensity: VisualDensity.compact),
          ),
        ]),
      );
}

class _RadarLocationLine extends StatelessWidget {
  const _RadarLocationLine({required this.city, required this.approximate, required this.radiusKm, required this.results, required this.paused, required this.countdownSeconds});
  final String city;
  final bool approximate;
  final int radiusKm;
  final int results;
  final bool paused;
  final int countdownSeconds;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(18, 0, 18, 8),
        child: Row(children: [
          const Icon(Icons.location_on_outlined, size: 14, color: legacy.WaouhColors.muted),
          const SizedBox(width: 4),
          Expanded(child: Text('Autour de $city${approximate ? ' · position approximative' : ''} · portée $radiusKm km · $results résultat${results > 1 ? 's' : ''}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, color: legacy.WaouhColors.muted, fontWeight: FontWeight.w600))),
          if (!paused && countdownSeconds > 0) ...[
            const SizedBox(width: 8),
            Text('pause dans ${countdownSeconds}s', style: const TextStyle(fontSize: 10.5, color: legacy.WaouhColors.jade, fontWeight: FontWeight.w800)),
          ],
        ]),
      );
}

class _RadarPausedBanner extends StatelessWidget {
  const _RadarPausedBanner({required this.reason, required this.onResume});
  final String reason;
  final VoidCallback onResume;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.fromLTRB(14, 3, 14, 6),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFFEAF9F1), border: Border.all(color: const Color(0xFFC4EAD6)), borderRadius: BorderRadius.circular(16)),
        child: Row(children: [
          const Icon(Icons.pause_circle_outline_rounded, color: legacy.WaouhColors.jade),
          const SizedBox(width: 9),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('📡 Radar en pause', style: TextStyle(fontWeight: FontWeight.w900, color: legacy.WaouhColors.deep)),
            const SizedBox(height: 2),
            Text(reason, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, color: legacy.WaouhColors.muted)),
          ])),
          const SizedBox(width: 8),
          FilledButton.icon(onPressed: onResume, icon: const Icon(Icons.play_arrow_rounded, size: 17), label: const Text('Relancer'), style: FilledButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 10))),
        ]),
      );
}

class _RadarLegend extends StatelessWidget {
  const _RadarLegend({required this.groups});
  final Map<int, List<LiveRadarItem>> groups;

  @override
  Widget build(BuildContext context) => GridView.count(
        shrinkWrap: true,
        crossAxisCount: 2,
        childAspectRatio: 3.6,
        mainAxisSpacing: 7,
        crossAxisSpacing: 7,
        physics: const NeverScrollableScrollPhysics(),
        children: liveRadarRings.map((ring) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(border: Border.all(color: const Color(0xFFD8E5DF)), borderRadius: BorderRadius.circular(11), color: Colors.white),
          child: Row(children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: Color(ring.colorValue), shape: BoxShape.circle)),
            const SizedBox(width: 6),
            Expanded(child: Text(ring.label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))),
            Text('${groups[ring.id]?.length ?? 0}', style: const TextStyle(fontWeight: FontWeight.w900)),
          ]),
        )).toList(),
      );
}

class _RadarRingSection extends StatelessWidget {
  const _RadarRingSection({required this.ring, required this.items, required this.onPick});
  final LiveRadarRing ring;
  final List<LiveRadarItem> items;
  final ValueChanged<LiveRadarItem> onPick;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 18),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 9, height: 9, decoration: BoxDecoration(color: Color(ring.colorValue), shape: BoxShape.circle)),
            const SizedBox(width: 7),
            Text('${ring.label} · ${items.length}', style: TextStyle(fontWeight: FontWeight.w900, color: Color(ring.colorValue), fontSize: 13)),
          ]),
          const SizedBox(height: 8),
          if (items.isEmpty)
            const Padding(padding: EdgeInsets.symmetric(horizontal: 2, vertical: 8), child: Text('Aucune opportunité dans ce rayon.', style: TextStyle(fontSize: 12, color: legacy.WaouhColors.muted)))
          else
            GridView.builder(
              itemCount: math.min(items.length, 12),
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 9, crossAxisSpacing: 9, childAspectRatio: .79),
              itemBuilder: (_, index) => _RadarItemCard(item: items[index], onTap: () => onPick(items[index])),
            ),
        ]),
      );
}

class _RadarItemCard extends StatelessWidget {
  const _RadarItemCard({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        clipBehavior: Clip.antiAlias,
        margin: EdgeInsets.zero,
        child: InkWell(
          onTap: onTap,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: Stack(fit: StackFit.expand, children: [
              _RadarImage(url: item.photoUrl),
              Positioned(left: 7, top: 7, child: _DistancePill(label: item.distanceLabel, color: Color(item.ring.colorValue))),
              Positioned(right: 6, bottom: 6, child: Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3), decoration: BoxDecoration(color: Colors.black.withOpacity(.62), borderRadius: BorderRadius.circular(8)), child: Text(item.typeLabel, style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.w800))),
            ])),
            Padding(
              padding: const EdgeInsets.fromLTRB(9, 8, 8, 8),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 12.5)),
                const SizedBox(height: 2),
                Text(item.priceLabel.isEmpty ? (item.city ?? 'À proximité') : item.priceLabel, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: legacy.WaouhColors.jade, fontSize: 11, fontWeight: FontWeight.w800)),
              ]),
            ),
          ]),
        ),
      );
}

class _RadarEmpty extends StatelessWidget {
  const _RadarEmpty({required this.onAdjustFilters, required this.onUrgent});
  final VoidCallback onAdjustFilters;
  final VoidCallback onUrgent;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 62),
        child: Column(children: [
          const Icon(Icons.radar_rounded, size: 54, color: Color(0xFF9FB7AE)),
          const SizedBox(height: 14),
          const Text('Aucun résultat dans la zone', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 7),
          const Text('Élargissez les filtres ou activez le mode Urgence.', textAlign: TextAlign.center, style: TextStyle(color: legacy.WaouhColors.muted)),
          const SizedBox(height: 18),
          Wrap(spacing: 10, children: [
            OutlinedButton.icon(onPressed: onAdjustFilters, icon: const Icon(Icons.tune_rounded), label: const Text('Filtres')),
            FilledButton.icon(onPressed: onUrgent, icon: const Icon(Icons.sos_rounded), label: const Text('Urgence')),
          ]),
        ]),
      );
}

class LiveRadarCanvas extends StatefulWidget {
  const LiveRadarCanvas({super.key, required this.items, required this.maxRadiusKm, required this.scanning, required this.onPick});
  final List<LiveRadarItem> items;
  final int maxRadiusKm;
  final bool scanning;
  final ValueChanged<LiveRadarItem> onPick;

  @override
  State<LiveRadarCanvas> createState() => _LiveRadarCanvasState();
}

class _LiveRadarCanvasState extends State<LiveRadarCanvas> with SingleTickerProviderStateMixin {
  late final AnimationController _sweep = AnimationController(vsync: this, duration: const Duration(milliseconds: 5600))..repeat();

  @override
  void dispose() { _sweep.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (_, constraints) {
          final size = math.min(340.0, constraints.maxWidth);
          final center = size / 2;
          final radius = center - 10;
          final displayed = widget.items.take(28).toList();
          return Center(
            child: SizedBox(
              width: size,
              height: size,
              child: Stack(children: [
                RepaintBoundary(child: CustomPaint(size: Size.square(size), painter: _RadarPainter(animation: _sweep, maxRadiusKm: widget.maxRadiusKm, scanning: widget.scanning))),
                ...displayed.map((item) {
                  final ratio = math.log(1 + item.distanceKm) / math.log(1 + widget.maxRadiusKm);
                  final nodeRadius = math.max(29.0, math.min(radius, ratio * radius));
                  final theta = (item.bearing - 90) * math.pi / 180;
                  final x = center + nodeRadius * math.cos(theta);
                  final y = center + nodeRadius * math.sin(theta);
                  return Positioned(
                    left: x - 22,
                    top: y - 22,
                    child: _RadarNode(item: item, onTap: () => widget.onPick(item)),
                  );
                }),
              ]),
            ),
          );
        },
      );
}

class _RadarPainter extends CustomPainter {
  const _RadarPainter({required this.animation, required this.maxRadiusKm, required this.scanning}) : super(repaint: animation);
  final Animation<double> animation;
  final int maxRadiusKm;
  final bool scanning;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxRadius = size.width / 2 - 10;
    final background = Paint()..shader = ui.Gradient.radial(center, maxRadius, const [Color(0x5521A87E), Color(0x0A043C33)]);
    canvas.drawCircle(center, maxRadius, background);
    final cross = Paint()..color = const Color(0x18061411)..strokeWidth = 1;
    canvas.drawLine(Offset(center.dx, 5), Offset(center.dx, size.height - 5), cross);
    canvas.drawLine(Offset(5, center.dy), Offset(size.width - 5, center.dy), cross);
    for (final ring in liveRadarRings) {
      final ratio = math.log(1 + math.min(ring.maxKm, maxRadiusKm)) / math.log(1 + maxRadiusKm);
      final radius = ratio * maxRadius;
      final paint = Paint()..color = Color(ring.colorValue).withOpacity(.38)..style = PaintingStyle.stroke..strokeWidth = 1.3;
      canvas.drawCircle(center, radius, paint);
      _paintLabel(canvas, ring.label, Offset(center.dx + radius - 35, center.dy - 16), Color(ring.colorValue));
    }
    if (scanning) {
      final start = animation.value * math.pi * 2;
      final path = Path()..moveTo(center.dx, center.dy)..lineTo(center.dx + maxRadius * math.cos(start), center.dy + maxRadius * math.sin(start))..arcTo(Rect.fromCircle(center: center, radius: maxRadius), start, math.pi / 3.6, false)..close();
      canvas.drawPath(path, Paint()..color = const Color(0x5C24E58F));
    }
    final pulse = 9 + (animation.value * 13);
    canvas.drawCircle(center, pulse, Paint()..color = const Color(0x4624E58F)..style = PaintingStyle.stroke..strokeWidth = 1.5);
    canvas.drawCircle(center, 6, Paint()..color = const Color(0xFF0A7C5B));
  }

  void _paintLabel(Canvas canvas, String value, Offset offset, Color color) {
    final painter = TextPainter(text: TextSpan(text: value, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w800)), textDirection: TextDirection.ltr)..layout(maxWidth: 46);
    painter.paint(canvas, offset);
  }

  @override
  bool shouldRepaint(covariant _RadarPainter old) => old.maxRadiusKm != maxRadiusKm || old.scanning != scanning;
}

class _RadarNode extends StatelessWidget {
  const _RadarNode({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkResponse(
        onTap: onTap,
        radius: 27,
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Color(item.ring.colorValue), width: 2.5), boxShadow: [BoxShadow(color: Colors.black.withOpacity(.2), blurRadius: 7, offset: const Offset(0, 2))]),
          child: ClipOval(child: _RadarImage(url: item.photoUrl)),
        ),
      );
}

class _RadarImage extends StatelessWidget {
  const _RadarImage({this.url});
  final String? url;

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) return const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF24A87C), Color(0xFF075E54)])), child: Center(child: Icon(Icons.radar_rounded, color: Colors.white)));
    return Image.network(url!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF24A87C), Color(0xFF075E54)])), child: Center(child: Icon(Icons.radar_rounded, color: Colors.white))));
  }
}

class _DistancePill extends StatelessWidget {
  const _DistancePill({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(999)),
        child: Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900)),
      );
}

class _MiniCount extends StatelessWidget {
  const _MiniCount({required this.value});
  final int value;

  @override
  Widget build(BuildContext context) => Container(width: 15, height: 15, alignment: Alignment.center, decoration: const BoxDecoration(color: legacy.WaouhColors.red, shape: BoxShape.circle), child: Text('$value', style: const TextStyle(color: Colors.white, fontSize: 8.5, fontWeight: FontWeight.w900)));
}

enum _RadarIntent { interest, negotiate, buy }

class _RadarItemSheet extends StatelessWidget {
  const _RadarItemSheet({required this.item});
  final LiveRadarItem item;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .84),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(26))),
          child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(margin: const EdgeInsets.only(top: 10), width: 42, height: 4, decoration: BoxDecoration(color: const Color(0xFFC9D8D2), borderRadius: BorderRadius.circular(99)))),
            if (item.photoUrl != null && item.photoUrl!.isNotEmpty)
              Stack(children: [
                SizedBox(height: 220, width: double.infinity, child: _RadarImage(url: item.photoUrl)),
                Positioned(left: 14, top: 14, child: _DistancePill(label: item.distanceLabel, color: Color(item.ring.colorValue))),
                Positioned(right: 14, top: 14, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: Colors.black.withOpacity(.65), borderRadius: BorderRadius.circular(999)), child: Text(item.typeLabel, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)))),
              ]),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 22),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, height: 1.16)),
                if (item.priceLabel.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(item.priceLabel, style: const TextStyle(color: legacy.WaouhColors.jade, fontSize: 18, fontWeight: FontWeight.w900)),
                ],
                if ((item.description ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(item.description!, maxLines: 4, overflow: TextOverflow.ellipsis, style: const TextStyle(color: legacy.WaouhColors.muted, height: 1.35)),
                ],
                const SizedBox(height: 14),
                Wrap(spacing: 14, runSpacing: 8, children: [
                  _Meta(icon: Icons.location_on_outlined, label: '${item.city ?? '—'}${item.district == null ? '' : ' · ${item.district}'}'),
                  _Meta(icon: Icons.schedule_outlined, label: 'Mis à jour il y a ${liveRadarFreshness(item.freshnessMs)}'),
                  if (item.sellerName != null && item.sellerName!.isNotEmpty) _Meta(icon: Icons.person_outline_rounded, label: item.sellerName!),
                ]),
                const SizedBox(height: 18),
                Row(children: [
                  Expanded(child: OutlinedButton.icon(onPressed: () => Navigator.pop(context, _RadarIntent.interest), icon: const Icon(Icons.chat_bubble_outline_rounded, size: 17), label: const Text('Intéressé'))),
                  const SizedBox(width: 8),
                  Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context, _RadarIntent.negotiate), child: const Text('Négocier'))),
                  const SizedBox(width: 8),
                  Expanded(child: FilledButton(onPressed: () => Navigator.pop(context, _RadarIntent.buy), child: const Text('Acheter'))),
                ]),
              ]),
            ),
          ])),
        ),
      );
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.label});
  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 14, color: legacy.WaouhColors.muted), const SizedBox(width: 4), ConstrainedBox(constraints: const BoxConstraints(maxWidth: 190), child: Text(label, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, color: legacy.WaouhColors.muted)))]);
}

class _RadarFiltersSheet extends StatefulWidget {
  const _RadarFiltersSheet({required this.value});
  final LiveRadarFilters value;

  @override
  State<_RadarFiltersSheet> createState() => _RadarFiltersSheetState();
}

class _RadarFiltersSheetState extends State<_RadarFiltersSheet> {
  static const _categories = ['Mode', 'Téléphonie', 'Beauté', 'Maison', 'Auto', 'Alimentation', 'Services'];
  late LiveRadarFilters _value = widget.value;
  late final TextEditingController _min = TextEditingController(text: _value.priceMin?.toString() ?? '');
  late final TextEditingController _max = TextEditingController(text: _value.priceMax?.toString() ?? '');

  @override
  void dispose() { _min.dispose(); _max.dispose(); super.dispose(); }

  void _toggleType(LiveRadarItemType type) {
    final next = List<LiveRadarItemType>.from(_value.types);
    next.contains(type) ? next.remove(type) : next.add(type);
    setState(() => _value = _value.copyWith(types: next));
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * .86),
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 18),
          decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(26))),
          child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 42, height: 4, decoration: BoxDecoration(color: const Color(0xFFC9D8D2), borderRadius: BorderRadius.circular(99)))),
            const SizedBox(height: 16),
            const Text('Filtres du Radar', style: TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
            const SizedBox(height: 18),
            const _FilterLabel('Type'),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: LiveRadarItemType.values.map((type) => FilterChip(label: Text(type.label), selected: _value.types.contains(type), onSelected: (_) => _toggleType(type))).toList()),
            const Padding(padding: EdgeInsets.only(top: 5), child: Text('Aucun type sélectionné = tous les résultats.', style: TextStyle(fontSize: 11, color: legacy.WaouhColors.muted))),
            const SizedBox(height: 18),
            const _FilterLabel('Catégorie'),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              ChoiceChip(label: const Text('Toutes'), selected: _value.category == null || _value.category!.isEmpty, onSelected: (_) => setState(() => _value = _value.copyWith(clearCategory: true))),
              ..._categories.map((category) => ChoiceChip(label: Text(category), selected: _value.category == category, onSelected: (_) => setState(() => _value = _value.copyWith(category: category)))),
            ]),
            const SizedBox(height: 18),
            Row(children: [
              Expanded(child: TextField(controller: _min, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Prix min (FCFA)'))),
              const SizedBox(width: 10),
              Expanded(child: TextField(controller: _max, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Prix max (FCFA)'))),
            ]),
            const SizedBox(height: 12),
            SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Photo obligatoire'), value: _value.photoOnly, onChanged: (value) => setState(() => _value = _value.copyWith(photoOnly: value))),
            SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Vendeurs vérifiés uniquement'), value: _value.verifiedOnly, onChanged: (value) => setState(() => _value = _value.copyWith(verifiedOnly: value))),
            const SizedBox(height: 8),
            const _FilterLabel('Auto-pause du radar'),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              (30000, '30 s'), (90000, '90 s'), (300000, '5 min'), (null, 'Jamais'),
            ].map((entry) => ChoiceChip(label: Text(entry.$2), selected: _value.autoPauseMs == entry.$1, onSelected: (_) => setState(() => _value = entry.$1 == null ? _value.copyWith(clearAutoPause: true) : _value.copyWith(autoPauseMs: entry.$1)))).toList()),
            const Padding(padding: EdgeInsets.only(top: 6), child: Text('Le mode Urgence force une pause après 30 secondes.', style: TextStyle(fontSize: 11, color: legacy.WaouhColors.muted))),
            const SizedBox(height: 20),
            FilledButton(onPressed: () {
              final min = num.tryParse(_min.text.trim().replaceAll(' ', '').replaceAll(',', '.'));
              final max = num.tryParse(_max.text.trim().replaceAll(' ', '').replaceAll(',', '.'));
              Navigator.pop(context, _value.copyWith(priceMin: min, clearPriceMin: min == null, priceMax: max, clearPriceMax: max == null));
            }, child: const Text('Appliquer les filtres')),
          ])),
        ),
      );
}

class _FilterLabel extends StatelessWidget {
  const _FilterLabel(this.value);
  final String value;
  @override
  Widget build(BuildContext context) => Text(value.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: .6, color: legacy.WaouhColors.muted));
}
