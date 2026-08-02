import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_smart_timeline.dart';

const _onePixelPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    'AAAADUlEQVR42mNk+M/wHwAEAQH/2p5ZvgAAAABJRU5ErkJggg==';
const _secondOnePixelPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
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
📸 1 photo
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
    expect(find.text('Acheter'), findsNWidgets(2));
    expect(find.byType(Image), findsNWidgets(2));

    await tester.tap(find.text('Acheter').first);
    await tester.pump();
    expect(selectedPayload, contains('iPhone 11'));
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
}
