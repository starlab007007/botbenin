import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_mission_domain.dart';
import 'package:waouh_app_native/live/live_nexus_service.dart';
import 'package:waouh_app_native/live/live_automatic_offers.dart';
import 'package:waouh_app_native/live/live_guided_progress.dart';

NexusDiscoveryItem offer(
  Map<String, dynamic> evidence, {
  String title = 'Plombier',
  double price = 5000,
}) => NexusDiscoveryItem.fromJson({
  'fabric_id': 'a',
  'subject': title,
  'price_min': price,
  'evidence': evidence,
});
void main() {
  test('native labels are identical to the shared approved mission copy', () {
    expect(
      missionCopy,
      jsonDecode(
        File(
          '../supabase/functions/_shared/waouh-mission-kinds.json',
        ).readAsStringSync(),
      ),
    );
  });
  test('context respects saved floor and infers days and pages', () {
    expect(
      normalizeMissionContext(
        {'price_floor': 100, 'quantity': .5, 'max_days': .5},
        'sale',
        floor: 200,
      ),
      containsPair('price_floor', 200),
    );
    expect(
      normalizeMissionContext(
        {},
        'project',
        query: 'Site de 5 pages en 2 semaines',
      ),
      containsPair('max_days', 14),
    );
  });
  test('unknown diagnostic fee never becomes free', () {
    expect(missionFacts(offer({'visit_fee': 5000})).visitTotal, isNull);
    expect(
      missionFacts(
        offer({'visit_fee': 5000, 'diagnostic_included': true}),
      ).visitTotal,
      5000,
    );
  });
  test('invalid calendar date is not treated as a deadline', () {
    expect(missionDeadline(offer({'deadline': '2026-02-30'})), isNull);
  });
  test('opportunity date-only uses the end of Benin day', () {
    expect(
      missionDeadline(offer({'deadline': '2026-10-27'})),
      DateTime.parse('2026-10-27T22:59:59Z'),
    );
  });
  final examples = <String, NexusDiscoveryItem>{
    'opportunity': offer({
      'offer_kind': 'announcement',
      'conditions': 'PME',
      'deadline': '2099-12-01',
    }, title: 'Appel à projets'),
    'service': offer({
      'scope': 'Diagnostic de fuite',
      'visit_fee': 5000,
      'diagnostic_included': true,
    }),
    'project': offer(
      {'scope': 'Site vitrine de 5 pages', 'pages': 5, 'delivery_days': 14},
      title: 'Site vitrine',
      price: 180000,
    ),
    'sale': NexusDiscoveryItem.fromJson({
      'fabric_id': 'buyer',
      'subject': 'Samsung S25',
      'intent': 'BUY',
      'price_max': 250000,
      'evidence': {'quantity': 1, 'unit': 'pièce'},
    }),
  };
  for (final entry in examples.entries) {
    testWidgets('${entry.key} fits 320px and opens an analysis without sending', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 1100);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      var sent = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    LiveGuidedProgress(
                      missionKind: entry.key,
                      phase: 'collecting',
                      count: 0,
                      onActivity: () {},
                    ),
                    LiveAutomaticOffers(
                      items: [entry.value],
                      query: entry.value.title,
                      missionKind: entry.key,
                      mode: entry.key == 'sale' ? 'sell' : 'ask',
                      missionContext: {
                        'kind': entry.key,
                        'price_floor': 200000,
                      },
                      ownArticle: entry.key == 'sale'
                          ? {'title': 'Mon Samsung S25'}
                          : null,
                      actionLabel: 'Suivre Bot',
                      onAction: () {
                        sent = true;
                      },
                      onContact: (_) {
                        sent = true;
                      },
                      onDelegate: (_) {
                        sent = true;
                      },
                      onFollow: (_) {
                        sent = true;
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();
      expect(tester.takeException(), isNull);
      expect(
        find.text('${missionCopy[entry.key]!['heading']}'),
        findsOneWidget,
      );
      // Text title is shared by the card and sheet; tap the card title currently in view.
      final title = find.text(entry.value.title).last;
      await tester.ensureVisible(title);
      await tester.tap(title);
      // The visible live-progress indicator deliberately keeps animating.
      await tester.pump(const Duration(milliseconds: 500));
      expect(sent, isFalse);
      expect(find.text('Mon analyse de cette offre'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
