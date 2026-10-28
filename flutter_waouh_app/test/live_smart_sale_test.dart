import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_smart_sale.dart';
import 'package:waouh_app_native/live/live_smart_sale_data.dart';

void main() {
  testWidgets('a navigation failure never republishes a committed sale', (
    tester,
  ) async {
    var publications = 0, navigations = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: LiveSmartSale(
              owner: 'owner-a',
              autoLocate: false,
              initial: {
                'title': 'Samsung S25',
                'price': 350000.0,
                'condition': 'good',
                'city': 'Cotonou',
              },
              analyze: (draft, visual) async => {},
              publish: (draft) async {
                publications++;
                return {...draft, 'article_id': 'article-a'};
              },
              onPublished: (_) {
                navigations++;
                if (navigations == 1) throw StateError('navigation');
              },
            ),
          ),
        ),
      ),
    );
    final price = find.byType(TextField).at(1);
    expect(tester.widget<TextField>(price).controller!.text, '350 000');
    await tester.ensureVisible(find.text('Publier et trouver'));
    await tester.tap(find.text('Publier et trouver'));
    await tester.pump();
    expect(find.text('Annonce publiée'), findsOneWidget);
    expect(
      find.text('Publication non terminée. Votre fiche est conservée.'),
      findsNothing,
    );
    await tester.tap(find.text('Reprendre la recherche'));
    await tester.pump();
    expect(publications, 1);
    expect(navigations, 2);
    expect(tester.takeException(), isNull);
  });
  testWidgets('a late publication does not navigate after the form is closed', (
    tester,
  ) async {
    final response = Completer<Map<String, dynamic>>();
    var navigations = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: LiveSmartSale(
              owner: 'owner-a',
              autoLocate: false,
              initial: {
                'title': 'Samsung S25',
                'price': 350000,
                'condition': 'good',
                'city': 'Cotonou',
              },
              analyze: (draft, visual) async => {},
              publish: (_) => response.future,
              onPublished: (_) => navigations++,
            ),
          ),
        ),
      ),
    );
    await tester.ensureVisible(find.text('Publier et trouver'));
    await tester.tap(find.text('Publier et trouver'));
    await tester.pump();
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));
    response.complete({'title': 'Samsung S25', 'article_id': 'article-a'});
    await tester.pump();
    expect(navigations, 0);
    expect(tester.takeException(), isNull);
  });
  test(
    'intelligent sale understands French facts without inventing an unknown price',
    () {
      final s = liveSaleTextSuggestions(
        'Moto comme neuve 1.250.000 F CFA à Parakou',
      );
      expect((s['price'] as Map)['value'], 1250000);
      expect(s['condition'], 'like_new');
      expect('${s['city']}'.toLowerCase(), 'parakou');
      expect(
        liveSaleTextSuggestions('1,5 tonnes de soja'),
        containsPair('quantity', 1.5),
      );
      expect(liveSaleTextSuggestions('Samsung S25'), isEmpty);
    },
  );
  test(
    'manual choices and owner isolation survive suggestions and handoff',
    () {
      final d = liveNewSaleDraft({
        'title': 'Samsung S25',
        'price': 300000,
        'condition': 'good',
        'city': 'Parakou',
      });
      expect(
        liveMergeSaleSuggestions(
          d,
          {
            'title': 'iPhone',
            'condition': 'new',
            'price': {'value': 400000},
          },
          {'title', 'condition', 'price'},
        ),
        d,
      );
      final sale = LivePublishedSale('owner-a', d, {
        'id': 'article-a',
        'article_id': 'article-a',
        'title': 'Samsung S25',
      });
      final path = Uri.parse(LiveSaleHandoff.path(sale));
      final id = path.queryParameters['sale_draft'];
      expect(path.queryParameters['article_id'], 'article-a');
      expect(LiveSaleHandoff.read(id, 'owner-b'), isNull);
      expect(LiveSaleHandoff.read(id, 'owner-a'), sale);
    },
  );
  testWidgets(
    'four photos and price fit 320px, even with keyboard; publication is explicit',
    (tester) async {
      tester.view.physicalSize = const Size(320, 780);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var published = 0;
      final analyzed = Completer<Map<String, dynamic>>();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: MediaQuery(
              data: const MediaQueryData(
                size: Size(320, 780),
                viewInsets: EdgeInsets.only(bottom: 280),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: LiveSmartSale(
                  owner: 'owner-a',
                  autoLocate: false,
                  initial: {
                    'title': 'Samsung S25',
                    'price': 350000,
                    'condition': 'good',
                    'city': 'Cotonou',
                    'photos': List.generate(
                      6,
                      (i) => 'https://images.example/$i.jpg',
                    ),
                  },
                  analyze: (draft, visual) => analyzed.future,
                  publish: (draft) async {
                    published++;
                    expect((draft['photos'] as List).length, 4);
                    expect(draft['condition'], 'good');
                    return {...draft, 'article_id': 'article-a'};
                  },
                  onPublished: (_) {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump(const Duration(milliseconds: 700));
      expect(find.text('4 / 4 photos'), findsOneWidget);
      expect(published, 0);
      expect(tester.takeException(), isNull);
      final price = find.byType(TextField).at(1);
      await tester.enterText(price, '300000');
      analyzed.complete({
        'price': {
          'value': 400000,
          'observations': 3,
          'low': 380000,
          'high': 410000,
        },
      });
      await tester.pump();
      expect((tester.widget<TextField>(price)).controller!.text, '300000');
      await tester.ensureVisible(find.text('Publier et trouver'));
      await tester.tap(find.text('Publier et trouver'));
      await tester.pump();
      expect(published, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
