import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_commerce_workflow.dart';
import 'package:waouh_app_native/live/live_models.dart';

LiveMessage _message({
  required String id,
  required String direction,
  required String text,
  Map<String, dynamic> meta = const <String, dynamic>{},
}) =>
    LiveMessage.fromJson(<String, dynamic>{
      'id': id,
      'direction': direction,
      'text': text,
      'created_at': DateTime.utc(2026, 8, 5).toIso8601String(),
      'article_id': 'article-1',
      'thread_id': 'thread-1',
      'meta': meta,
    });

void main() {
  test('les actions canoniques envoient OUI et NON au moteur', () {
    expect(
      liveCommerceOutboundText(
        'waouh:accept?negotiation_id=neg-1&article_id=article-1',
      ),
      'OUI',
    );
    expect(
      liveCommerceOutboundText(
        'waouh:reject?negotiation_id=neg-1&article_id=article-1',
      ),
      'NON',
    );
    expect(
      liveCommerceActionKind('contre-proposition:neg-1'),
      LiveCommerceActionKind.counter,
    );
  });

  test('le payload conserve la négociation, le produit et la contrepartie', () {
    final payload = liveCanonicalWorkflowPayload(
      LiveCommerceActionKind.accept,
      context: const <String, String>{
        'negotiation_id': 'neg-1',
        'article_id': 'article-1',
        'counterpart_user_id': 'seller-1',
        'thread_id': 'thread-1',
      },
    );
    final query = liveCommerceQuery(payload);
    expect(query['negotiation_id'], 'neg-1');
    expect(query['article_id'], 'article-1');
    expect(query['counterpart_user_id'], 'seller-1');
    expect(query['thread_id'], 'thread-1');
    expect(query['commerce_action'], 'accept');
    expect(query['commerce_contract'], 'waouh_action_v2');
  });

  test(
      'un accord ouvre la prochaine étape quand le backend fournit des actions',
      () {
    final offer = _message(
      id: 'offer',
      direction: 'out',
      text: 'Nouvelle offre',
      meta: const <String, dynamic>{
        'intent': 'negotiation_open',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{'id': 'accepter:neg-1', 'label': 'Accepter'},
        ],
      },
    );
    final payment = _message(
      id: 'payment',
      direction: 'out',
      text: 'Accord conclu. Choisissez votre mode de paiement.',
      meta: const <String, dynamic>{
        'intent': 'deal_created',
        'workflow_state': 'awaiting_payment',
        'deal_id': 'deal-1',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'payer-mobile:deal-1',
            'label': 'Mobile Money',
          },
        ],
      },
    );
    expect(liveLatestActionableMessageIndex(<LiveMessage>[offer, payment]), 1);
  });

  test('un accord sans actions backend masque aussi l’ancienne offre', () {
    final offer = _message(
      id: 'offer',
      direction: 'out',
      text: 'Nouvelle offre',
      meta: const <String, dynamic>{
        'intent': 'negotiation_open',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{'id': 'accepter:neg-1', 'label': 'Accepter'},
        ],
      },
    );
    final dealWithoutActions = _message(
      id: 'deal',
      direction: 'out',
      text: 'Accord conclu.',
      meta: const <String, dynamic>{
        'intent': 'deal_created',
        'actions': <Map<String, dynamic>>[],
      },
    );

    expect(
      liveCommerceMessageSupersedesPreviousActions(dealWithoutActions),
      isTrue,
    );
    expect(
      liveLatestActionableMessageIndex(
          <LiveMessage>[offer, dealWithoutActions]),
      -1,
    );
  });

  test('les états terminaux canoniques sont reconnus sans faux positif', () {
    for (final stage in const <String>[
      'closed',
      'negotiation_closed',
      'refused',
      'rejected',
      'cancelled',
      'sale_completed',
      'transaction_completed',
      'Négociation fermée',
    ]) {
      expect(
        liveCommerceStageIsTerminal(stage),
        isTrue,
        reason: 'état terminal non reconnu: $stage',
      );
    }

    for (final stage in const <String>[
      'deal_created',
      'awaiting_payment',
      'delivery_in_progress',
      'delivered',
      'delivery_completed',
      'reception_confirmed',
      'Livraison terminée',
      'payment_not_completed',
      'article_not_delivered',
      'partially_completed',
    ]) {
      expect(
        liveCommerceStageIsTerminal(stage),
        isFalse,
        reason: 'faux état terminal: $stage',
      );
    }
  });

  test('un état terminal masque toutes les anciennes actions', () {
    final offer = _message(
      id: 'offer',
      direction: 'out',
      text: 'Nouvelle offre',
      meta: const <String, dynamic>{
        'intent': 'negotiation_open',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{'id': 'accepter:neg-1', 'label': 'Accepter'},
        ],
      },
    );
    final closed = _message(
      id: 'closed',
      direction: 'out',
      text: 'Négociation fermée.',
      meta: const <String, dynamic>{
        'intent': 'negotiation_closed',
        'workflow_state': 'closed',
        'actions': <Map<String, dynamic>>[],
      },
    );
    expect(liveLatestActionableMessageIndex(<LiveMessage>[offer, closed]), -1);
  });

  test('une action locale masque immédiatement les anciens boutons', () {
    final offer = _message(
      id: 'offer',
      direction: 'out',
      text: 'Nouvelle offre',
      meta: const <String, dynamic>{
        'intent': 'negotiation_open',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{'id': 'waouh:accept', 'label': 'Accepter'},
        ],
      },
    );
    final local = _message(
      id: 'local',
      direction: 'in',
      text: 'OUI',
      meta: const <String, dynamic>{'commerce_action': 'accept_offer'},
    );
    expect(local.outgoing, isTrue);
    expect(liveLatestActionableMessageIndex(<LiveMessage>[offer, local]), -1);
  });

  test('les commandes Deal Graph restent distinctes de la négociation', () {
    expect(
      liveCommerceActionKind('payer-mobile:deal-1'),
      LiveCommerceActionKind.paymentMobile,
    );
    expect(
      liveCommerceActionKind('paiement-livraison:deal-1'),
      LiveCommerceActionKind.paymentDelivery,
    );
    expect(
      liveCommerceActionKind('confirmer-disponibilite:deal-1'),
      LiveCommerceActionKind.sellerConfirm,
    );
    expect(
      liveCommerceActionKind('confirmer-paiement-cash:deal-1'),
      LiveCommerceActionKind.confirmPaymentCash,
    );
    expect(
      liveCommerceActionKind('confirmer-paiement-mobile:deal-1'),
      LiveCommerceActionKind.confirmPaymentMobile,
    );
    expect(
      liveCommerceActionKind('annuler:deal-1'),
      LiveCommerceActionKind.cancelDeal,
    );
  });

  test('une commande Deal Graph conserve deal et thread dans le payload', () {
    final payload = liveCanonicalWorkflowPayload(
      LiveCommerceActionKind.paymentDelivery,
      context: const <String, String>{
        'deal_id': 'deal-1',
        'thread_id': 'thread-1',
        'article_id': 'article-1',
        'buyer_user_id': 'buyer-1',
        'seller_user_id': 'seller-1',
      },
    );
    final query = liveCommerceQuery(payload);

    expect(query['commerce_action'], 'payment_preference_cod');
    expect(query['deal_id'], 'deal-1');
    expect(query['thread_id'], 'thread-1');
    expect(query['article_id'], 'article-1');
    expect(query['buyer_user_id'], 'buyer-1');
    expect(query['seller_user_id'], 'seller-1');
    expect(liveCommerceOutboundText(payload), 'Paiement cash à la livraison');
  });

  test('awaiting_confirmation reste un état actif', () {
    expect(liveCommerceStageIsTerminal('awaiting_confirmation'), isFalse);
  });

  test('delivered reste actionnable jusqu’à confirmation du paiement', () {
    final delivered = _message(
      id: 'delivered',
      direction: 'out',
      text: 'Colis livré. Confirmez le paiement.',
      meta: const <String, dynamic>{
        'workflow_state': 'delivered',
        'deal_id': 'deal-1',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'confirmer-paiement-cash:deal-1',
            'label': 'Confirmer paiement',
          },
        ],
      },
    );
    expect(liveCommerceMessageIsTerminal(delivered), isFalse);
    expect(liveCommerceMessageIsActionable(delivered), isTrue);
    expect(liveLatestActionableMessageIndex(<LiveMessage>[delivered]), 0);
  });

}
