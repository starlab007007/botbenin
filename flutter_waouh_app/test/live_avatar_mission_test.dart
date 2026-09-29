// Tableau de mission vivant + notification de l'avatar dans l'application (parité Web).
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_avatar_banner.dart';
import 'package:waouh_app_native/live/live_avatar_guide.dart';

/// Plusieurs images courtes : l'animation de sortie doit avoir le temps d'être retirée de l'arbre.
Future<void> frames(WidgetTester tester, {int count = 6}) async {
  for (var i = 0; i < count; i++) {
    await tester.pump(const Duration(milliseconds: 200));
  }
}

void main() {
  test('tableau : compteurs entiers positifs, le reste ignoré', () {
    expect(liveParseMissionBoard(null), isNull);
    final b = liveParseMissionBoard({'searches': 3, 'contacted': '12', 'negotiations': -2, 'watching': 1.9, 'deals': 99999, 'needsYou': 2})!;
    expect([b.searches, b.contacted, b.negotiations, b.watching, b.deals, b.needsYou], [3, 0, 0, 1, 9999, 2]);
  });

  test('pastilles : non nul seulement, « à vous » d\'abord, pluriels, recherches + missions cumulées', () {
    final chips = liveBoardChips(const LiveMissionBoard(searches: 2, missions: 1, contacted: 1, watching: 4, needsYou: 2));
    expect(chips.map((c) => '${c.count} ${c.label}').toList(), ['2 à vous', '3 recherches', '1 contact', '4 veilles']);
    expect(liveBoardChips(const LiveMissionBoard()), isEmpty);
  });

  test('service : action status ; réseau coupé → null sans exception', () async {
    final calls = <Map<String, dynamic>>[];
    final ok = LiveAvatarGuideService((body) async {
      calls.add(body);
      return {'ok': true, 'board': {'searches': 1}};
    });
    expect((await ok.status())!.searches, 1);
    expect(calls.single, {'action': 'status'});
    final down = LiveAvatarGuideService((_) async => throw Exception('réseau'));
    expect(await down.status(), isNull);
  });

  testWidgets('barre : la mission de l\'avatar s\'affiche en pastilles, message d\'invite sans mission', (tester) async {
    Future<void> pump(Map<String, dynamic> board) async {
      final service = LiveAvatarGuideService((body) async => body['action'] == 'status' ? {'ok': true, 'board': board} : null);
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: LiveAvatarGuideBar(key: UniqueKey(), service: service, autoOpen: false))));
      await tester.pump();
      await tester.pump();
    }

    await pump({'searches': 3, 'contacted': 12, 'negotiations': 2, 'needsYou': 1});
    expect(find.text('⚡ 1 à vous'), findsOneWidget);
    expect(find.text('🔎 3 recherches'), findsOneWidget);
    expect(find.text('📨 12 contacts'), findsOneWidget);
    expect(find.text('🤝 2 négociations'), findsOneWidget);
    await pump({});
    expect(find.textContaining('Aucune mission active'), findsOneWidget);
  });

  test('notification : seul le type avatar_point avec un texte est lu', () {
    expect(liveParseAvatarNotice({'notification_type': 'match', 'payload': {'text': 'x'}}), isNull);
    expect(liveParseAvatarNotice({'notification_type': 'avatar_point', 'payload': {'text': '  '}}), isNull);
    expect(liveParseAvatarNotice({'notification_type': 'avatar_point'}), isNull);
    final n = liveParseAvatarNotice({
      'id': 'n1',
      'notification_type': 'avatar_point',
      'payload': {
        'text': 'Une voie de contact vient de s\'ouvrir.',
        'actions': [
          {'id': 'envoyer-offre:1', 'label': 'Envoyer mon offre'},
          {'id': 'x', 'label': ''},
        ],
      },
    })!;
    expect([n.id, n.title, n.actions], ['n1', 'Votre avatar', ['Envoyer mon offre']]);
  });

  testWidgets('bannière : apparaît, ne se répète pas, disparaît seule ; un tap ouvre le chat ; désactivée sur le chat', (tester) async {
    final controller = StreamController<LiveAvatarNotice>.broadcast();
    var opened = 0;
    Widget host({bool enabled = true}) => MaterialApp(
          home: LiveAvatarBannerHost(events: controller.stream, enabled: enabled, onOpen: () => opened++, child: const Scaffold(body: Text('écran'))),
        );
    await tester.pumpWidget(host());
    const notice = LiveAvatarNotice(id: 'a', title: 'Votre avatar', text: 'Relance possible pour « iPhone 13 ».', actions: ['Relancer le vendeur']);
    controller.add(notice);
    await tester.pump();
    await frames(tester);
    expect(find.text('Relance possible pour « iPhone 13 ».'), findsOneWidget);
    expect(find.text('Relancer le vendeur'), findsOneWidget);
    await tester.tap(find.text('Relance possible pour « iPhone 13 ».'));
    await frames(tester);
    expect(opened, 1);
    expect(find.text('Relance possible pour « iPhone 13 ».'), findsNothing);
    controller.add(notice); // même identifiant : pas de doublon
    await frames(tester);
    expect(find.text('Relance possible pour « iPhone 13 ».'), findsNothing);
    controller.add(const LiveAvatarNotice(id: 'b', title: 'Votre avatar', text: 'Autre message.'));
    await frames(tester);
    expect(find.text('Autre message.'), findsOneWidget);
    await tester.pump(const Duration(seconds: 8));
    await frames(tester);
    await frames(tester);
    expect(find.text('Autre message.'), findsNothing);
    await tester.pumpWidget(host(enabled: false));
    controller.add(const LiveAvatarNotice(id: 'c', title: 'Votre avatar', text: 'Sur le chat.'));
    await frames(tester);
    expect(find.text('Sur le chat.'), findsNothing);
    await controller.close();
  });
}
