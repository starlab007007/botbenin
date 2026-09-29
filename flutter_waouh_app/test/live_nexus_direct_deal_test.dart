// Résultats Nexus externes → Deal Room directe : parité Web (src/lib/waouh/nexusDeal.ts).
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_commerce_action_client.dart';

const uuid = 'd1a00000-0000-4000-8000-000000000001';

void main() {
  test('seules les offres externes entrent en Deal Room directe', () {
    expect(liveIsDirectDealCandidate(fabricId: 'external:$uuid', intent: 'SELL'), isTrue);
    expect(liveIsDirectDealCandidate(fabricId: 'external:$uuid', intent: 'BUY'), isFalse);
    expect(liveIsDirectDealCandidate(fabricId: 'external:$uuid', actorType: 'buyer'), isFalse);
    expect(liveIsDirectDealCandidate(fabricId: 'buyer:$uuid'), isFalse);
    expect(liveIsDirectDealCandidate(fabricId: 'article:$uuid'), isFalse);
    expect(liveIsDirectDealCandidate(fabricId: 'external:abc'), isFalse);
  });

  test('requête open_deal : fabric_id + montant arrondi, jamais d\'article_id', () {
    final req = liveExternalDealRequest('EXTERNAL:$uuid', amount: 130000.4);
    expect(req, {
      'action': 'open_deal',
      'fabric_id': 'external:$uuid',
      'amount': 130000,
      'source': 'nexus_card',
    });
    expect(liveExternalDealRequest('external:$uuid').containsKey('amount'), isFalse);
  });

  test('issues : ouverte, refusée (annonce disparue), repli (drapeau coupé ou parcours v3 indisponible)', () {
    expect(
      liveExternalDealStatus({'ok': true, 'article_id': 'a1', 'thread_id': 't1'}),
      LiveExternalDealStatus.opened,
    );
    expect(
      liveExternalDealStatus({'ok': false, 'code': 'external_unavailable'}),
      LiveExternalDealStatus.refused,
    );
    expect(
      liveExternalDealStatus({'ok': true, 'article_id': 'a1'}),
      LiveExternalDealStatus.refused,
    );
    expect(
      liveExternalDealStatus({'ok': false, 'code': 'nexus_direct_deal_disabled'}),
      LiveExternalDealStatus.fallback,
    );
    expect(liveExternalDealStatus(null), LiveExternalDealStatus.fallback);
  });

  test('« Envoyer mon offre » devient transmit_offer (bouton serveur et forme canonique)', () {
    expect(liveCommerceRequestFromPayload('envoyer-offre:$uuid', threadId: 't1'), {
      'action': 'transmit_offer',
      'negotiation_id': uuid,
      'thread_id': 't1',
    });
    expect(
      liveCommerceRequestFromPayload('waouh:transmit_offer?negotiation_id=$uuid&thread_id=t9'),
      {'action': 'transmit_offer', 'negotiation_id': uuid, 'thread_id': 't9'},
    );
  });
}
