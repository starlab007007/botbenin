import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_widgets.dart';
import 'package:waouh_app_native/live/live_avatar_guide.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('focus header occupies only 52 logical pixels', (tester) async {
    await tester.binding.setSurfaceSize(const Size(360, 680));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(appBar: LiveHeader(
        title: 'WAOUH One', subtitle: 'Bot · Avatar IA', compact: true,
      ), body: Center(child: Text('Messages'))),
    ));
    await tester.pumpAndSettle();
    final bar = tester.widget<LiveHeader>(find.byType(LiveHeader));
    expect(bar.preferredSize.height, 52);
    expect(find.text('WAOUH One'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('avatar summary is 43px, mission details open on demand', (tester) async {
    await tester.binding.setSurfaceSize(const Size(360, 680));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final service = LiveAvatarGuideService((request) async => <String, dynamic>{});
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: Column(children: [
          LiveAvatarGuideBar(service: service, autoOpen: false, compact: true),
          const Expanded(child: Center(child: Text('Zone de lecture'))),
        ]),
      ),
    ));
    await tester.pump();
    expect(tester.getSize(find.byKey(const ValueKey('avatar-guide-compact'))).height, 43);
    expect(find.text('Zone de lecture'), findsOneWidget);
    await tester.tap(find.byTooltip('Détails et paramètres Avatar'));
    // The glowing Avatar orb repeats indefinitely, so avoid pumpAndSettle.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 450));
    expect(find.text('Votre avatar WAOUH'), findsOneWidget);
    expect(find.text('Faire le point'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
