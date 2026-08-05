import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_smart_timeline.dart';
import 'package:waouh_app_native/live/live_widgets.dart';

const _onePixelPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    'AAAADUlEQVR42mNk+M/wHwAEAQH/2p5ZvgAAAABJRU5ErkJggg==';
const _secondOnePixelPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
    'AAAAC0lEQVR42mP8/x8AAusB9Y9ZB7sAAAAASUVORK5CYII=';
const _thirdOnePixelPng =
    'data:image/png;name=third;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
    'AAAAC0lEQVR42mP8/x8AAusB9Y9ZB7sAAAAASUVORK5CYII=';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('renders one smart card and one associated photo per article',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 1100));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    String? selectedPayload;
    final message = LiveMessage(
      id: 'reply-products',
      text: '''🎯 Top 2 annonces trouvées

*1. iPhone 11*
💰 90 000 FCFA
🏙️ Cotonou · Jéricho
📏 2,4 km
📸 2 photos
📊 Marché réel : 116 250 FCFA – 138 750 FCFA · médiane 127 500 FCFA · AUBAINE (-18%)
🧠 Meilleur rapport qualité-prix de la sélection.
✅ Partenaire vérifié

*2. iPhone 15*
💰 105 000 FCFA
🏙️ Cotonou · Jéricho
📸 1 photo
✅ Partenaire vérifié''',
      createdAt: DateTime.utc(2026, 7, 31, 8),
      direction: 'out',
      attachments: const [
        LiveAttachment(
          url: _onePixelPng,
          type: 'image/png',
          caption: 'iPhone 11',
        ),
        LiveAttachment(
          url: _secondOnePixelPng,
          type: 'image/png',
          caption: 'iPhone 11 — photo 2/2',
        ),
        LiveAttachment(
          url: _thirdOnePixelPng,
          type: 'image/png',
          caption: 'iPhone 15',
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: LiveSmartTimeline(
            messages: [message],
            onPayload: (value) => selectedPayload = value,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.byType(ErrorWidget), findsNothing);
    expect(find.text('2 résultats'), findsOneWidget);
    expect(find.text('iPhone 11'), findsOneWidget);
    expect(find.text('iPhone 15'), findsOneWidget);
    expect(find.text('Je suis intéressé'), findsNWidgets(2));
    expect(find.text('1/2'), findsOneWidget);
    expect(find.textContaining('116 250 FCFA'), findsOneWidget);
    expect(find.textContaining('2,4 km'), findsOneWidget);
    expect(find.textContaining('29 % sous la médiane'), findsOneWidget);
    expect(
        find.textContaining('Meilleur rapport qualité-prix'), findsOneWidget);
    expect(find.byType(Image).evaluate().length, greaterThanOrEqualTo(2));

    final firstInterest = find.text('Je suis intéressé').first;
    await tester.ensureVisible(firstInterest);
    await tester.pumpAndSettle();
    await tester.tap(firstInterest);
    await tester.pump();

    // Le texte visible reste stable pour le backend historique, mais le bouton
    // transporte maintenant un payload canonique auto-descriptif. Le test doit
    // vérifier les deux contrats au lieu d'exiger l'ancienne chaîne brute.
    expect(selectedPayload, isNotNull);
    final payload = selectedPayload!;
    expect(liveCommercePayloadText(payload), 'intéressé 1');

    final meta = liveCommercePayloadMeta(payload);
    expect(meta['action'], 'interested');
    expect(meta['intent'], 'interested');
    expect(meta['origin_surface'], 'flutter_product_card');

    final queryAt = payload.indexOf('?');
    expect(queryAt, greaterThan(0));
    final query = Uri.splitQueryString(payload.substring(queryAt + 1));
    expect(query['image_url'], _onePixelPng);
  });

  testWidgets('renders structured metadata gallery and only article payload',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 1200));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    String? selectedPayload;
    final message = LiveMessage(
      id: 'structured-products',
      text: 'Voici la meilleure offre disponible.',
      createdAt: DateTime.utc(2026, 8, 1, 9),
      direction: 'out',
      meta: const {
        'products': [
          {
            'title': 'iPhone 15',
            'price': 105000,
            'city': 'Cotonou · Jéricho',
            'distance_km': 3.2,
            'condition': 'Bon état',
            'availability': 'Disponible',
            'description': '128 Go · batterie vérifiée',
            'market_price_min': 116250,
            'market_price_max': 138750,
            'market_price_median': 127500,
            'photos': [_onePixelPng, _secondOnePixelPng],
            'verified': true,
          },
        ],
        'actions': [
          {'label': 'Acheter', 'payload': 'acheter'},
        ],
      },
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: LiveSmartTimeline(
            messages: [message],
            onPayload: (value) => selectedPayload = value,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    expect(find.byType(ErrorWidget), findsNothing);
    expect(find.text('1 résultat'), findsOneWidget);
    expect(find.text('iPhone 15'), findsOneWidget);
    expect(find.text('1/2'), findsOneWidget);
    expect(find.textContaining('3.2 km'), findsOneWidget);
    expect(find.textContaining('116250 – 138750 FCFA'), findsOneWidget);
    expect(find.textContaining('18 % sous la médiane'), findsOneWidget);
    expect(find.text('Acheter'), findsOneWidget);
    expect(find.text('Je suis intéressé'), findsNothing);

    await tester.tap(find.text('Acheter'));
    await tester.pump();
    expect(selectedPayload, 'acheter');
  });

  testWidgets('an invalid temporary image never replaces the timeline',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 850));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    final message = LiveMessage(
      id: 'reply-image',
      text: 'Photo envoyée',
      createdAt: DateTime.utc(2026, 7, 31, 8),
      direction: 'out',
      attachments: const [
        LiveAttachment(
          url: 'blob:temporary-photo',
          type: 'image/jpeg',
        ),
      ],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: LiveSmartTimeline(messages: [message])),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.byType(ErrorWidget), findsNothing);
    expect(find.text('Photo envoyée'), findsOneWidget);
    expect(find.byIcon(Icons.broken_image_outlined), findsOneWidget);
  });

  testWidgets('infers buyer decision actions from the conversation stage',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 850));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    String? selectedPayload;
    final message = LiveMessage(
      id: 'buyer-decision',
      text: '''✅ Demande envoyée au vendeur

Que souhaitez-vous faire ?
Répondez OUI pour accepter ce prix.
Ou proposez votre prix : Je propose 90 000 FCFA.''',
      createdAt: DateTime.utc(2026, 8, 1, 10),
      direction: 'out',
    );

    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: LiveSmartTimeline(
          messages: [message],
          onPayload: (value) => selectedPayload = value,
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('✅ Accepter ce prix'), findsOneWidget);
    expect(find.text('💬 Proposer un prix'), findsOneWidget);
    expect(find.text('❌ Refuser'), findsOneWidget);
    await tester.tap(find.text('💬 Proposer un prix'));
    await tester.pump();
    expect(selectedPayload, isNotNull);
    expect(selectedPayload, contains('waouh:counter?'));
    expect(selectedPayload, contains('suggested_price=90000'));
  });

  testWidgets(
      'uses backend negotiation actions and hides them after conclusion',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 900));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    String? selectedPayload;
    final offer = LiveMessage(
      id: 'offer',
      text: 'Nouvelle offre acheteur : 85 000 FCFA',
      createdAt: DateTime.utc(2026, 8, 1, 10),
      direction: 'out',
      meta: const {
        'intent': 'negotiation_open',
        'actions': [
          {'id': 'accepter:neg-1', 'label': '✅ Accepter'},
          {'id': 'contre-proposition:neg-1', 'label': '💬 Contre-proposer'},
          {'id': 'refuser:neg-1', 'label': '❌ Refuser'},
        ],
      },
    );
    final conclusion = LiveMessage(
      id: 'conclusion',
      text: '🎉 Accord conclu',
      createdAt: DateTime.utc(2026, 8, 1, 10, 1),
      direction: 'out',
      meta: const {'intent': 'deal_created'},
    );

    Widget timeline(List<LiveMessage> messages) => MaterialApp(
          home: Scaffold(
            body: LiveSmartTimeline(
              messages: messages,
              onPayload: (value) => selectedPayload = value,
            ),
          ),
        );

    await tester.pumpWidget(timeline([offer]));
    await tester.pumpAndSettle();

    expect(find.text('✅ Accepter'), findsOneWidget);
    expect(find.text('💬 Contre-proposer'), findsOneWidget);
    expect(find.text('❌ Refuser'), findsOneWidget);
    await tester.tap(find.text('✅ Accepter'));
    await tester.pump();
    expect(selectedPayload, isNotNull);
    expect(selectedPayload, contains('waouh:accept?'));
    expect(selectedPayload, contains('negotiation_id=neg-1'));

    await tester.pumpWidget(timeline([offer, conclusion]));
    await tester.pumpAndSettle();
    expect(find.text('✅ Accepter'), findsNothing);
    expect(find.text('💬 Contre-proposer'), findsNothing);
    expect(find.text('❌ Refuser'), findsNothing);
  });

  testWidgets(
      'keeps product gallery and payment payload in the same smart card',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 1200));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    String? selectedPayload;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: LiveSmartProductPreview(
            product: const <String, dynamic>{
              'id': 'article-15',
              'article_id': 'article-15',
              'title': 'iPhone 15',
              'price': 105000,
              'city': 'Cotonou · Jéricho',
              'distance_km': 2.4,
              'photos': [_onePixelPng, _secondOnePixelPng],
              'market_price_min': 116250,
              'market_price_max': 138750,
              'market_price_median': 127500,
              'workflow_state': 'awaiting_payment',
              'role': 'buyer',
              'deal_id': 'deal-15',
              'actions': [
                {'id': 'payer-mobile:deal-15', 'label': '💳 Mobile Money'},
                {
                  'id': 'paiement-livraison:deal-15',
                  'label': '💵 À la livraison'
                },
              ],
            },
            onPayload: (value) => selectedPayload = value,
          ),
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('iPhone 15'), findsOneWidget);
    expect(find.text('1/2'), findsOneWidget);
    expect(find.textContaining('2.4 km'), findsOneWidget);
    expect(find.text('💳 Mobile Money'), findsOneWidget);
    expect(find.text('💵 À la livraison'), findsOneWidget);
    await tester.tap(find.text('💳 Mobile Money'));
    await tester.pump();
    expect(selectedPayload, 'payer-mobile:deal-15');
  });
}
