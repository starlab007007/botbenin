import 'dart:async';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'brand_mark.dart';
import 'live_controller.dart';
import 'live_radar_models.dart';
import 'live_radar_service.dart';

/// Carte Radar native : GPS réel, rayons 1/5/20/100 km et résultats Supabase.
class LiveRadarMapScreen extends StatefulWidget {
  const LiveRadarMapScreen({super.key});

  @override
  State<LiveRadarMapScreen> createState() => _LiveRadarMapScreenState();
}

class _LiveRadarMapScreenState extends State<LiveRadarMapScreen>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  static final LatLng _fallback = LatLng(6.3654, 2.4183);
  static const _refreshEvery = Duration(seconds: 45);

  // Vue quartier : environ 100 à 150 m selon la taille de l'écran.
  static const _neighborhoodZoom = 18.8;

  final _map = MapController();
  late final LiveRadarService _radar = LiveRadarService(legacy.supabase);
  late final AnimationController _sweep = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2600),
  );

  LiveRadarFilters _filters = const LiveRadarFilters(
    photoOnly: false,
    autoPauseMs: null,
  );
  LiveRadarScanSnapshot? _snapshot;
  LatLng _center = _fallback;
  String _locationLabel = 'Cotonou';
  bool _approximate = true;
  bool _loading = true;
  bool _showAll = false;
  String? _error;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refresh(refreshLocation: true);
      _timer = Timer.periodic(
        _refreshEvery,
        (_) => _refresh(refreshLocation: true),
      );
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _sweep.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _refresh(refreshLocation: true);
    }
  }

  Future<void> _resolveLocation() async {
    final controller = context.read<LiveWaouhController>();
    if (!controller.position.available) {
      await controller.useDeviceLocation();
    }
    final position = controller.position;
    final city = (await controller.city).trim();
    if (!mounted) return;

    setState(() {
      if (position.available) {
        _center = LatLng(position.latitude!, position.longitude!);
        _approximate = false;
        _locationLabel = city.isEmpty || city.toLowerCase() == 'autour de vous'
            ? 'Position actuelle'
            : city;
      } else {
        _center = _fallback;
        _approximate = true;
        _locationLabel = city.isEmpty ? 'Cotonou' : city;
      }
    });
  }

  Future<void> _refresh({bool refreshLocation = false}) async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
      _showAll = false;
    });

    _sweep
      ..stop()
      ..value = 0
      ..repeat();

    try {
      if (refreshLocation || _snapshot == null) {
        await _resolveLocation();
      }

      final next = await _radar.scanSnapshot(
        latitude: _center.latitude,
        longitude: _center.longitude,
        filters: _filters,
      );

      if (!mounted) return;
      setState(() => _snapshot = next);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _map.move(_center, _zoomForRadius(_filters.effectiveRadiusKm));
        }
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              'Impossible de synchroniser les opportunités autour de vous.';
        });
      }
    } finally {
      _sweep.stop();
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openFilters() async {
    final next = await showModalBottomSheet<LiveRadarFilters>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _RadarMapFiltersSheet(value: _filters),
    );
    if (next == null || !mounted) return;
    setState(() => _filters = next.copyWith(clearAutoPause: true));
    await _refresh(refreshLocation: true);
  }

  Future<void> _toggleUrgent() async {
    setState(() => _filters = _filters.copyWith(urgent: !_filters.urgent));
    await _refresh(refreshLocation: true);
  }

  Future<void> _openRadiusPicker() async {
    final selected = await showModalBottomSheet<double>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => SafeArea(
        top: false,
        child: Container(
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 22),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFC8D9D2),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Portée de balayage',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            ),
            const SizedBox(height: 5),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                  'Les résultats et la carte se recadrent immédiatement.',
                  style: TextStyle(color: Color(0xFF667A73))),
            ),
            const SizedBox(height: 12),
            ...liveRadarRadiusOptionsKm.map(
              (radius) => ListTile(
                leading: Icon(
                  radius == _filters.effectiveRadiusKm
                      ? Icons.check_circle_rounded
                      : Icons.radar_rounded,
                  color: radius == _filters.effectiveRadiusKm
                      ? const Color(0xFF08756A)
                      : const Color(0xFF667A73),
                ),
                title: Text(liveRadarRadiusLabel(radius),
                    style: const TextStyle(fontWeight: FontWeight.w900)),
                subtitle: Text(switch (radius) {
                  0.5 => 'Urgence et voisinage immédiat',
                  1 => 'Quartier proche',
                  2 => 'Portée recommandée',
                  5 => 'Zone urbaine élargie',
                  _ => 'Recherche dans la ville',
                }),
                onTap: () => Navigator.pop(context, radius),
              ),
            ),
          ]),
        ),
      ),
    );
    if (selected == null || !mounted) return;
    setState(() {
      _filters = _filters.copyWith(radiusKm: selected, urgent: false);
    });
    await _refresh();
  }

  Future<void> _openItem(LiveRadarItem item) async {
    final action = await showModalBottomSheet<_MapRadarAction>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _MapRadarItemSheet(item: item),
    );
    if (action == null || !mounted) return;

    final seed = switch (action) {
      _MapRadarAction.interest =>
        'Je suis intéressé par « ${item.title} » à ${item.distanceLabel}. ',
      _MapRadarAction.negotiate =>
        'Je souhaite négocier « ${item.title} » à ${item.distanceLabel}. ',
      _MapRadarAction.contact =>
        'Bonjour, je souhaite en savoir plus sur « ${item.title} ». ',
    };

    final controller = context.read<LiveWaouhController>();
    controller.setComposerSeed(seed, meta: {
      'source': 'flutter_radar_map',
      'radar_item_id': item.id,
      'radar_source': item.source,
      'radar_intent': action.name,
      'article_id': item.articleId,
      'title': item.title,
      'distance': item.distanceLabel,
    });

    if (!context.read<legacy.AuthController>().signedIn) {
      context.go('/app/auth?next=${Uri.encodeComponent('/app/chat/waouh')}');
      return;
    }
    context.go('/app/chat/waouh');
  }

  void _centerMap() => _map.move(
        _center,
        _zoomForRadius(_filters.effectiveRadiusKm),
      );

  @override
  Widget build(BuildContext context) {
    final snapshot = _snapshot;
    final allItems = snapshot?.items ?? const <LiveRadarItem>[];
    final markerItems = allItems.take(10).toList();
    final sheetItems = _showAll ? allItems : markerItems;

    return Stack(
      children: [
        Positioned.fill(
          child: FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: _zoomForRadius(_filters.effectiveRadiusKm),
              minZoom: 7,
              maxZoom: 19,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.pinchZoom |
                    InteractiveFlag.doubleTapZoom |
                    InteractiveFlag.flingAnimation,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'bj.bot.waouhapp',
                maxNativeZoom: 19,
              ),
              PolygonLayer(
                  polygons: _rings(_center, _filters.effectiveRadiusKm)),
              MarkerLayer(
                markers: [
                  Marker(
                    point: _center,
                    width: 60,
                    height: 60,
                    child: const _CurrentLocationMarker(),
                  ),
                  ...markerItems.map(
                    (item) => Marker(
                      point: LatLng(item.latitude, item.longitude),
                      width: 54,
                      height: 62,
                      child: _ProductMapMarker(
                        item: item,
                        onTap: () => _openItem(item),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Positioned.fill(
          child: IgnorePointer(
            child: _MapRadarSweep(animation: _sweep, active: _loading),
          ),
        ),
        Positioned(
          top: 12,
          left: 16,
          right: 16,
          child: _MapHeader(
            location: _locationLabel,
            approximate: _approximate,
            loading: _loading,
            snapshot: snapshot,
            resultCount: allItems.length,
          ),
        ),
        Positioned(
          top: 92,
          left: 16,
          child: FilledButton.tonalIcon(
            onPressed: _openRadiusPicker,
            icon: const Icon(Icons.route_rounded, size: 18),
            label: Text(
                'Portée ${liveRadarRadiusLabel(_filters.effectiveRadiusKm)}'),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.white.withOpacity(.96),
              foregroundColor: const Color(0xFF075E54),
              elevation: 3,
            ),
          ),
        ),
        Positioned(
          top: 104,
          right: 16,
          child: Column(
            children: [
              _MapActionButton(
                icon: Icons.my_location_rounded,
                tooltip: 'Centrer sur ma position',
                onPressed: _centerMap,
              ),
              const SizedBox(height: 10),
              _MapActionButton(
                icon: Icons.tune_rounded,
                tooltip: 'Filtres Radar',
                badge: _filters.activeCount,
                onPressed: _openFilters,
              ),
              const SizedBox(height: 10),
              _MapActionButton(
                icon: _filters.urgent ? Icons.sos_rounded : Icons.radar_rounded,
                tooltip: 'Mode urgence',
                danger: _filters.urgent,
                onPressed: _toggleUrgent,
              ),
            ],
          ),
        ),
        Positioned(
          left: 16,
          bottom: 220,
          child: FilledButton.icon(
            onPressed: _loading ? null : () => _refresh(refreshLocation: true),
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFF08756A),
              foregroundColor: Colors.white,
              minimumSize: const Size(0, 44),
            ),
            icon: _loading
                ? const SizedBox(
                    height: 17,
                    width: 17,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.refresh_rounded, size: 18),
            label: Text(_loading ? 'Balayage…' : 'Actualiser'),
          ),
        ),
        DraggableScrollableSheet(
          initialChildSize: .27,
          minChildSize: .20,
          maxChildSize: .76,
          builder: (_, scrollController) => _RadarResultsSheet(
            scrollController: scrollController,
            snapshot: snapshot,
            loading: _loading,
            error: _error,
            items: sheetItems,
            allCount: allItems.length,
            showAll: _showAll,
            onToggleAll: () => setState(() => _showAll = !_showAll),
            onItem: _openItem,
            onRefresh: () => _refresh(refreshLocation: true),
          ),
        ),
      ],
    );
  }
}

class _MapHeader extends StatelessWidget {
  const _MapHeader({
    required this.location,
    required this.approximate,
    required this.loading,
    required this.snapshot,
    required this.resultCount,
  });

  final String location;
  final bool approximate;
  final bool loading;
  final LiveRadarScanSnapshot? snapshot;
  final int resultCount;

  @override
  Widget build(BuildContext context) {
    final live = snapshot?.backendMode == true;
    final title = loading
        ? 'Balayage GPS en cours'
        : live
            ? '$resultCount résultat${resultCount > 1 ? 's' : ''} détecté${resultCount > 1 ? 's' : ''}'
            : 'Radar local temporaire';

    return Container(
      padding: const EdgeInsets.fromLTRB(13, 11, 12, 11),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(.96),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2E003D33),
            blurRadius: 18,
            offset: Offset(0, 7),
          ),
        ],
      ),
      child: Row(
        children: [
          const BrandMark(size: 38, semanticLabel: 'WAOUH'),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Radar WAOUH',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16.5),
                ),
                const SizedBox(height: 2),
                Text(
                  '$title · $location',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF08756A),
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: live ? const Color(0xFFDDF8EA) : const Color(0xFFFFF1CC),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  live
                      ? Icons.gps_fixed_rounded
                      : Icons.location_searching_rounded,
                  size: 14,
                  color:
                      live ? const Color(0xFF08756A) : const Color(0xFF976000),
                ),
                const SizedBox(width: 4),
                Text(
                  approximate ? 'GPS estimé' : 'GPS réel',
                  style: TextStyle(
                    color: live
                        ? const Color(0xFF08756A)
                        : const Color(0xFF976000),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MapActionButton extends StatelessWidget {
  const _MapActionButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.badge = 0,
    this.danger = false,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  final int badge;
  final bool danger;

  @override
  Widget build(BuildContext context) => Stack(
        clipBehavior: Clip.none,
        children: [
          Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            elevation: 4,
            child: Tooltip(
              message: tooltip,
              child: IconButton(
                onPressed: onPressed,
                icon: Icon(
                  icon,
                  color: danger
                      ? const Color(0xFFE34A53)
                      : const Color(0xFF08756A),
                ),
              ),
            ),
          ),
          if (badge > 0)
            Positioned(
              right: -4,
              top: -4,
              child: Container(
                width: 18,
                height: 18,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: Color(0xFFE34A53),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  '$badge',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
        ],
      );
}

class _MapRadarSweep extends StatelessWidget {
  const _MapRadarSweep({required this.animation, required this.active});
  final Animation<double> animation;
  final bool active;

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: animation,
        builder: (_, __) => CustomPaint(
          painter: _MapRadarSweepPainter(
            progress: animation.value,
            active: active,
          ),
          child: const SizedBox.expand(),
        ),
      );
}

class _MapRadarSweepPainter extends CustomPainter {
  const _MapRadarSweepPainter({required this.progress, required this.active});
  final double progress;
  final bool active;

  @override
  void paint(Canvas canvas, Size size) {
    if (!active) return;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) * .26;
    final start = progress * math.pi * 2;
    final beam = ui.Path()
      ..moveTo(center.dx, center.dy)
      ..lineTo(
        center.dx + radius * math.cos(start),
        center.dy + radius * math.sin(start),
      )
      ..arcTo(
        Rect.fromCircle(center: center, radius: radius),
        start,
        math.pi / 2.8,
        false,
      )
      ..close();

    canvas.drawPath(beam, Paint()..color = const Color(0x5059FFC8));
    canvas.drawCircle(
      center,
      radius * (.35 + progress * .65),
      Paint()
        ..color = const Color(0x4559FFC8)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(covariant _MapRadarSweepPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.active != active;
}

class _CurrentLocationMarker extends StatelessWidget {
  const _CurrentLocationMarker();

  @override
  Widget build(BuildContext context) => Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: 58,
            height: 58,
            decoration: BoxDecoration(
              color: const Color(0x5521D49B),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF08756A), width: 2),
            ),
          ),
          const BrandMark(size: 40, semanticLabel: 'Votre position WAOUH'),
        ],
      );
}

