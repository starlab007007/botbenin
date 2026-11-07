import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_market_reference.dart';

void main() {
  test('parses cited points and keeps only http sources', () {
    final ref = parseLiveMarketReference({
      'ok': true,
      'data': {
        'sources': [
          {'n': 1, 'title': 'iPhone 12', 'host': 'jumia.bj', 'url': 'https://jumia.bj/x', 'price': 250000, 'observed_at': '2026-11-01T10:00:00Z'},
          {'n': 2, 'title': 'iPhone 12', 'host': 'Annonce WAOUH', 'url': 'javascript:alert(1)', 'price': null},
        ],
        'points': [
          {'text': 'Prix bas 250 000 F', 'cites': [1]},
          {'text': 'sans source', 'cites': []},
        ],
        'advice': {'text': 'Proposez 225 000 F', 'cites': [1]},
      },
    })!;
    expect(ref.sources.length, 2);
    expect(ref.sources[0].url, 'https://jumia.bj/x');
    expect(ref.sources[1].url, isNull);
    expect(ref.points.length, 1);
    expect(ref.advice!.cites, [1]);
  });

  test('returns null on failure payload', () {
    expect(parseLiveMarketReference({'ok': false}), isNull);
  });
}
