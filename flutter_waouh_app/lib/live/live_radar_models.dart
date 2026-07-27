import 'dart:math' as math;

const _earthRadiusKm = 6371.0;

/// Portées officielles du Radar WAOUH.
const liveRadarRadiusOptionsKm = <double>[0.5, 1, 2, 5, 10];

double normalizeLiveRadarRadiusKm(num? value) {
  final requested = value?.toDouble() ?? 2;
  return liveRadarRadiusOptionsKm.reduce(
    (best, candidate) =>
        (candidate - requested).abs() < (best - requested).abs()
            ? candidate
            : best,
  );
}

String liveRadarRadiusLabel(double radiusKm) {
  if (radiusKm < 1) return '${(radiusKm * 1000).round()} m';
  if (radiusKm == radiusKm.roundToDouble()) return '${radiusKm.round()} km';
  return '${radiusKm.toStringAsFixed(1)} km';
}

enum LiveRadarItemType { sell, buy, status }

extension LiveRadarItemTypeCopy on LiveRadarItemType {
  String get value => switch (this) {
        LiveRadarItemType.sell => 'SELL',
        LiveRadarItemType.buy => 'BUY',
        LiveRadarItemType.status => 'STATUS',
      };

  String get label => switch (this) {
        LiveRadarItemType.sell => 'Ventes',
        LiveRadarItemType.buy => 'Recherches',
        LiveRadarItemType.status => 'Statuts',
      };
}

class LiveRadarRing {
  const LiveRadarRing({
    required this.id,
    required this.maxKm,
    required this.label,
    required this.colorValue,
  });

  final int id;
  final double maxKm;
  final String label;
  final int colorValue;
}

const liveRadarRings = <LiveRadarRing>[
  LiveRadarRing(id: 1, maxKm: .5, label: '≤ 500 m', colorValue: 0xFFEF4444),
  LiveRadarRing(id: 2, maxKm: 1, label: '500 m–1 km', colorValue: 0xFFF97316),
  LiveRadarRing(id: 3, maxKm: 2, label: '1–2 km', colorValue: 0xFFEAB308),
  LiveRadarRing(id: 4, maxKm: 5, label: '2–5 km', colorValue: 0xFF22C55E),
  LiveRadarRing(id: 5, maxKm: 10, label: '5–10 km', colorValue: 0xFF0EA5A4),
];

class LiveRadarFilters {
  const LiveRadarFilters({
    this.category,
    this.priceMin,
    this.priceMax,
    this.types = const [],
    this.verifiedOnly = false,
    this.photoOnly = false,
    this.urgent = false,
    this.radiusKm = 2,
    this.autoPauseMs,
  });

  final String? category;
  final num? priceMin;
  final num? priceMax;
  final List<LiveRadarItemType> types;
  final bool verifiedOnly;
  final bool photoOnly;
  final bool urgent;

  /// Portée choisie hors mode urgence.
  final double radiusKm;

  /// Compatibilité des anciens écrans.
  final int? autoPauseMs;

  /// Le mode urgence limite toujours la recherche à 500 mètres.
  double get effectiveRadiusKm =>
      urgent ? .5 : normalizeLiveRadarRadiusKm(radiusKm);

  /// Maintenu pour les écrans historiques qui attendent un entier.
  /// Le mode urgence limite toujours la recherche à 500 mètres.

  /// Maintenu pour les écrans historiques qui attendent un entier.
  int get maxRadiusKm => effectiveRadiusKm.ceil();

  int get activeCount =>
      (category == null || category!.trim().isEmpty ? 0 : 1) +
      (priceMin == null ? 0 : 1) +
      (priceMax == null ? 0 : 1) +
      (types.isEmpty ? 0 : 1) +
      (verifiedOnly ? 1 : 0) +
      (photoOnly ? 1 : 0);

  LiveRadarFilters copyWith({
    String? category,
    bool clearCategory = false,
    num? priceMin,
    bool clearPriceMin = false,
    num? priceMax,
    bool clearPriceMax = false,
    List<LiveRadarItemType>? types,
    bool? verifiedOnly,
    bool? photoOnly,
    bool? urgent,
    double? radiusKm,
    int? autoPauseMs,
    bool clearAutoPause = false,
  }) =>
      LiveRadarFilters(
        category: clearCategory ? null : (category ?? this.category),
        priceMin: clearPriceMin ? null : (priceMin ?? this.priceMin),
        priceMax: clearPriceMax ? null : (priceMax ?? this.priceMax),
        types: types ?? this.types,
        verifiedOnly: verifiedOnly ?? this.verifiedOnly,
        photoOnly: photoOnly ?? this.photoOnly,
        urgent: urgent ?? this.urgent,
        radiusKm: radiusKm ?? this.radiusKm,
        autoPauseMs: clearAutoPause ? null : (autoPauseMs ?? this.autoPauseMs),
      );

  Map<String, dynamic> toJson() => {
        'category': category,
        'price_min': priceMin,
        'price_max': priceMax,
        'types': types.map((item) => item.value).toList(),
        'verified_only': verifiedOnly,
        'photo_only': photoOnly,
        'urgent': urgent,
        'radius_km': radiusKm,
        'auto_pause_ms': autoPauseMs,
      };

