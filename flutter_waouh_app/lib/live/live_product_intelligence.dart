import 'package:supabase_flutter/supabase_flutter.dart';

class LiveProductIntelligence {
  const LiveProductIntelligence({
    required this.details,
    required this.market,
    required this.comparison,
    required this.recommendation,
    required this.sampleCount,
    required this.sources,
    required this.confidence,
    this.generatedAt,
  });

  final String details;
  final String market;
  final String comparison;
  final String recommendation;
  final int sampleCount;
  final List<String> sources;
  final double confidence;
  final DateTime? generatedAt;

  factory LiveProductIntelligence.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> map(dynamic value) =>
        value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
    final details = map(json['details']);
    final market = map(json['market']);
    final comparison = map(json['comparison']);
    final recommendation = map(json['recommendation']);
    final sourceMix = market['source_mix'];

    return LiveProductIntelligence(
      details: '${details['text'] ?? ''}'.trim(),
      market: '${market['text'] ?? ''}'.trim(),
      comparison: '${comparison['text'] ?? ''}'.trim(),
      recommendation: '${recommendation['text'] ?? ''}'.trim(),
      sampleCount: (market['sample_count'] as num?)?.round() ?? 0,
      sources: sourceMix is List
          ? sourceMix
              .map((value) => '$value'.trim())
              .where((value) => value.isNotEmpty)
              .toList(growable: false)
          : const <String>[],
      confidence:
          (recommendation['confidence'] as num?)?.toDouble() ?? 0.0,
      generatedAt: DateTime.tryParse('${json['generated_at'] ?? ''}'),
    );
  }
}

class LiveProductIntelligenceService {
  const LiveProductIntelligenceService(this.client);

  final SupabaseClient client;

  Future<LiveProductIntelligence?> load(String articleId) async {
    final normalized = articleId.trim();
    if (normalized.isEmpty) return null;
    final response = await client.functions.invoke(
      'waouh-product-intelligence',
      body: <String, dynamic>{'article_id': normalized},
    );
    final data = response.data;
    if (data is! Map || data['ok'] != true) return null;
    return LiveProductIntelligence.fromJson(
      Map<String, dynamic>.from(data),
    );
  }
}