class _ProductMapMarker extends StatelessWidget {
  const _ProductMapMarker({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: Color(item.ring.colorValue),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2.5),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x44002F27),
                    blurRadius: 8,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: ClipOval(
                child: item.photoUrl == null || item.photoUrl!.trim().isEmpty
                    ? Icon(
                        item.type == LiveRadarItemType.buy
                            ? Icons.search_rounded
                            : item.type == LiveRadarItemType.status
                                ? Icons.auto_awesome_rounded
                                : Icons.sell_outlined,
                        color: Colors.white,
                        size: 23,
                      )
                    : Image.network(
                        item.photoUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.shopping_bag_outlined,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
            Container(
              margin: const EdgeInsets.only(top: 2),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                item.distanceLabel,
                style: const TextStyle(
                  fontSize: 9.5,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF075E54),
                ),
              ),
            ),
          ],
        ),
      );
}

class _RadarResultsSheet extends StatelessWidget {
  const _RadarResultsSheet({
    required this.scrollController,
    required this.snapshot,
    required this.loading,
    required this.error,
    required this.items,
    required this.allCount,
    required this.showAll,
    required this.onToggleAll,
    required this.onItem,
    required this.onRefresh,
  });

  final ScrollController scrollController;
  final LiveRadarScanSnapshot? snapshot;
  final bool loading;
  final String? error;
  final List<LiveRadarItem> items;
  final int allCount;
  final bool showAll;
  final VoidCallback onToggleAll;
  final ValueChanged<LiveRadarItem> onItem;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final live = snapshot?.backendMode == true;
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFFFBFDFC),
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        boxShadow: [
          BoxShadow(
            color: Color(0x2800372F),
            blurRadius: 18,
            offset: Offset(0, -6),
          ),
        ],
      ),
      child: ListView(
        controller: scrollController,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
        children: [
          Center(
            child: Container(
              width: 42,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFC8D9D2),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Opportunités autour de vous',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
              ),
              Text(
                '$allCount',
                style: const TextStyle(
                  color: Color(0xFF08756A),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            loading
                ? 'Recherche des données en cours…'
                : live
                    ? 'Supabase synchronisé · ${snapshot!.catalogCount} catalogue · ${snapshot!.statusCount} statuts'
                    : snapshot?.warning ??
                        error ??
                        'Résultats locaux disponibles',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Color(0xFF667A73), fontSize: 12),
          ),
          const SizedBox(height: 14),
          if (error != null)
            _EmptyRadarState(message: error!, onRefresh: onRefresh)
          else if (loading && items.isEmpty)
            const Padding(
              padding: EdgeInsets.all(26),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (items.isEmpty)
            _EmptyRadarState(
              message:
                  'Aucun produit ou statut ne correspond à cette zone pour le moment.',
              onRefresh: onRefresh,
            )
          else ...[
            ...items.map(
              (item) => _RadarListItem(item: item, onTap: () => onItem(item)),
            ),
            if (allCount > 10) ...[
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onToggleAll,
                  icon: Icon(
                    showAll
                        ? Icons.expand_less_rounded
                        : Icons.expand_more_rounded,
                  ),
                  label: Text(
                    showAll
                        ? 'Réduire la liste'
                        : 'Voir les ${allCount - 10} autres résultats',
                  ),
                ),
              ),
            ],
          ],
          const SizedBox(height: 8),
          const Text(
            'Données cartographiques © OpenStreetMap',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF8A9B95), fontSize: 10.5),
          ),
        ],
      ),
    );
  }
}

