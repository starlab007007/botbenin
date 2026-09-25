import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_product_intelligence.dart';

void main() {
  test('product intelligence keeps real market evidence metadata', () {
    final value = LiveProductIntelligence.fromJson(<String, dynamic>{
      'generated_at': '2026-09-25T12:00:00Z',
      'details': <String, dynamic>{
        'text': 'État: neuf · Ville: Cotonou',
      },
      'market': <String, dynamic>{
        'text': '8 références · WAOUH · Radar · Partenaire',
        'sample_count': 8,
        'source_mix': <String>['WAOUH', 'Radar', 'Partenaire'],
      },
      'comparison': <String, dynamic>{
        'text': 'Prix 5 % sous la médiane.',
      },
      'recommendation': <String, dynamic>{
        'text': 'Prix cohérent avec le marché.',
        'confidence': 0.82,
      },
    });

    expect(value.sampleCount, 8);
    expect(value.sources, containsAll(<String>['WAOUH', 'Radar', 'Partenaire']));
    expect(value.confidence, 0.82);
    expect(value.market, contains('8 références'));
  });
}
