import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_models.dart';
import 'live_radar_models.dart';
import 'live_radar_service.dart';
import 'radar_filters.dart';
import 'radar_hero.dart';
import 'radar_results.dart';

class RadarView extends StatefulWidget {
  const RadarView({super.key});

  @override
  State<RadarView> createState() => _RadarViewState();
}

class _RadarViewState extends State<RadarView>
    with SingleTickerProviderStateMixin {
  final _service = LiveRadarService(legacy.supabase);
  late final AnimationController _sweep = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 4),
  );

  // Radar is a visual product discovery surface. Do not display blank image
  // cards by default. The user can explicitly disable this filter in settings.
  LiveRadarFilters _filters = const LiveRadarFilters(
    photoOnly: true,
    autoPauseMs: null,
  );
  LiveRadarScanSnapshot? _snapshot;
  bool _loading = false;
  bool _approximate = false;
  double _latitude = 6.3654;
  double _longitude = 2.4183;
  String _place = 'Cotonou';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _scan(refreshLocation: true));
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
        _place = city.isEmpty || city.toLowerCase() == 'autour de vous'
            ? 'Position actuelle'
            : city;
        _approximate = false;
      } else {
        _place = city.isEmpty ? 'Cotonou' : city;
        _approximate = true;
      }
    });
  }

  Future<void> _scan({bool refreshLocation = false}) async {
    if (_loading) return;
    if (refreshLocation) await _resolveLocation();
    if (!mounted) return;
    setState(() => _loading = true);
    _sweep.repeat();
    try {
      final value = await _service.scanSnapshot(
        latitude: _latitude,
        longitude: _longitude,
        filters: _filters,
      );
      if (mounted) setState(() => _snapshot = value);
    } catch (_) {
      if (mounted) {
        setState(() => _snapshot = LiveRadarScanSnapshot(
              items: const [],
              scannedAt: DateTime.now(),
              backendMode: false,
              catalogCount: 0,
              statusCount: 0,
              warning:
                  'Le Radar ne répond pas. Vérifiez la connexion puis relancez.',
            ));
      }
    } finally {
      _sweep.stop();
      _sweep.value = 0;
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openFilters() async {
    final next = await showModalBottomSheet<LiveRadarFilters>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => RadarFilters(value: _filters),
    );
    if (next == null || !mounted) return;
    setState(() => _filters = next);
    await _scan();
  }

  Future<void> _openItem(LiveRadarItem item) async {
    final action = await showRadarItemSheet(context, item);
    if (action == null || !mounted) return;
    final controller = context.read<LiveWaouhController>();
    await controller.startNewChat();
    final counterpartUserId = liveText(
      item.raw['seller_user_id'] ??
          item.raw['owner_user_id'] ??
          item.raw['author_user_id'] ??
          item.raw['user_id'],
    ).trim();
    final currentUserId = (controller.auth.user?.id ?? '').trim();
    final isBuyerRequest = item.type == LiveRadarItemType.buy ||
        liveText(item.raw['status_type']).trim().toLowerCase() == 'buy';
    final flowAction = switch (action) {
      RadarItemAction.interested => 'interested',
      RadarItemAction.negotiate => 'negotiate',
      RadarItemAction.contact => isBuyerRequest ? 'propose' : 'contact',
    };
    final buyerUserId = isBuyerRequest ? counterpartUserId : currentUserId;
    final sellerUserId = isBuyerRequest ? currentUserId : counterpartUserId;
    controller.setComposerSeed(
      action == RadarItemAction.negotiate
          ? 'Je souhaite négocier « ${item.title} » à ${item.distanceLabel}.'
          : action == RadarItemAction.contact
              ? 'Je souhaite contacter le vendeur de « ${item.title} ».'
              : 'Je suis intéressé par « ${item.title} » à ${item.distanceLabel}.',
      meta: {
        'source': 'flutter_radar_backend',
        'origin_surface': 'flutter_radar',
        'source_id': item.sourceId,
        'auto_send': true,
        'action': flowAction,
        'intent': flowAction,
        'radar_intent': flowAction,
        'radar_item_id': item.id,
        'radar_source': item.source,
        if (item.source == 'status') 'status_id': item.sourceId,
        if (!isBuyerRequest) 'article_id': item.articleId,
        'title': item.title,
        'distance': item.distanceLabel,
        if (item.priceMin != null) 'price': item.priceMin,
        'currency': item.currency ?? 'FCFA',
        if (item.city != null) 'city': item.city,
        if (item.photoUrls.isNotEmpty) 'photos': item.photoUrls,
        if (buyerUserId.isNotEmpty) 'buyer_user_id': buyerUserId,
        if (sellerUserId.isNotEmpty) 'seller_user_id': sellerUserId,
        if (counterpartUserId.isNotEmpty)
          'counterpart_user_id': counterpartUserId,
        'role': isBuyerRequest ? 'seller' : 'buyer',
      },
    );
    if (!mounted) return;
    if (!context.read<legacy.AuthController>().signedIn) {
      context.push(
        '/app/auth?next=${Uri.encodeComponent('/app/chat/waouh')}',
      );
      return;
    }
    await context.push('/app/chat/waouh');
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = _snapshot;
    final items = snapshot?.items ?? const <LiveRadarItem>[];
    return RefreshIndicator(
      onRefresh: () => _scan(refreshLocation: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          RadarHero(
            animation: _sweep,
            loading: _loading,
            items: items,
            radiusKm: _filters.maxRadiusKm,
            place: _place,
            approximate: _approximate,
            backendMode: snapshot?.backendMode ?? false,
            scannedAt: snapshot?.scannedAt,
            onScan: () => _scan(refreshLocation: true),
            onItemTap: _openItem,
          ),
          const SizedBox(height: 12),
          RadarControls(
            filters: _filters,
            loading: _loading,
            onFilters: _openFilters,
            onUrgent: () async {
              setState(
                  () => _filters = _filters.copyWith(urgent: !_filters.urgent));
              await _scan(refreshLocation: true);
            },
            onRefresh: () => _scan(refreshLocation: true),
          ),
          if ((snapshot?.warning ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            RadarNotice(
                text: snapshot!.warning!, backendMode: snapshot.backendMode),
          ],
          const SizedBox(height: 18),
          Row(children: [
            const Expanded(
                child: Text('Opportunités détectées',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w900))),
            Text('${items.length}',
                style: const TextStyle(
                    color: Color(0xFF08756A),
                    fontSize: 17,
                    fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 10),
          if (_loading && snapshot == null)
            const Padding(
                padding: EdgeInsets.symmetric(vertical: 42),
                child: Center(child: CircularProgressIndicator()))
          else if (items.isEmpty)
            RadarEmpty(
                radiusKm: _filters.maxRadiusKm,
                onFilters: _openFilters,
                onScan: () => _scan(refreshLocation: true))
          else
            RadarResults(items: items, onTap: _openItem),
        ],
      ),
    );
  }
}