class _RadarListItem extends StatelessWidget {
  const _RadarListItem({required this.item, required this.onTap});
  final LiveRadarItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 9),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(9),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(11),
                  child: SizedBox(
                    width: 56,
                    height: 56,
                    child:
                        item.photoUrl == null || item.photoUrl!.trim().isEmpty
                            ? Container(
                                color: Color(item.ring.colorValue),
                                child: Icon(
                                  item.type == LiveRadarItemType.buy
                                      ? Icons.search_rounded
                                      : Icons.shopping_bag_outlined,
                                  color: Colors.white,
                                ),
                              )
                            : Image.network(
                                item.photoUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => Container(
                                  color: Color(item.ring.colorValue),
                                  child: const Icon(
                                    Icons.shopping_bag_outlined,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item.priceLabel.isEmpty
                            ? item.typeLabel
                            : item.priceLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF08756A),
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${item.city ?? 'À proximité'} · ${item.distanceLabel}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF667A73),
                          fontSize: 11.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF6A7D76),
                ),
              ],
            ),
          ),
        ),
      );
}

class _EmptyRadarState extends StatelessWidget {
  const _EmptyRadarState({required this.message, required this.onRefresh});
  final String message;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            const Icon(
              Icons.radar_rounded,
              size: 48,
              color: Color(0xFF8AA79B),
            ),
            const SizedBox(height: 10),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0xFF667A73), height: 1.35),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Actualiser le Radar'),
            ),
          ],
        ),
      );
}

