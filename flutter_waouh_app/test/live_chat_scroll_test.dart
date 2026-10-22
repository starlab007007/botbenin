import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_smart_timeline.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('welcome and product context are vertically scrollable on a small phone',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(360, 620));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: SizedBox(
          height: 460,
          child: LiveSmartTimeline(
            messages: <LiveMessage>[],
            leading: SizedBox(
              height: 900,
              child: Align(
                alignment: Alignment.topCenter,
                child: Text('Bienvenue dans WAOUH'),
              ),
            ),
          ),
        ),
      ),
    ));
    await tester.pumpAndSettle();

    final scrollable = tester.state<ScrollableState>(find.byType(Scrollable).first);
    expect(scrollable.position.maxScrollExtent, greaterThan(100));
    // An empty chat shows the beginning of its welcome text first.
    expect(scrollable.position.pixels, closeTo(0, 1));
    await tester.drag(find.byType(ListView), const Offset(0, -260));
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, greaterThan(50));
    expect(tester.takeException(), isNull);
  });

  testWidgets('incoming message never pulls reader away from older messages',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 670));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    late StateSetter update;
    var messages = <LiveMessage>[];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SizedBox(
          height: 520,
          child: StatefulBuilder(builder: (context, setState) {
            update = setState;
            return LiveSmartTimeline(
              messages: messages,
              leading: const SizedBox(height: 1600),
            );
          }),
        ),
      ),
    ));
    await tester.pumpAndSettle();
    final scrollable = tester.state<ScrollableState>(find.byType(Scrollable).first);
    await tester.drag(find.byType(ListView), const Offset(0, -550));
    await tester.pumpAndSettle();
    final readingPosition = scrollable.position.pixels;
    expect(readingPosition, lessThan(scrollable.position.maxScrollExtent - 120));

    update(() {
      messages = <LiveMessage>[
        LiveMessage(
          id: 'received-1',
          text: 'Un nouveau message est arrivé pendant la lecture.',
          // LiveMessage defines 'in' as the user's outgoing message.
          // 'out' represents the assistant/counterpart's new reply.
          direction: 'out',
          createdAt: DateTime.utc(2026, 10, 22),
        ),
      ];
    });
    await tester.pumpAndSettle();
    expect(scrollable.position.pixels, closeTo(readingPosition, 35));
    expect(find.text('Nouveau message'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
