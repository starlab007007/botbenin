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
}