class _MapRadarItemSheet extends StatelessWidget {
  const _MapRadarItemSheet({required this.item});
  final LiveRadarItem item;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * .84,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFC9D8D2),
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (item.photoUrl != null &&
                      item.photoUrl!.trim().isNotEmpty) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: SizedBox(
                        width: double.infinity,
                        height: 196,
                        child: Image.network(
                          item.photoUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) =>
                              _FallbackPhoto(type: item.type),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  Row(
                    children: [
                      _DistanceBadge(
                        label: item.distanceLabel,
                        color: Color(item.ring.colorValue),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        item.typeLabel,
                        style: const TextStyle(
                          color: Color(0xFF667A73),
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 23,
                      fontWeight: FontWeight.w900,
                      height: 1.15,
                    ),
                  ),
                  if (item.priceLabel.isNotEmpty) ...[
                    const SizedBox(height: 7),
                    Text(
                      item.priceLabel,
                      style: const TextStyle(
                        color: Color(0xFF08756A),
                        fontWeight: FontWeight.w900,
                        fontSize: 19,
                      ),
                    ),
                  ],
                  const SizedBox(height: 9),
                  Text(
                    '${item.city ?? 'Localisation non précisée'} · ${item.distanceLabel} · mis à jour il y a ${liveRadarFreshness(item.freshnessMs)}',
                    style: const TextStyle(color: Color(0xFF667A73)),
                  ),
                  if ((item.description ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      item.description!,
                      style: const TextStyle(
                        color: Color(0xFF667A73),
                        height: 1.35,
                      ),
                    ),
                  ],
                  const SizedBox(height: 22),
                  const _MapRadarActions(),
                ],
              ),
            ),
          ),
        ),
      );
}

