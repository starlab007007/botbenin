import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_quick_ask.dart';

void main() {
  testWidgets('guided purchase preserves the Web layout and action order', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    String? route;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async {
                route = await showLiveQuickAsk(
                  context,
                  LiveQuickAskKind.acheter,
                );
              },
              child: const Text('Acheter'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Acheter'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Samsung S25'));
    await tester.pumpAndSettle();

    final city = find.widgetWithText(TextField, 'Ville ou quartier');
    final budget = find.widgetWithText(TextField, 'Budget max (FCFA)');
    expect(city, findsOneWidget);
    expect(budget, findsOneWidget);
    expect(tester.getTopLeft(city).dy, tester.getTopLeft(budget).dy);
    expect(tester.getTopLeft(city).dx, lessThan(tester.getTopLeft(budget).dx));
    final delegate = find.text('Se connecter pour confier à Bot');
    final manual = find.text('Voir les résultats moi-même');
    expect(
      tester.getTopLeft(delegate).dy,
      lessThan(tester.getTopLeft(manual).dy),
    );

    await tester.enterText(budget, '220 000');
    await tester.tap(manual);
    await tester.pumpAndSettle();
    expect(Uri.parse(route!).queryParameters, containsPair('q', 'Samsung S25'));
    expect(Uri.parse(route!).queryParameters, containsPair('budget', '220000'));
    expect(tester.takeException(), isNull);
  });

  testWidgets('opportunity only displays the location field', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () => showLiveQuickAsk(
                context,
                LiveQuickAskKind.opportunite,
                initialQuery: 'Bourse data science',
              ),
              child: const Text('Ouvrir'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Ouvrir'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(TextField, 'Ville ou quartier'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
    expect(tester.takeException(), isNull);
  });
}
