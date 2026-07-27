import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_models.dart';
import 'live_radar_models.dart';

class LiveRadarScanSnapshot {
  const LiveRadarScanSnapshot({
    required this.items,
    required this.scannedAt,
    required this.backendMode,
    required this.catalogCount,
    required this.statusCount,
    this.warning,
  });

  final List<LiveRadarItem> items;
  final DateTime scannedAt;
  final bool backendMode;
  final int catalogCount;
  final int statusCount;
  final String? warning;

  int get sourceCount => catalogCount + statusCount;
}

class LiveRadarService {
  const LiveRadarService(this.client);

  final SupabaseClient client;

  Future<List<LiveRadarItem>> scan({
    required double latitude,
    required double longitude,
    required LiveRadarFilters filters,
  }) async =>
      (await scanSnapshot(
              latitude: latitude, longitude: longitude, filters: filters))
          .items;

  Future<LiveRadarScanSnapshot> scanSnapshot({
    required double latitude,
    required double longitude,
    required LiveRadarFilters filters,
  }) async {
    try {
      final response =
          await client.functions.invoke('waouh-radar-nearby', body: {
        'latitude': latitude,
        'longitude': longitude,
        'radius_km': filters.effectiveRadiusKm,
        'types': filters.types
            .map((item) => switch (item) {
                  LiveRadarItemType.sell => 'sell',
                  LiveRadarItemType.buy => 'buy',
                  LiveRadarItemType.status => 'status',
                })
            .toList(),
        'category': filters.category,
        'photo_only': filters.photoOnly,
        'verified_only': filters.verifiedOnly,
      }).timeout(const Duration(seconds: 12));
      final raw = response.data;
      if (raw is Map && raw['ok'] == true) {
        final items = (raw['items'] is List ? raw['items'] as List : const [])
            .whereType<Map>()
            .map((item) => _apiItem(Map<String, dynamic>.from(item)))
            .whereType<LiveRadarItem>()
            .toList()
          ..sort((a, b) => b.score.compareTo(a.score));
        final sources = raw['sources'];
        final catalog = sources is Map && sources['catalog'] is Map
            ? Map<String, dynamic>.from(sources['catalog'] as Map)
            : const <String, dynamic>{};
        final statuses = sources is Map && sources['statuses'] is Map
            ? Map<String, dynamic>.from(sources['statuses'] as Map)
            : const <String, dynamic>{};
        final warnings = [catalog['error'], statuses['error']]
            .whereType<String>()
            .where((item) => item.trim().isNotEmpty)
            .join(' · ');
        return LiveRadarScanSnapshot(
          items: items,
          scannedAt:
              DateTime.tryParse('${raw['generated_at'] ?? ''}')?.toLocal() ??
                  DateTime.now(),
          backendMode: true,
          catalogCount: _int(catalog['count']),
          statusCount: _int(statuses['count']),
          warning: warnings.isEmpty ? null : warnings,
        );
      }
      throw StateError(raw is Map
          ? '${raw['error'] ?? 'Réponse Radar invalide.'}'
          : 'Réponse Radar invalide.');
    } catch (backendError) {
      final direct = await _directSnapshot(
          latitude: latitude, longitude: longitude, filters: filters);
      return LiveRadarScanSnapshot(
        items: direct.items,
        scannedAt: direct.scannedAt,
        backendMode: false,
        catalogCount: direct.catalogCount,
        statusCount: direct.statusCount,
        warning: 'Mode local temporaire : ${_cleanError(backendError)}',
      );
    }
  }

  Future<LiveRadarScanSnapshot> _directSnapshot({
    required double latitude,
    required double longitude,
    required LiveRadarFilters filters,
  }) async {
    final bounds = liveRadarBounds(
        latitude, longitude, filters.effectiveRadiusKm.toDouble());
    final wantCatalog = filters.types.isEmpty ||
        filters.types.any((type) => type != LiveRadarItemType.status);
    final wantStatus = filters.types.isEmpty ||
        filters.types.contains(LiveRadarItemType.status);
    final results = await Future.wait<List<Map<String, dynamic>>>([
      wantCatalog ? _catalogRows(bounds) : Future.value(const []),
      wantStatus ? _statusRows(bounds) : Future.value(const []),
    ]);
    final now = DateTime.now();
    final out = <LiveRadarItem>[];
    for (final row in results[0]) {
      final item = _catalogItem(row, latitude, longitude, now, filters);
      if (item != null) out.add(item);
    }
    for (final row in results[1]) {
      final item = _statusItem(row, latitude, longitude, now, filters);
      if (item != null) out.add(item);
    }
    out.sort((a, b) => b.score.compareTo(a.score));
    return LiveRadarScanSnapshot(
      items: out,
      scannedAt: now,
      backendMode: false,
      catalogCount: results[0].length,
      statusCount: results[1].length,
    );
  }