enum _MapRadarAction { interest, negotiate, contact }

class _MapRadarActions extends StatelessWidget {
  const _MapRadarActions();

  @override
  Widget build(BuildContext context) => LayoutBuilder(
        builder: (_, bounds) {
          if (bounds.maxWidth < 380) {
            return Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () =>
                        Navigator.pop(context, _MapRadarAction.contact),
                    child: const Text('Contacter'),
                  ),
                ),
                const SizedBox(height: 9),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () =>
                            Navigator.pop(context, _MapRadarAction.interest),
                        child: const Text(
                          'Intéressé',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () =>
                            Navigator.pop(context, _MapRadarAction.negotiate),
                        child: const Text(
                          'Négocier',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            );
          }
          return Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () =>
                      Navigator.pop(context, _MapRadarAction.interest),
                  child: const Text(
                    'Intéressé',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () =>
                      Navigator.pop(context, _MapRadarAction.negotiate),
                  child: const Text(
                    'Négocier',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton(
                  onPressed: () =>
                      Navigator.pop(context, _MapRadarAction.contact),
                  child: const Text(
                    'Contacter',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          );
        },
      );
}

class _FallbackPhoto extends StatelessWidget {
  const _FallbackPhoto({required this.type});
  final LiveRadarItemType type;

  @override
  Widget build(BuildContext context) => Container(
        color: const Color(0xFFB5E9D5),
        child: Icon(
          type == LiveRadarItemType.buy
              ? Icons.search_rounded
              : Icons.shopping_bag_outlined,
          color: const Color(0xFF08756A),
          size: 40,
        ),
      );
}

class _DistanceBadge extends StatelessWidget {
  const _DistanceBadge({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: color.withOpacity(.14),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: color.withOpacity(.45)),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w900,
            fontSize: 12,
          ),
        ),
      );
}

