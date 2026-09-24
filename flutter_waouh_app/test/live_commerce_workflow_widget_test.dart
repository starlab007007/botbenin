import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_smart_timeline.dart';

LiveMessage _serverMessage({
  required String id,
  required String text,
  required Map<String, dynamic> meta,
}) =>
    LiveMessage.fromJson(<String, dynamic>{
      'id': id,
      'direction': 'out',
      'text': text,
      'created_at': DateTime.utc(2026, 8, 5).toIso8601String(),
      'article_id': 'article-1',
      'thread_id': 'thread-1',
      'meta': meta,
    });

void main() {
  testWidgets('la dernière offre expose trois payloads canoniques',
      (tester) async {
    String? selected;
    final message = _serverMessage(
      id: 'offer',
      text: '🤝 Nouvelle offre vendeur : 95 000 FCFA',
      meta: const <String, dynamic>{
        'intent': 'negotiation_open',
        'workflow_state': 'countered',
        'negotiation_id': 'neg-1',
        'article_id': 'article-1',
        'counterpart_user_id': 'seller-1',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{'id': 'waouh:accept', 'label': '✅ Accepter'},
          <String, dynamic>{
            'id': 'waouh:counter',
            'label': '💬 Contre-proposer'
          },
          <String, dynamic>{'id': 'waouh:reject', 'label': '❌ Refuser'},
        ],
      },
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: LiveSmartTimeline(
          messages: <LiveMessage>[message],
          onPayload: (value) => selected = value,
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('✅ Accepter'), findsOneWidget);
    expect(find.text('💬 Contre-proposer'), findsOneWidget);
    expect(find.text('❌ Refuser'), findsOneWidget);
    await tester.tap(find.text('✅ Accepter'));
    await tester.pump();
    expect(selected, contains('waouh:accept?'));
    expect(selected, contains('negotiation_id=neg-1'));
    expect(selected, contains('article_id=article-1'));
  });

  testWidgets('un accord affiche immédiatement les actions de paiement',
      (tester) async {
    String? selected;
    final payment = _serverMessage(
      id: 'payment',
      text: '🎉 Accord conclu. Choisissez votre mode de paiement.',
      meta: const <String, dynamic>{
        'intent': 'deal_created',
        'workflow_state': 'awaiting_payment',
        'deal_id': 'deal-1',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'payer-mobile:deal-1',
            'label': '💳 Mobile Money',
          },
          <String, dynamic>{
            'id': 'paiement-livraison:deal-1',
            'label': '💵 À la livraison',
          },
        ],
      },
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: LiveSmartTimeline(
          messages: <LiveMessage>[payment],
          onPayload: (value) => selected = value,
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('💳 Mobile Money'), findsOneWidget);
    expect(find.text('💵 À la livraison'), findsOneWidget);
    await tester.tap(find.text('💳 Mobile Money'));
    await tester.pump();
    expect(selected, 'payer-mobile:deal-1');
  });

  testWidgets(
      'une transition sans actions masque les boutons d’une ancienne carte produit',
      (tester) async {
    final productOffer = _serverMessage(
      id: 'product-offer',
      text: 'Nouvelle offre sur le produit.',
      meta: const <String, dynamic>{
        'intent': 'negotiation_open',
        'workflow_state': 'negotiating',
        'products': <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'article-1',
            'article_id': 'article-1',
            'title': 'Téléphone WAOUH',
            'price': 85000,
            'workflow_state': 'negotiating',
            'actions': <Map<String, dynamic>>[
              <String, dynamic>{'id': 'accepter:neg-1', 'label': '✅ Accepter'},
              <String, dynamic>{
                'id': 'contre-proposition:neg-1',
                'label': '💬 Contre-proposer'
              },
              <String, dynamic>{'id': 'refuser:neg-1', 'label': '❌ Refuser'},
            ],
          },
        ],
      },
    );
    final dealWithoutActions = _serverMessage(
      id: 'deal',
      text: '🎉 Accord conclu.',
      meta: const <String, dynamic>{
        'intent': 'deal_created',
        'actions': <Map<String, dynamic>>[],
      },
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: LiveSmartTimeline(
          messages: <LiveMessage>[productOffer, dealWithoutActions],
          onPayload: (_) {},
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('✅ Accepter'), findsNothing);
    expect(find.text('💬 Contre-proposer'), findsNothing);
    expect(find.text('❌ Refuser'), findsNothing);
  });

  testWidgets('un état final masque toutes les anciennes actions',
      (tester) async {
    final offer = _serverMessage(
      id: 'offer',
      text: 'Nouvelle offre',
      meta: const <String, dynamic>{
        'intent': 'negotiation_open',
        'actions': <Map<String, dynamic>>[
          <String, dynamic>{'id': 'waouh:accept', 'label': '✅ Accepter'},
        ],
      },
    );
    final closed = _serverMessage(
      id: 'closed',
      text: '❌ Négociation fermée.',
      meta: const <String, dynamic>{
        'intent': 'negotiation_closed',
        'workflow_state': 'closed',
        'actions': <Map<String, dynamic>>[],
      },
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: LiveSmartTimeline(
          messages: <LiveMessage>[offer, closed],
          onPayload: (_) {},
        ),
      ),
    ));
    await tester.pumpAndSettle();
    expect(find.text('✅ Accepter'), findsNothing);
    expect(find.textContaining('Négociation fermée'), findsOneWidget);
  });
}
