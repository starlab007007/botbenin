import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_nexus_service.dart';

Map<String, dynamic> _miMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

num? _miNum(dynamic value) {
  if (value is num) return value;
  if (value == null) return null;
  return num.tryParse(value.toString());
}

String _fmt(num? value) {
  if (value == null) return '?';
  final rounded = value.round().toString();
  final b = StringBuffer();
  for (var i = 0; i < rounded.length; i += 1) {
    if (i > 0 && (rounded.length - i) % 3 == 0) b.write(' ');
    b.write(rounded[i]);
  }
  return '${b.toString()} FCFA';
}

class LiveMarketIntelligenceSnapshot {
  const LiveMarketIntelligenceSnapshot({
    required this.details,
    required this.market,
    required this.comparison,
    required this.recommendation,
    required this.sources,
    required this.confidence,
  });

  final String details;
  final String market;
  final String comparison;
  final String recommendation;
  final List<String> sources;
  final double confidence;
}

class LiveMarketIntelligenceService {
  LiveMarketIntelligenceService(this.client);

  final SupabaseClient client;

  Future<LiveMarketIntelligenceSnapshot> analyze({
    String? articleId,
    required String title,
    num? offeredPrice,
    String? city,
    String? category,
    String? condition,
    String? availability,
  }) async {
    Map<String, dynamic> priceData = const {};
    NexusDiscoveryResponse? nexus;

    try {
      final response = await client.functions.invoke(
        'waouh-price-compare',
        body: <String, dynamic>{
          if (articleId != null && articleId.trim().isNotEmpty)
            'article_id': articleId.trim(),
          'query': title,
          if (offeredPrice != null) 'offered_price': offeredPrice,
          if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
          if (category != null && category.trim().isNotEmpty)
            'category': category.trim(),
          'fast_mode': true,
        },
      );
      priceData = _miMap(response.data);
    } catch (_) {}

    try {
      if (client.auth.currentUser != null) {
        nexus = await LiveNexusService(client).search(
          query: title,
          findSellers: true,
          smartMode: true,
          city: city,
          budgetMax: offeredPrice?.toDouble(),
          refreshExternal: false,
          limit: 12,
        );
      }
    } catch (_) {}

    final stats = _miMap(priceData['stats']);
    final min = _miNum(priceData['min'] ?? stats['p25'] ?? stats['min']);
    final median = _miNum(priceData['median'] ?? stats['median']);
    final max = _miNum(priceData['max'] ?? stats['p75'] ?? stats['max']);
    final n = (_miNum(stats['n'] ?? stats['sample_count']) ?? 0).round();
    final verdict = _miMap(priceData['verdict']);
    final label = (verdict['label'] ?? verdict['classification'] ?? '').toString().trim();
    final advice = (verdict['advice'] ?? '').toString().trim();

    final sources = <String>{
      ...?nexus?.sourceMix.keys,
      if (priceData['sources'] is List)
        for (final row in (priceData['sources'] as List))
          if (_miMap(row)['source'] != null)
            _miMap(row)['source'].toString(),
    }.where((value) => value.trim().isNotEmpty).toList(growable: false);

    final market = min == null && max == null && median == null
        ? 'Analyse active · aucune fourchette suffisamment fiable pour le moment.'
        : [
            if (min != null || max != null)
              '${_fmt(min)} – ${_fmt(max)}',
            if (median != null) 'médiane ${_fmt(median)}',
            if (n > 0) 'échantillon $n',
            if (sources.isNotEmpty)
              'sources ${sources.take(4).join(', ')}',
          ].join(' · ');

    String comparison = 'Comparaison en cours avec les offres et signaux disponibles.';
    if (offeredPrice != null && median != null && median > 0) {
      final delta = ((offeredPrice - median) / median * 100);
      final abs = delta.abs().round();
      comparison = delta < -3
          ? 'Prix environ $abs % sous la médiane observée.'
          : delta > 3
              ? 'Prix environ $abs % au-dessus de la médiane observée.'
              : 'Prix proche de la médiane observée.';
      if (label.isNotEmpty) comparison += ' · $label';
    } else if (label.isNotEmpty) {
      comparison = label;
    }

    final nexusReasons = nexus?.results
            .take(3)
            .expand((item) => item.scores.reasons)
            .where((value) => value.trim().isNotEmpty)
            .take(3)
            .toList(growable: false) ??
        const <String>[];
    final recommendation = [
      if (advice.isNotEmpty) advice,
      ...nexusReasons,
      if (nexus?.intelligence?.rationale.trim().isNotEmpty == true)
        nexus!.intelligence!.rationale.trim(),
    ].where((value) => value.trim().isNotEmpty).take(3).join(' · ');

    final details = [
      if (condition != null && condition.trim().isNotEmpty)
        'État : ${condition.trim()}',
      if (category != null && category.trim().isNotEmpty)
        'Catégorie : ${category.trim()}',
      if (availability != null && availability.trim().isNotEmpty)
        'Disponibilité : ${availability.trim()}',
      if (city != null && city.trim().isNotEmpty) 'Zone : ${city.trim()}',
    ].join(' · ');

    final confidence = nexus == null
        ? (n > 0 ? .65 : .35)
        : ((nexus!.results.isEmpty ? .45 : .78) +
                (n > 2 ? .12 : 0))
            .clamp(0.0, 1.0);

    return LiveMarketIntelligenceSnapshot(
      details: details.isEmpty
          ? 'Informations consolidées depuis l’annonce et les signaux WAOUH disponibles.'
          : details,
      market: market,
      comparison: comparison,
      recommendation: recommendation.isEmpty
          ? 'L’Avatar recommande de confirmer disponibilité, état et conditions avant accord.'
          : recommendation,
      sources: sources,
      confidence: confidence.toDouble(),
    );
  }
}
