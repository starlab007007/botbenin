import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_offer_choice.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';
import 'package:waouh_app_native/live/live_missions_screen.dart';
import 'package:waouh_app_native/live/live_automatic_offers.dart';

void main() {
  final cases =
      jsonDecode(File('../testdata/waouh-choice-cases.json').readAsStringSync())
          as List;
  for (final raw in cases) {
    final c = Map<String, dynamic>.from(raw as Map);
    test('Web/Flutter parity: ${c['name']}', () {
      final criteria = Map<String, dynamic>.from(c['criteria'] as Map);
      final rows = (c['offers'] as List)
          .map(
            (r) => NexusDiscoveryItem.fromJson(
              Map<String, dynamic>.from(r as Map),
            ),
          )
          .toList();
      expect(
        rankLiveOfferChoices(
          rows,
          query: '${criteria['query'] ?? ''}',
          city: '${criteria['city'] ?? ''}',
          budget: (criteria['budget'] as num?)?.toDouble(),
          mode: '${criteria['mode'] ?? 'buy'}',
          priority: '${criteria['priority'] ?? 'price'}',
        ).map((r) => r.fabricId).toList(),
        c['expected'],
      );
    });
  }
  testWidgets(
    'compact mission and automatic recommendation fit 320px without selection boxes',
    (tester) async {
      tester.view.physicalSize = const Size(320, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final rows = (cases.first['offers'] as List)
          .map(
            (r) => NexusDiscoveryItem.fromJson(
              Map<String, dynamic>.from(r as Map),
            ),
          )
          .toList();
      var follow = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    LiveMinimalMissionTile(
                      title:
                          'Une mission avec un intitulé suffisamment long pour passer sur plusieurs lignes',
                      line: 'Bot attend 2 réponses',
                      status: 'En cours',
                      onTap: () {},
                    ),
                    LiveAutomaticOffers(
                      items: rows,
                      query: 'iPhone 13',
                      city: 'Cotonou',
                      budget: 220000,
                      actionLabel: 'Suivre Bot',
                      onAction: () => follow = true,
                      onContact: (_) {},
                      onDelegate: (_) {},
                      onFollow: (_) {},
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(find.byType(Checkbox), findsNothing);
      expect(find.text('Les offres retenues'), findsOneWidget);
      expect(find.text('Mon comparatif'), findsOneWidget);
      expect(find.text('Prix et disponibilité confirmés'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.ensureVisible(find.text('Suivre Bot'));
      await tester.tap(find.text('Suivre Bot'));
      expect(follow, isTrue);
      await tester.ensureVisible(find.text('Mon comparatif'));
      await tester.tap(find.text('Mon comparatif'));
      await tester.pumpAndSettle();
      expect(find.text('Mon comparatif automatique'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
