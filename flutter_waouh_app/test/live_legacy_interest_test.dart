import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_legacy_interest.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';

NexusDiscoveryItem item(String id, String source) => NexusDiscoveryItem.fromJson({
      'fabric_id': id,
      'source_key': source,
      'intent': 'SELL',
      'subject': 'iPhone 13',
      'contact_policy': {'level': 'C2', 'label': '', 'can_auto_contact': false},
    });

void main() {
  test('Web/Flutter parity: « Intéressé » on a WAOUH seller follows the historical negotiation', () {
    expect(liveLegacyDealCandidate(item('article:a', 'waouh_app')), isTrue);
    expect(liveLegacyDealCandidate(item('catalog:c', 'partner')), isTrue);
    expect(liveLegacyDealCandidate(item('external:x', 'facebook_public')), isFalse);
    expect(liveLegacyDealCandidate(item('article:a', 'serpapi')), isFalse);
  });
}
