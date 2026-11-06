import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_automatic_offers.dart';
import 'package:waouh_app_native/live/live_deal_room.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';

NexusDiscoveryItem item(String id, {Map<String, dynamic>? evidence, bool auto = false}) =>
    NexusDiscoveryItem.fromJson({
      'fabric_id': id,
      'source_key': 'test',
      'intent': 'SELL',
      'subject': 'iPhone 13',
      'evidence': evidence ?? <String, dynamic>{},
      'contact_policy': {'level': 'C2', 'label': '', 'can_auto_contact': auto},
    });

void main() {
  test('Web/Flutter parity: only reachable offers go to Bot', () {
    expect(liveOfferReachable(item('article:a')), isTrue);
    expect(liveOfferReachable(item('catalog:p', evidence: {'source': 'partner'})), isTrue);
    expect(liveOfferReachable(item('external:x', auto: true)), isTrue);
    expect(liveOfferReachable(item('external:y')), isFalse);
    expect(liveOfferReachable(item('catalog:z')), isFalse);
  });

  test('owner sees how the external seller was reached, never the full number', () {
    expect(externalContactText({'status': 'contacted', 'last4': '1234'}), 'Contacté par WhatsApp · •••• 1234 · réponse attendue');
    expect(externalContactText({'status': 'joined', 'last4': '1234'}), 'A répondu par WhatsApp · •••• 1234');
    expect(externalContactText({'status': 'stopped'}), 'Ne souhaite pas être contacté');
    expect(externalContactText(null), isNull);
  });
}
