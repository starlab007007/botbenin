import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_market_analysis.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';
import 'package:waouh_app_native/live/live_offer_channels.dart';

NexusDiscoveryItem item(String id, {num price = 5000, Map<String, dynamic> evidence = const {}, Map<String, dynamic>? pack}) =>
    NexusDiscoveryItem.fromJson({
      'fabric_id': id,
      'subject': id,
      'city': 'Cotonou',
      'price_min': price,
      'price_max': price,
      'evidence': evidence,
      if (pack != null) 'contact_pack': pack,
    });

void main() {
  test('canaux : WAOUH, WhatsApp, e-mail, téléphone', () {
    expect(liveOfferChannels(item('article:1')), [LiveOfferChannel.waouh]);
    expect(
      liveOfferChannels(item('external:2', evidence: {'has_whatsapp': true, 'contact_hints': {'email_count': 1}})),
      [LiveOfferChannel.whatsapp, LiveOfferChannel.email],
    );
    expect(
      liveOfferChannels(item('external:4', price: 0, evidence: {'has_whatsapp': false, 'contact_hints': {'email_count': 0, 'phone_count': 0}})),
      isEmpty,
    );
    expect(liveDirectChannels(item('article:1')), isEmpty);
  });

  test('message de contact direct', () {
    expect(liveDirectMessage('Samsung S25', 150000), contains('Samsung S25'));
  });

  test('analyse : fourchette, médiane, contacts, choix de l’avatar', () {
    final offers = [
      item('article:a', price: 100000),
      item('external:b', price: 140000, evidence: {'has_whatsapp': true}),
      item('external:c', price: 120000, evidence: {'contact_hints': {'email_count': 1}}),
      item('external:d', price: 0),
    ];
    final a = analyzeLiveMarket(offers, city: 'Cotonou');
    expect(a.low, 100000);
    expect(a.high, 140000);
    expect(a.median, 120000);
    expect(a.total, 4);
    expect(a.contactable, 3);
    expect(a.pick?.item.fabricId, 'article:a');
    expect(a.pickReason, contains('sous la médiane'));
    expect(a.compare.length, lessThanOrEqualTo(3));
    expect(a.compare.every((r) => r.channels.isNotEmpty), isTrue);
  });

  test('aucun choix quand personne n’est joignable', () {
    final a = analyzeLiveMarket([item('external:z', price: 0)]);
    expect(a.pick, isNull);
    expect(a.advice, contains('contact'));
  });
}
