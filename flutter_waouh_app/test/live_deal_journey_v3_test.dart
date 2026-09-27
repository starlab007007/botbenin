import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_commerce_action_client.dart';
import 'package:waouh_app_native/live/live_commerce_workflow.dart';
import 'package:waouh_app_native/live/live_deal_journey.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_widgets.dart';

const _neg = 'a1b2c3d4-0000-4000-8000-00000000abcd';
const _deal = '0f9e8d7c-1111-4111-8111-111111111111';
const _art = '3f2c1b0a-0000-4000-8000-00000000a001';

LiveMessage _msg(Map<String, dynamic> meta) => LiveMessage(
      id: 'm${meta.hashCode}',
      text: 'x',
      createdAt: DateTime(2026, 9, 27),
      direction: 'out',
      meta: meta,
    );

void main() {
  group('Parcours v3 — étapes', () {
    test('états stockés vers les 7 étapes', () {
      expect(liveStageFromWorkflow('countered'), 'negotiation');
      expect(liveStageFromWorkflow('awaiting_confirmation'), 'agreement');
      expect(liveStageFromWorkflow('pending-assignment'), 'preparation');
      expect(liveStageFromWorkflow('picked_up'), 'courier');
      expect(liveStageFromWorkflow('delivered'), 'delivery');
      expect(liveStageFromWorkflow('completed'), 'payment');
      expect(liveStageFromWorkflow('inconnu'), isNull);
    });

    test('dernière étape connue du fil', () {
      expect(
        liveLatestStage([
          _msg({'workflow_state': 'proposed'}),
          _msg({'stage': 'agreement'}),
          _msg({}),
        ]),
        'agreement',
      );
    });
  });

  group('Parcours v3 — prix suggéré', () {
    test('milieu des offres, 90 % sinon, arrondi à 25 FCFA', () {
      expect(liveSuggestedCounterPrice(currentOffer: 2500, ownLastOffer: 2000), 2250);
      expect(liveSuggestedCounterPrice(currentOffer: 2500), 2250);
      expect(liveSuggestedCounterPrice(listPrice: 10000), 9000);
      expect(liveSuggestedCounterPrice(), isNull);
    });

    test('dernier montant du fil', () {
      expect(
        liveLatestOffer([
          _msg({'products': [{'price': 2400}]}),
          _msg({'products': [{'price': '2300'}]}),
        ]),
        2300,
      );
    });

    test('format « 2 450 FCFA »', () {
      expect(liveFormatFcfa(2450).replaceAll(' ', ' '), '2 450 FCFA');
      expect(liveFormatFcfa(1250000).replaceAll(' ', ' '), '1 250 000 FCFA');
    });
  });

  group('Parcours v3 — boutons serveur', () {
    test('boutons vers le contrat d\'action', () {
      expect(liveCommerceRequestFromPayload('accepter:$_neg', threadId: 't1'),
          {'action': 'accept', 'negotiation_id': _neg, 'thread_id': 't1'});
      expect(liveCommerceRequestFromPayload('refuser:$_neg')?['action'], 'reject');
      expect(liveCommerceRequestFromPayload('je-veux:$_art')?['action'], 'open_deal');
      expect(liveCommerceRequestFromPayload('payer-mobile:$_deal')?['method'], 'mobile_money');
      expect(liveCommerceRequestFromPayload('paiement-livraison:$_deal')?['method'], 'cash');
      expect(liveCommerceRequestFromPayload('annuler:$_deal')?['action'], 'cancel');
      expect(liveCommerceRequestFromPayload('contre-proposition:$_neg'), isNull);
      expect(liveCommerceRequestFromPayload('intéressé 1'), isNull);
    });

    test('fiche produit : cible article et libellé lisible', () {
      expect(liveArticleScopeKind('proposer-prix:$_art'), 'proposer-prix');
      final meta = liveCommercePayloadMeta('je-veux:$_art');
      expect(meta['article_id'], _art);
      expect(meta['commerce_action'], 'open_deal');
      expect(meta.containsKey('negotiation_id'), isFalse);
      expect(liveCommerceOutboundText('je-veux:$_art'), 'Je le veux');
      expect(liveCommerceOutboundText('poser-question:$_art'), 'Poser une question');
    });
  });
}
