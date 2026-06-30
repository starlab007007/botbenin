import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_models.dart';
import 'live_radar_models.dart';

class LiveRadarService {
  const LiveRadarService(this.client);

  final SupabaseClient client;

  Future<List<LiveRadarItem>> scan({
    required double latitude,
    required double longitude,
    required LiveRadarFilters filters,
  }) async {
    final bounds = liveRadarBounds(latitude, longitude, filters.maxRadiusKm.toDouble());
    final wantCatalog = filters.types.isEmpty || filters.types.any((type) => type != LiveRadarItemType.status);
    final wantStatus = filters.types.isEmpty || filters.types.contains(LiveRadarItemType.status);

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

    out.sort((a, b) {
      final ringOrder = a.ring.id.compareTo(b.ring.id);
      return ringOrder != 0 ? ringOrder : b.score.compareTo(a.score);
    });
    return out;
  }

  Future<List<Map<String, dynamic>>> _catalogRows(
    ({double minLat, double maxLat, double minLng, double maxLng}) bounds,
  ) async {
    try {
      final response = await client
          .from('waouh_unified_catalog')
          .select('id,type,titre,description,categorie,prix_min,prix_max,devise,ville,quartier,lat,lng,photos,vendeur_nom,vendeur_phone,vendeur_whatsapp,verified,last_seen_at,qualite_score')
          .eq('is_active', true)
          .gte('lat', bounds.minLat)
          .lte('lat', bounds.maxLat)
          .gte('lng', bounds.minLng)
          .lte('lng', bounds.maxLng)
          .order('last_seen_at', ascending: false)
          .limit(120);
      return (response as List).map((raw) => Map<String, dynamic>.from(raw as Map)).toList();
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
          .select('id,user_id,author_name,type,title,caption,price_fcfa,location,lat,lng,media_url,media_urls,article_id,expires_at,created_at')
          .gt('expires_at', DateTime.now().toUtc().toIso8601String())
          .gte('lat', bounds.minLat)
          .lte('lat', bounds.maxLat)
          .gte('lng', bounds.minLng)
          .lte('lng', bounds.maxLng)
          .order('created_at', ascending: false)
          .limit(60);
      return (response as List).map((raw) => Map<String, dynamic>.from(raw as Map)).toList();
    } catch (_) {
      return const [];
    }
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
    final type = sourceType == 'demand' || sourceType == 'buy' ? LiveRadarItemType.buy : LiveRadarItemType.sell;
    if (filters.types.isNotEmpty && !filters.types.contains(type)) return null;
    final category = row['categorie']?.toString();
    if (filters.category != null && filters.category!.isNotEmpty && category != filters.category) return null;
    final priceMin = _numOrNull(row['prix_min']);
    final priceMax = _numOrNull(row['prix_max']);
    if (filters.priceMin != null && (priceMin == null || priceMin < filters.priceMin!)) return null;
    if (filters.priceMax != null && (priceMax == null || priceMax > filters.priceMax!)) return null;
    if (filters.verifiedOnly && row['verified'] != true) return null;

    final photos = liveStringList(row['photos']);
    final photo = photos.isEmpty ? null : photos.first;
    if (filters.photoOnly && photo == null) return null;
    final distance = liveRadarDistanceKm(latitude, longitude, lat, lng);
    if (distance > filters.maxRadiusKm) return null;
    final ring = liveRadarRingFor(distance);
    if (ring == null) return null;

    final updated = liveDate(row['last_seen_at']);
    final freshness = now.difference(updated.isAfter(now) ? now : updated);
    final freshScore = _expDecay(freshness, const Duration(days: 3));
    final quality = (_doubleOrNull(row['qualite_score']) ?? 0.5).clamp(0.0, 1.0);
    return LiveRadarItem(
      id: 'cat:${row['id']}',
      sourceId: '${row['id']}',
      source: 'catalog',
      type: type,
      title: row['titre']?.toString().trim().isNotEmpty == true ? row['titre'].toString() : '(sans titre)',
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
      score: (quality * freshScore) / (1 + distance),
      sellerName: row['vendeur_nom']?.toString(),
      sellerPhone: row['vendeur_whatsapp']?.toString() ?? row['vendeur_phone']?.toString(),
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
    if (filters.types.isNotEmpty && !filters.types.contains(LiveRadarItemType.status)) return null;
    final photos = liveStringList(row['media_urls']);
    final photo = row['media_url']?.toString() ?? (photos.isEmpty ? null : photos.first);
    if (filters.photoOnly && (photo == null || photo.isEmpty)) return null;
    final price = _numOrNull(row['price_fcfa']);
    if (filters.priceMin != null && (price == null || price < filters.priceMin!)) return null;
    if (filters.priceMax != null && (price == null || price > filters.priceMax!)) return null;
    final distance = liveRadarDistanceKm(latitude, longitude, lat, lng);
    if (distance > filters.maxRadiusKm) return null;
    final ring = liveRadarRingFor(distance);
    if (ring == null) return null;
    final created = liveDate(row['created_at']);
    final freshness = now.difference(created.isAfter(now) ? now : created);
    final freshScore = _expDecay(freshness, const Duration(hours: 12));
    return LiveRadarItem(
      id: 'st:${row['id']}',
      sourceId: '${row['id']}',
      source: 'status',
      type: LiveRadarItemType.status,
      title: row['title']?.toString().trim().isNotEmpty == true
          ? row['title'].toString()
          : (row['caption']?.toString().trim().isNotEmpty == true ? row['caption'].toString() : 'Statut'),
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
      score: (0.6 * freshScore) / (1 + distance),
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

double? _doubleOrNull(dynamic value) => value is num ? value.toDouble() : double.tryParse('${value ?? ''}');
num? _numOrNull(dynamic value) => value is num ? value : num.tryParse('${value ?? ''}');