  factory LiveRadarFilters.fromJson(Map<String, dynamic> row) {
    final rawTypes = row['types'];
    final types = rawTypes is List
        ? rawTypes
            .map((raw) => switch ('${raw ?? ''}'.toUpperCase()) {
                  'SELL' => LiveRadarItemType.sell,
                  'BUY' => LiveRadarItemType.buy,
                  'STATUS' => LiveRadarItemType.status,
                  _ => null,
                })
            .whereType<LiveRadarItemType>()
            .toList()
        : const <LiveRadarItemType>[];
    return LiveRadarFilters(
      category: row['category']?.toString(),
      priceMin: _numOrNull(row['price_min']),
      priceMax: _numOrNull(row['price_max']),
      types: types,
      verifiedOnly: row['verified_only'] == true,
      photoOnly: row['photo_only'] == true,
      urgent: row['urgent'] == true,
      radiusKm: normalizeLiveRadarRadiusKm(_numOrNull(row['radius_km'])),
      autoPauseMs: row.containsKey('auto_pause_ms')
          ? _intOrNull(row['auto_pause_ms'])
          : null,
    );
  }
}

class LiveRadarItem {
  const LiveRadarItem({
    required this.id,
    required this.sourceId,
    required this.source,
    required this.type,
    required this.title,
    required this.latitude,
    required this.longitude,
    required this.distanceKm,
    required this.bearing,
    required this.ring,
    required this.freshnessMs,
    required this.score,
    this.description,
    this.photoUrl,
    this.priceMin,
    this.priceMax,
    this.currency,
    this.city,
    this.district,
    this.sellerName,
    this.sellerPhone,
    this.articleId,
    this.raw = const {},
  });

  final String id;
  final String sourceId;
  final String source;
  final LiveRadarItemType type;
  final String title;
  final String? description;
  final String? photoUrl;
  final num? priceMin;
  final num? priceMax;
  final String? currency;
  final String? city;
  final String? district;
  final double latitude;
  final double longitude;
  final double distanceKm;
  final double bearing;
  final LiveRadarRing ring;
  final Duration freshnessMs;
  final double score;
  final String? sellerName;
  final String? sellerPhone;
  final String? articleId;
  final Map<String, dynamic> raw;

  String get typeLabel => switch (type) {
        LiveRadarItemType.sell => 'Vente',
        LiveRadarItemType.buy => 'Recherche',
        LiveRadarItemType.status => 'Statut',
      };

  String get distanceLabel => liveRadarDistance(distanceKm);

  String get priceLabel {
    if (priceMin == null && priceMax == null) return '';
    final unit = currency == null || currency!.isEmpty ? 'FCFA' : currency!;
    if (priceMin != null && priceMax != null && priceMin != priceMax) {
      return '${liveRadarMoney(priceMin!)}–${liveRadarMoney(priceMax!)} $unit';
    }
    return '${liveRadarMoney(priceMin ?? priceMax!)} $unit';
  }
}

double liveRadarDistanceKm(double lat1, double lng1, double lat2, double lng2) {
  final dLat = _rad(lat2 - lat1);
  final dLng = _rad(lng2 - lng1);
  final a = math.pow(math.sin(dLat / 2), 2) +
      math.cos(_rad(lat1)) *
          math.cos(_rad(lat2)) *
          math.pow(math.sin(dLng / 2), 2);
  return 2 * _earthRadiusKm * math.asin(math.min(1, math.sqrt(a)));
}

double liveRadarBearing(double lat1, double lng1, double lat2, double lng2) {
  final phi1 = _rad(lat1);
  final phi2 = _rad(lat2);
  final deltaLng = _rad(lng2 - lng1);
  final y = math.sin(deltaLng) * math.cos(phi2);
  final x = math.cos(phi1) * math.sin(phi2) -
      math.sin(phi1) * math.cos(phi2) * math.cos(deltaLng);
  return (_deg(math.atan2(y, x)) + 360) % 360;
}

LiveRadarRing? liveRadarRingFor(double distanceKm) {
  for (final ring in liveRadarRings) {
    if (distanceKm <= ring.maxKm) return ring;
  }
  return null;
}

({double minLat, double maxLat, double minLng, double maxLng}) liveRadarBounds(
    double latitude, double longitude, double radiusKm) {
  final dLat = radiusKm / 110.574;
  final cos = math.cos(_rad(latitude));
  final dLng = radiusKm / (111.32 * (cos == 0 ? 1 : cos));
  return (
    minLat: latitude - dLat,
    maxLat: latitude + dLat,
    minLng: longitude - dLng,
    maxLng: longitude + dLng
  );
}

String liveRadarDistance(double km) {
  if (km < 1) return '${(km * 1000).round()} m';
  if (km < 10) return '${km.toStringAsFixed(1)} km';
  return '${km.round()} km';
}

String liveRadarFreshness(Duration duration) {
  final minutes = duration.inMinutes;
  if (minutes < 60) return '$minutes min';
  final hours = duration.inHours;
  if (hours < 24) return '$hours h';
  return '${duration.inDays} j';
}

String liveRadarMoney(num value) {
  final source = value.toInt().toString();
  final out = StringBuffer();
  for (var index = 0; index < source.length; index++) {
    if (index > 0 && (source.length - index) % 3 == 0) out.write(' ');
    out.write(source[index]);
  }
  return out.toString();
}

double _rad(double value) => value * math.pi / 180;
double _deg(double value) => value * 180 / math.pi;

num? _numOrNull(dynamic value) =>
    value is num ? value : num.tryParse('${value ?? ''}');
int? _intOrNull(dynamic value) =>
    value is int ? value : int.tryParse('${value ?? ''}');
