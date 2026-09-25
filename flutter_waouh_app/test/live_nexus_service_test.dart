import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';

void main() {
  test('NEXUS discovery parses ranking and contact policy', () {
    final item = NexusDiscoveryItem.fromJson(<String, dynamic>{
      'fabric_id': 'external:11111111-1111-4111-8111-111111111111',
      'source_key': 'google_places',
      'intent': 'SELL',
      'subject': 'Samsung Galaxy S25 256 Go',
      'city': 'Cotonou',
      'price_min': 385000,
      'price_max': 385000,
      'scores': <String, dynamic>{
        'total_score': 91.2,
        'relevance_score': 96,
        'trust_score': 88,
        'contactability_score': 55,
        'reasons': <String>['Produit très pertinent', 'Même zone'],
      },
      'contact_policy': <String, dynamic>{
        'level': 'C1',
        'label': 'Contact professionnel public',
        'can_reveal': true,
        'can_auto_contact': false,
        'can_blind_message': false,
        'requires_approval': false,
      },
    });

    expect(item.title, 'Samsung Galaxy S25 256 Go');
    expect(item.sourceKey, 'google_places');
    expect(item.scores.total, 91.2);
    expect(item.contactPolicy.level, 'C1');
    expect(item.contactPolicy.canReveal, isTrue);
    expect(item.contactPolicy.canAutoContact, isFalse);
  });

  test('Muse blind matching C2 remains private but messageable', () {
    final policy = NexusContactPolicy.fromJson(<String, dynamic>{
      'level': 'C2',
      'label': 'Conversation privée / blind matching',
      'can_reveal': false,
      'can_auto_contact': false,
      'can_blind_message': true,
      'requires_approval': true,
    });

    expect(policy.canReveal, isFalse);
    expect(policy.canAutoContact, isFalse);
    expect(policy.canBlindMessage, isTrue);
    expect(policy.requiresApproval, isTrue);
  });


  test('Smart discovery parses resolved mode and AI plan', () {
    final response = NexusDiscoveryResponse.fromJson(<String, dynamic>{
      'mode': 'find_buyers',
      'normalized_query': 'soja 10 tonnes',
      'explanation': 'WAOUH cherche les acheteurs compatibles.',
      'results': <dynamic>[],
      'source_mix': <String, dynamic>{'b2b_rfq': 3},
      'refresh': <String, dynamic>{},
      'intelligence': <String, dynamic>{
        'mode': 'find_buyers',
        'normalized_query': 'soja 10 tonnes',
        'city': 'Parakou',
        'budget_max': null,
        'priorities': <String>['relevance', 'trust', 'contactability'],
        'source_families': <String>[
          'waouh',
          'b2b_rfq',
          'social_public',
        ],
        'missing': <String>['prix souhaité'],
        'next_actions': <String>[
          'Comparer les demandes actives',
          'Prioriser les acheteurs contactables',
        ],
        'confidence': 0.92,
        'rationale': 'Objectif de vente détecté.',
      },
    });

    expect(response.findSellers, isFalse);
    expect(response.normalizedQuery, 'soja 10 tonnes');
    expect(response.intelligence, isNotNull);
    expect(response.intelligence!.findSellers, isFalse);
    expect(response.intelligence!.confidence, 0.92);
    expect(response.intelligence!.city, 'Parakou');
    expect(response.intelligence!.sourceFamilies, contains('b2b_rfq'));
    expect(response.intelligence!.nextActions, hasLength(2));
  });

  test('Source registry exposes live state without inventing readiness', () {
    final source = NexusSourceInfo.fromJson(<String, dynamic>{
      'source_key': 'serpapi',
      'label': 'Web public / SerpAPI',
      'family': 'web',
      'connector_mode': 'api',
      'operational_state': 'requires_config',
      'configured': false,
      'signal_count': 12,
      'default_contactability': 'C1',
      'supports_buy': true,
      'supports_sell': true,
    });

    expect(source.live, isFalse);
    expect(source.configured, isFalse);
    expect(source.signalCount, 12);
  });

  test('Avatar journey parses structured NEXUS catalog results', () {
    final response = NexusSearchResponse.fromJson(<String, dynamic>{
      'query': 'Samsung S25',
      'market': <String, dynamic>{
        'median': 400000,
        'sample_count': 5,
      },
      'results': <Map<String, dynamic>>[
        <String, dynamic>{
          'article_id': '11111111-1111-4111-8111-111111111111',
          'title': 'Samsung Galaxy S25',
          'price': 395000,
          'currency': 'XOF',
          'city': 'Cotonou',
          'source': 'waouh',
          'photos': <String>['https://example.test/s25.jpg'],
          'scores': <String, dynamic>{
            'total_score': 93,
            'relevance_score': 95,
            'trust_score': 88,
            'contactability_score': 70,
            'reasons': <String>['Prix cohérent', 'Même ville'],
          },
          'badges': <String>['recommended'],
          'advice': 'Bonne option.',
        },
      ],
    });

    expect(response.results, hasLength(1));
    expect(response.results.first.articleId,
        '11111111-1111-4111-8111-111111111111');
    expect(response.results.first.price, 395000);
    expect(response.results.first.scores.total, 93);
    expect(response.results.first.photos, hasLength(1));
  });

}