  Future<List<Map<String, dynamic>>> _catalogRows(
    ({double minLat, double maxLat, double minLng, double maxLng}) bounds,
  ) async {
    try {
      final response = await client
          .from('waouh_unified_catalog')
          .select(
              'id,type,titre,description,categorie,prix_min,prix_max,devise,ville,quartier,lat,lng,photos,vendeur_nom,vendeur_phone,vendeur_whatsapp,verified,last_seen_at,qualite_score')
          .eq('is_active', true)
          .gte('lat', bounds.minLat)
          .lte('lat', bounds.maxLat)
          .gte('lng', bounds.minLng)
          .lte('lng', bounds.maxLng)
          .order('last_seen_at', ascending: false)
          .limit(120)
          .timeout(const Duration(seconds: 8));
      return (response as List)
          .map((raw) => Map<String, dynamic>.from(raw as Map))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  Future<List<Map<String, dynamic>>> _statusRows(
    ({double minLat, double maxLat, double minLng, double maxLng}) bounds,
  ) async {
    try {
      final response = await client
          .from('waouh_statuses')
          .select(
              'id,user_id,author_name,type,title,caption,price_fcfa,location,lat,lng,media_url,media_urls,article_id,expires_at,created_at')
          .gt('expires_at', DateTime.now().toUtc().toIso8601String())
          .gte('lat', bounds.minLat)
          .lte('lat', bounds.maxLat)
          .gte('lng', bounds.minLng)
          .lte('lng', bounds.maxLng)
          .order('created_at', ascending: false)
          .limit(60)
          .timeout(const Duration(seconds: 8));
      return (response as List)
          .map((raw) => Map<String, dynamic>.from(raw as Map))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  LiveRadarItem? _apiItem(Map<String, dynamic> row) {
    final lat = _doubleOrNull(row['latitude']);
    final lng = _doubleOrNull(row['longitude']);
    final distance = _doubleOrNull(row['distance_km']);
    final bearing = _doubleOrNull(row['bearing']);
    if (lat == null || lng == null || distance == null || bearing == null)
      return null;
    final ringRaw = row['ring'] is Map
        ? Map<String, dynamic>.from(row['ring'] as Map)
        : const <String, dynamic>{};
    final ring = LiveRadarRing(
      id: _int(ringRaw['id']).clamp(1, 5),
      maxKm: _doubleOrNull(ringRaw['max_km']) ?? 10,
      label: '${ringRaw['label'] ?? 'À proximité'}',
      colorValue: _int(ringRaw['color_value']) == 0
          ? 0xFF22C55E
          : _int(ringRaw['color_value']),
    );
    final type = switch ('${row['type'] ?? ''}'.toLowerCase()) {
      'buy' => LiveRadarItemType.buy,
      'status' => LiveRadarItemType.status,
      _ => LiveRadarItemType.sell,
    };
    return LiveRadarItem(
      id: '${row['id'] ?? ''}',
      sourceId: '${row['source_id'] ?? ''}',
      source: '${row['source'] ?? 'backend'}',
      type: type,
      title: '${row['title'] ?? 'Opportunité WAOUH'}',
      description: row['description']?.toString(),
      photoUrl: row['photo_url']?.toString(),
      priceMin: _numOrNull(row['price_min']),
      priceMax: _numOrNull(row['price_max']),
      currency: row['currency']?.toString() ?? 'FCFA',
      city: row['city']?.toString(),
      district: row['district']?.toString(),
      latitude: lat,
      longitude: lng,
      distanceKm: distance,
      bearing: bearing,
      ring: ring,
      freshnessMs: Duration(milliseconds: _int(row['freshness_ms'])),
      score: _doubleOrNull(row['score']) ?? 0,
      sellerName: row['seller_name']?.toString(),
      sellerPhone: row['seller_phone']?.toString(),
      articleId: row['article_id']?.toString(),
      raw: row,
    );
  }

  LiveRadarItem? _catalogItem(
    Map<String, dynamic> row,
    double latitude,
    double longitude,
    DateTime now,
    LiveRadarFilters filters,
  ) {
    final lat = _doubleOrNull(row['lat']);
    final lng = _doubleOrNull(row['lng']);
    if (lat == null || lng == null) return null;
    final sourceType = '${row['type'] ?? ''}'.toLowerCase();
    final type = sourceType == 'demand' || sourceType == 'buy'
        ? LiveRadarItemType.buy
        : LiveRadarItemType.sell;
    if (filters.types.isNotEmpty && !filters.types.contains(type)) return null;
    final category = row['categorie']?.toString();
    if (filters.category != null &&
        filters.category!.isNotEmpty &&
        category != filters.category) return null;
    final priceMin = _numOrNull(row['prix_min']);
    final priceMax = _numOrNull(row['prix_max']);
    if (filters.priceMin != null &&
        (priceMin == null || priceMin < filters.priceMin!)) return null;
    if (filters.priceMax != null &&
        (priceMax == null || priceMax > filters.priceMax!)) return null;
    if (filters.verifiedOnly && row['verified'] != true) return null;
    final photos = liveStringList(row['photos']);
    final photo = photos.isEmpty ? null : photos.first;
    if (filters.photoOnly && photo == null) return null;
    final distance = liveRadarDistanceKm(latitude, longitude, lat, lng);
    if (distance > filters.effectiveRadiusKm) return null;
    final ring = liveRadarRingFor(distance);
    if (ring == null) return null;
    final updated = liveDate(row['last_seen_at']);
    final freshness = now.difference(updated.isAfter(now) ? now : updated);
    final quality =
        (_doubleOrNull(row['qualite_score']) ?? 0.5).clamp(0.0, 1.0);
    return LiveRadarItem(
      id: 'cat:${row['id']}',
      sourceId: '${row['id']}',
      source: 'catalog',
      type: type,
      title: row['titre']?.toString().trim().isNotEmpty == true
          ? row['titre'].toString()
          : '(sans titre)',
      description: row['description']?.toString(),
      photoUrl: photo,
      priceMin: priceMin,
      priceMax: priceMax,
      currency: row['devise']?.toString() ?? 'FCFA',
      city: row['ville']?.toString(),
      district: row['quartier']?.toString(),
      latitude: lat,
      longitude: lng,
      distanceKm: distance,
      bearing: liveRadarBearing(latitude, longitude, lat, lng),
      ring: ring,
      freshnessMs: freshness,
      score: (quality * _expDecay(freshness, const Duration(days: 3))) /
          (1 + distance),
      sellerName: row['vendeur_nom']?.toString(),
      sellerPhone: row['vendeur_whatsapp']?.toString() ??
          row['vendeur_phone']?.toString(),
      articleId: '${row['id']}',
      raw: row,
    );
  }

  LiveRadarItem? _statusItem(
    Map<String, dynamic> row,
    double latitude,
    double longitude,
    DateTime now,
    LiveRadarFilters filters,
  ) {
    final lat = _doubleOrNull(row['lat']);
    final lng = _doubleOrNull(row['lng']);
    if (lat == null || lng == null) return null;
    if (filters.types.isNotEmpty &&
        !filters.types.contains(LiveRadarItemType.status)) return null;
    final photos = liveStringList(row['media_urls']);
    final photo =
        row['media_url']?.toString() ?? (photos.isEmpty ? null : photos.first);
    if (filters.photoOnly && (photo == null || photo.isEmpty)) return null;
    final price = _numOrNull(row['price_fcfa']);
    if (filters.priceMin != null &&
        (price == null || price < filters.priceMin!)) return null;
    if (filters.priceMax != null &&
        (price == null || price > filters.priceMax!)) return null;
    final distance = liveRadarDistanceKm(latitude, longitude, lat, lng);
    if (distance > filters.effectiveRadiusKm) return null;
    final ring = liveRadarRingFor(distance);
    if (ring == null) return null;
    final created = liveDate(row['created_at']);
    final freshness = now.difference(created.isAfter(now) ? now : created);
    return LiveRadarItem(
      id: 'st:${row['id']}',
      sourceId: '${row['id']}',
      source: 'status',
      type: LiveRadarItemType.status,
      title: row['title']?.toString().trim().isNotEmpty == true
          ? row['title'].toString()
          : (row['caption']?.toString().trim().isNotEmpty == true
              ? row['caption'].toString()
              : 'Statut'),
      description: row['caption']?.toString(),
      photoUrl: photo,
      priceMin: price,
      priceMax: price,
      currency: 'FCFA',
      city: row['location']?.toString(),
      latitude: lat,
      longitude: lng,
      distanceKm: distance,
      bearing: liveRadarBearing(latitude, longitude, lat, lng),
      ring: ring,
      freshnessMs: freshness,
      score: (0.6 * _expDecay(freshness, const Duration(hours: 12))) /
          (1 + distance),
      sellerName: row['author_name']?.toString(),
      articleId: row['article_id']?.toString(),
      raw: row,
    );
  }
}

double _expDecay(Duration age, Duration halfLife) {
  final value = age.inMilliseconds / halfLife.inMilliseconds;
  return 1 / (1 + value);
}

double? _doubleOrNull(dynamic value) =>
    value is num ? value.toDouble() : double.tryParse('${value ?? ''}');
num? _numOrNull(dynamic value) =>
    value is num ? value : num.tryParse('${value ?? ''}');
int _int(dynamic value) =>
    value is int ? value : int.tryParse('${value ?? 0}') ?? 0;
String _cleanError(Object error) => '$error'
    .replaceFirst('Bad state: ', '')
    .replaceFirst('FunctionException: ', '');
