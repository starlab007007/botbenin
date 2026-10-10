import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:waouh_app_native/live/live_onboarding.dart';

Future<void> _setup(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390 * 3, 844 * 3);
  tester.view.devicePixelRatio = 3;
  tester.platformDispatcher.accessibilityFeaturesTestValue =
      const FakeAccessibilityFeatures(disableAnimations: true);
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
    tester.platformDispatcher.clearAccessibilityFeaturesTestValue();
  });
}

Widget _app(Widget child) => MaterialApp(home: Scaffold(body: child));

void main() {
  testWidgets('trois écrans, puis Commencer termine', (tester) async {
    await _setup(tester);
    var done = 0;
    await tester.pumpWidget(_app(LiveOnboarding(onDone: () => done++)));
    await tester.pump(const Duration(milliseconds: 100));

    expect(find.text('Passer'), findsOneWidget);
    expect(find.text('Suivant'), findsOneWidget);
    expect(find.textContaining('Votre avatar. Je cherche'), findsOneWidget);

    await tester.tap(find.text('Suivant'));
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.textContaining('Dites-moi votre prix'), findsOneWidget);

    await tester.tap(find.text('Suivant'));
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('Commencer'), findsOneWidget);
    expect(find.text('Passer'), findsNothing);
    expect(find.text('Vous concluez'), findsOneWidget);

    await tester.tap(find.text('Commencer'));
    expect(done, 1);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('Passer termine tout de suite', (tester) async {
    await _setup(tester);
    var done = 0;
    await tester.pumpWidget(_app(LiveOnboarding(onDone: () => done++)));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.text('Passer'));
    expect(done, 1);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('affichée une seule fois', (tester) async {
    await _setup(tester);
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(_app(const LiveOnboardingGate(child: Text('app'))));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Passer'), findsOneWidget);

    await tester.tap(find.text('Passer'));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Passer'), findsNothing);
    expect((await SharedPreferences.getInstance()).getBool(liveOnboardingSeenKey), isTrue);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpWidget(_app(const LiveOnboardingGate(child: Text('app'))));
    await tester.pump(const Duration(milliseconds: 200));
    expect(find.text('Passer'), findsNothing);
    expect(find.text('app'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