class _RadarMapFiltersSheet extends StatefulWidget {
  const _RadarMapFiltersSheet({required this.value});
  final LiveRadarFilters value;

  @override
  State<_RadarMapFiltersSheet> createState() => _RadarMapFiltersSheetState();
}

class _RadarMapFiltersSheetState extends State<_RadarMapFiltersSheet> {
  static const _categories = <String>[
    'Mode',
    'Beauté',
    'Téléphonie',
    'Électronique',
    'Maison',
    'Auto',
    'Alimentation',
    'Services',
  ];

  late LiveRadarFilters _value = widget.value;

  void _toggleType(LiveRadarItemType type) {
    final next = List<LiveRadarItemType>.from(_value.types);
    next.contains(type) ? next.remove(type) : next.add(type);
    setState(() => _value = _value.copyWith(types: next));
  }

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * .83,
          ),
          padding: const EdgeInsets.fromLTRB(18, 10, 18, 18),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 42,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFC8D9D2),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Filtres Radar',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Les réglages s’appliquent aux données Supabase proches de vous.',
                  style: TextStyle(color: Color(0xFF667A73)),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Type',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: LiveRadarItemType.values
                      .map(
                        (type) => FilterChip(
                          label: Text(type.label),
                          selected: _value.types.contains(type),
                          onSelected: (_) => _toggleType(type),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 18),
                const Text(
                  'Catégorie',
                  style: TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Toutes'),
                      selected:
                          _value.category == null || _value.category!.isEmpty,
                      onSelected: (_) => setState(
                        () => _value = _value.copyWith(clearCategory: true),
                      ),
                    ),
                    ..._categories.map(
                      (category) => ChoiceChip(
                        label: Text(category),
                        selected: _value.category == category,
                        onSelected: (_) => setState(
                          () => _value = _value.copyWith(category: category),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  value: _value.photoOnly,
                  onChanged: (value) => setState(
                      () => _value = _value.copyWith(photoOnly: value)),
                  title: const Text(
                    'Photos uniquement',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  value: _value.verifiedOnly,
                  onChanged: (value) => setState(
                    () => _value = _value.copyWith(verifiedOnly: value),
                  ),
                  title: const Text(
                    'Vendeurs vérifiés',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                SwitchListTile.adaptive(
                  contentPadding: EdgeInsets.zero,
                  value: _value.urgent,
                  onChanged: (value) =>
                      setState(() => _value = _value.copyWith(urgent: value)),
                  title: const Text(
                    'Urgence · rayon 5 km',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => Navigator.pop(context, _value),
                    icon: const Icon(Icons.check_rounded),
                    label: const Text('Appliquer et actualiser'),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

List<Polygon> _rings(LatLng center, double radiusKm) {
  final radii = liveRadarRadiusOptionsKm
      .where((value) => value <= radiusKm + .0001)
      .toSet()
      .toList()
    ..sort();

  return radii
      .map(
        (radius) => Polygon(
          points: _geodesicCircle(center, radius),
          color: Colors.transparent,
          borderColor: radius == radiusKm
              ? const Color(0xFF08756A)
              : const Color(0x5579BFA8),
          borderStrokeWidth: radius == radiusKm ? 2 : 1,
        ),
      )
      .toList();
}

List<LatLng> _geodesicCircle(LatLng center, double radiusKm) {
  const earthKm = 6371.0;
  final lat = _radians(center.latitude);
  final lng = _radians(center.longitude);
  final distance = radiusKm / earthKm;

  return List<LatLng>.generate(72, (index) {
    final bearing = 2 * math.pi * index / 72;
    final nextLat = math.asin(
      math.sin(lat) * math.cos(distance) +
          math.cos(lat) * math.sin(distance) * math.cos(bearing),
    );
    final nextLng = lng +
        math.atan2(
          math.sin(bearing) * math.sin(distance) * math.cos(lat),
          math.cos(distance) - math.sin(lat) * math.sin(nextLat),
        );
    return LatLng(_degrees(nextLat), _degrees(nextLng));
  });
}

double _radians(double value) => value * math.pi / 180;
double _degrees(double value) => value * 180 / math.pi;

double _zoomForRadius(double radiusKm) {
  if (radiusKm <= .5) return 15.8;
  if (radiusKm <= 1) return 14.9;
  if (radiusKm <= 2) return 14.0;
  if (radiusKm <= 5) return 12.7;
  return 11.7;
}
