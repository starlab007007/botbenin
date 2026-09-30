import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_commerce_action_client.dart';
import 'package:waouh_app_native/live/live_commerce_workflow.dart';
import 'package:waouh_app_native/live/live_deal_journey.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';
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
    test('parité Web : pas 5 FCFA sur micro-prix, 25 FCFA au-delà', () {
      expect(liveSuggestedCounterPrice(currentOffer: 100), 90);
      expect(liveSuggestedCounterPrice(currentOffer: 120, ownLastOffer: 80), 100);
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
      // « Retirer mon offre » : même action serveur que « refuser ».
      expect(liveCommerceRequestFromPayload('retirer-offre:$_neg')?['action'], 'reject');
      expect(liveCommerceRequestFromPayload('je-veux:$_art')?['action'], 'open_deal');
      final partner = liveCommerceRequestFromPayload(
        'je-veux:$_art?source=partner&catalog_id=$_art&source_id=$_art',
      );
      expect(partner?['action'], 'open_deal');
      expect(partner?['catalog_id'], _art);
      expect(partner?['source_id'], _art);
      expect(partner?.containsKey('article_id'), isFalse);
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
      final partnerMeta = liveCommercePayloadMeta(
        'je-veux:$_art?source=partner&catalog_id=$_art&source_id=$_art',
      );
      expect(partnerMeta['catalog_id'], _art);
      expect(partnerMeta['source_id'], _art);
      expect(partnerMeta.containsKey('article_id'), isFalse);
      expect(meta['commerce_action'], 'open_deal');
      expect(meta.containsKey('negotiation_id'), isFalse);
      expect(liveCommerceOutboundText('je-veux:$_art'), 'Je le veux');
      expect(liveCommerceOutboundText('poser-question:$_art'), 'Poser une question');
    });
  });

  group('Conformité E2E — fil canonique', () {
    const thread = '7a7a7a7a-1111-4111-8111-111111111111';
    const buyer = '22222222-2222-4222-8222-222222222222';
    const seller = '11111111-1111-4111-8111-111111111111';
    const fabric = 'external:44444444-4444-4444-8444-444444444444';

    test('Intéressé résout une Deal Room seulement après thread canonique', () {
      final seed = LiveMatch(
        key: 'pending_interest_e2e',
        articleId: _art,
        role: 'buyer',
        title: 'Article E2E',
        lastAt: DateTime(2026, 9, 30),
        sellerUserId: seller,
        counterpartUserId: seller,
      );
      final resolved = LiveMatch(
        key: 'resolved_e2e',
        articleId: _art,
        role: 'buyer',
        title: 'Article E2E',
        lastAt: DateTime(2026, 9, 30),
        threadId: thread,
        buyerUserId: buyer,
        sellerUserId: seller,
        counterpartUserId: seller,
      );

      expect(liveCanPromoteInterestedMatch(seed: seed, resolved: resolved), isTrue);
      expect(resolved.threadId, thread);

      final unresolved = LiveMatch(
        key: 'still_pending',
        articleId: _art,
        role: 'buyer',
        title: 'Article E2E',
        lastAt: DateTime(2026, 9, 30),
        buyerUserId: buyer,
        sellerUserId: seller,
        counterpartUserId: seller,
      );
      expect(liveCanPromoteInterestedMatch(seed: seed, resolved: unresolved), isFalse);
    });

    test('A/B : Intérêt → négociation → accord → livraison → paiement garde thread_id=X', () {
      const states = <String>[
        'interest_recorded',
        'proposed',
        'countered',
        'awaiting_confirmation',
        'pending_assignment',
        'picked_up',
        'delivered',
        'completed',
      ];
      const expectedStages = <String>[
        'interest',
        'negotiation',
        'negotiation',
        'agreement',
        'preparation',
        'courier',
        'delivery',
        'payment',
      ];

      expect(states.map(liveStageFromWorkflow).toList(), expectedStages);

      for (var i = 0; i < states.length; i++) {
        final message = _msg(<String, dynamic>{
          'thread_id': thread,
          'article_id': _art,
          'negotiation_id': _neg,
          if (i >= 3) 'deal_id': _deal,
          'workflow_state': states[i],
        });
        final scope = liveCommerceScopeFromMessage(message);
        expect(scope['thread_id'], thread, reason: 'thread perdu à l’étape ${states[i]}');
        expect(scope['article_id'], _art);
        expect(scope['negotiation_id'], _neg);
        if (i >= 3) expect(scope['deal_id'], _deal);
      }

      expect(liveCommerceStageIsTerminal('completed'), isTrue);
    });

    test('Chat Center → NEXUS/Signal Fabric → carte → Deal Room exige article + thread', () {
      expect(
        liveIsDirectDealCandidate(
          fabricId: fabric,
          intent: 'SELL',
          actorType: 'seller',
        ),
        isTrue,
      );
      expect(
        liveExternalDealRequest(fabric, amount: 280000),
        <String, dynamic>{
          'action': 'open_deal',
          'fabric_id': fabric,
          'amount': 280000,
          'source': 'nexus_card',
        },
      );

      expect(
        liveExternalDealStatus(<String, dynamic>{
          'ok': true,
          'article_id': _art,
          'thread_id': thread,
        }),
        LiveExternalDealStatus.opened,
      );
      expect(
        liveExternalDealStatus(<String, dynamic>{
          'ok': true,
          'article_id': _art,
          'thread_id': '',
        }),
        LiveExternalDealStatus.refused,
      );
    });

    test('payloads canoniques conservent explicitement thread_id=X', () {
      final context = <String, String>{
        'thread_id': thread,
        'article_id': _art,
        'negotiation_id': _neg,
        'deal_id': _deal,
        'buyer_user_id': buyer,
        'seller_user_id': seller,
      };
      for (final kind in <LiveCommerceActionKind>[
        LiveCommerceActionKind.interest,
        LiveCommerceActionKind.counter,
        LiveCommerceActionKind.accept,
        LiveCommerceActionKind.sellerConfirm,
        LiveCommerceActionKind.paymentDelivery,
        LiveCommerceActionKind.confirmPaymentCash,
      ]) {
        final payload = liveCanonicalWorkflowPayload(kind, context: context);
        final query = liveCommerceQuery(payload);
        expect(query['thread_id'], thread, reason: 'thread absent pour $kind');
        expect(query['article_id'], _art);
        expect(query['negotiation_id'], _neg);
        expect(query['deal_id'], _deal);
      }

      final accept = liveCommerceRequestFromPayload(
        'waouh:accept?negotiation_id=$_neg&thread_id=$thread',
      );
      expect(accept?['thread_id'], thread);
      expect(accept?['negotiation_id'], _neg);
    });
  });

}
