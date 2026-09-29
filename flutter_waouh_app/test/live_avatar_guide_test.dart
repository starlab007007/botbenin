// L'avatar guide (parité Web) : lecture défensive, cadence, ouverture unique, carte, barre, réglages.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_avatar_guide.dart';
import 'package:waouh_app_native/live/live_commerce_action_client.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_widgets.dart';

Map<String, dynamic> briefingJson({String kind = 'welcome', DateTime? at}) => {
      'kind': kind,
      'greeting': 'Bonjour Zime, content de vous retrouver.',
      'sentences': [
        'Bonjour Zime, content de vous retrouver.',
        '1 offre à traiter, 1 offre sans réponse depuis plus de 24 h.',
        'Prochaine étape : relancer le vendeur de « iPhone 13 », d\'un tap.',
      ],
      'sections': [
        {
          'key': 'activities',
          'title': 'Ce que je fais',
          'items': [
            {'label': 'iPhone 13', 'detail': 'Offre transmise · il y a 26 h', 'tone': 'warn'}
          ]
        },
        {
          'key': 'next',
          'title': 'Prochaines étapes',
          'items': [
            {'label': 'Relancer', 'detail': 'iPhone 13', 'tone': 'warn'}
          ]
        },
      ],
      'actions': [
        {'id': 'relancer:d1a00000-0000-4000-8000-000000000001', 'label': 'Relancer le vendeur'},
        {'id': 'avatar:reglages', 'label': 'Régler mes points'},
      ],
      'tip': 'Je peux garder une offre en veille et vous prévenir dès qu\'un vendeur devient joignable.',
      'generatedAt': (at ?? DateTime.now()).toUtc().toIso8601String(),
    };

class FakeInvoke {
  final calls = <Map<String, dynamic>>[];
  Map<String, dynamic>? Function(Map<String, dynamic>)? handler;
  Future<Map<String, dynamic>?> call(Map<String, dynamic> body) async {
    calls.add(body);
    return handler?.call(body);
  }
}

/// L'orbe pulse en continu : `pumpAndSettle` n'aboutirait jamais, on avance le temps par pas.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 120));
  }
}

void main() {
  setUp(liveResetAvatarAutoOpen);

  test('lecture défensive : données invalides ignorées sans exception', () {
    expect(liveParseAvatarBriefing(null), isNull);
    expect(liveParseAvatarBriefing('x'), isNull);
    expect(liveParseAvatarBriefing({'sentences': ['seule']}), isNull);
    final parsed = liveParseAvatarBriefing({
      ...briefingJson(),
      'sections': [
        {'key': 'x', 'title': '', 'items': []},
        ...(briefingJson()['sections'] as List),
      ],
      'actions': [
        {'label': 'sans id'},
        ...(briefingJson()['actions'] as List),
      ],
    })!;
    expect(parsed.sections.length, 2);
    expect(parsed.actions.length, 2);
    expect(liveParseAvatarBriefing({...briefingJson(), 'sentences': ['a', 'b', 'c', 'd', 'e']})!.sentences.length, 3);
    expect(liveParseAvatarBriefing({...briefingJson(), 'kind': '??'})!.kind, 'point');
  });

  test('réglages : valeurs inconnues → défauts ; libellé du prochain point', () {
    expect(liveParseAvatarPrefs(null), isNull);
    final p = liveParseAvatarPrefs({'cadence': 'chaque-minute', 'welcome': 'oui', 'quiet_start': 99})!;
    expect([p.cadence, p.welcome, p.quietStart, p.quietEnd], ['daily', true, 21, 7]);
    final w = liveParseAvatarPrefs({'cadence': 'weekly', 'welcome': false, 'quiet_start': 22, 'quiet_end': 6})!;
    expect([w.cadence, w.welcome, w.quietStart, w.quietEnd], ['weekly', false, 22, 6]);
    final now = DateTime.utc(2026, 9, 29, 8);
    expect(liveNextPointLabel(null, 'off', now: now), 'Points réguliers désactivés');
    expect(liveNextPointLabel(null, 'daily', now: now), 'Prochain point bientôt');
    expect(liveNextPointLabel(DateTime.utc(2026, 9, 29, 11), 'daily', now: now), 'Prochain point dans 3 h');
    expect(liveNextPointLabel(DateTime.utc(2026, 9, 30, 8), 'daily', now: now), 'Prochain point demain');
    expect(liveNextPointLabel(DateTime.utc(2026, 10, 3, 8), 'weekly', now: now), 'Prochain point dans 4 jours');
    expect(liveNextPointLabel(DateTime.utc(2026, 9, 29, 7), 'daily', now: now), 'Prochain point imminent');
  });

  test('ouverture automatique : une seule par fenêtre de 30 min', () {
    final t0 = DateTime.utc(2026, 9, 29, 8);
    expect(liveShouldAutoOpenAvatar(now: t0), isTrue);
    expect(liveShouldAutoOpenAvatar(now: t0.add(const Duration(minutes: 10))), isFalse);
    expect(liveShouldAutoOpenAvatar(now: t0.add(const Duration(minutes: 31))), isTrue);
  });

  test('service : open renvoie le point ; réseau coupé ou refus → null sans exception ; set_prefs n\'envoie que le patch', () async {
    final fake = FakeInvoke()
      ..handler = (body) => {
            'ok': true,
            'sent': true,
            'reason': 'open',
            'briefing': briefingJson(),
            'prefs': {'cadence': 'daily', 'welcome': true, 'quiet_start': 21, 'quiet_end': 7},
          };
    final service = LiveAvatarGuideService(fake.call);
    final r = await service.brief('open', sessionId: 'sess-123456');
    expect(r?.sent, isTrue);
    expect(r?.briefing?.sentences.length, 3);
    expect(fake.calls.first, {'action': 'open', 'session_id': 'sess-123456'});
    final broken = LiveAvatarGuideService((_) async => throw Exception('réseau'));
    expect(await broken.brief('now'), isNull);
    expect(await LiveAvatarGuideService((_) async => {'ok': false}).getPrefs(), isNull);
    fake.handler = (b) => {'ok': true, 'prefs': {'cadence': 'weekly'}};
    final saved = await service.savePrefs({'cadence': 'weekly'});
    expect(saved?.cadence, 'weekly');
    expect(fake.calls.last, {'action': 'set_prefs', 'prefs': {'cadence': 'weekly'}});
  });

  testWidgets('carte : accueil, 3 phrases, sections, boutons, aide ; un tap envoie l\'identifiant du bouton', (tester) async {
    final taps = <String>[];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: LiveAvatarBriefingCard(briefing: liveParseAvatarBriefing(briefingJson())!, onAction: taps.add),
        ),
      ),
    ));
    expect(find.text('Votre avatar'), findsOneWidget);
    expect(find.textContaining('Bon retour'), findsOneWidget);
    expect(find.textContaining('content de vous retrouver'), findsOneWidget);
    expect(find.textContaining('Prochaine étape : relancer le vendeur'), findsOneWidget);
    expect(find.text('CE QUE JE FAIS'), findsOneWidget);
    expect(find.textContaining('Je peux aussi'), findsOneWidget);
    await tester.tap(find.text('Relancer le vendeur'));
    await tester.tap(find.text('Régler mes points'));
    expect(taps, ['relancer:d1a00000-0000-4000-8000-000000000001', 'avatar:reglages']);
  });

  testWidgets('ancien point : une ligne repliée, sans boutons', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: LiveAvatarBriefingCard(briefing: liveParseAvatarBriefing(briefingJson())!, collapsed: true, onAction: (_) {})),
    ));
    expect(find.text('Relancer le vendeur'), findsNothing);
    expect(find.textContaining('Prochaine étape'), findsOneWidget);
  });

  testWidgets('bulle de chat : un message avatar_briefing devient la carte premium (récent) ou une ligne repliée (ancien)', (tester) async {
    LiveMessage message(DateTime at) => LiveMessage(
          id: 'b-${at.microsecondsSinceEpoch}',
          text: 'texte brut',
          createdAt: at,
          direction: 'out',
          meta: {'intent': 'avatar_briefing', 'avatar_briefing': briefingJson(at: at), 'actions': briefingJson()['actions']},
        );
    final taps = <String>[];
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: SingleChildScrollView(child: LiveMessageBubble(message: message(DateTime.now()), onPayload: taps.add))),
    ));
    expect(find.byType(LiveAvatarBriefingCard), findsOneWidget);
    expect(find.text('Relancer le vendeur'), findsOneWidget);
    expect(find.text('texte brut'), findsNothing);
    await tester.tap(find.text('Relancer le vendeur'));
    expect(taps.single, startsWith('relancer:'));
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: LiveMessageBubble(message: message(DateTime.now().subtract(const Duration(hours: 3))), onPayload: taps.add)),
    ));
    expect(find.text('Relancer le vendeur'), findsNothing);
  });

  testWidgets('barre du guide : accueil automatique à l\'ouverture, « Faire le point », statut du prochain point', (tester) async {
    final fake = FakeInvoke()
      ..handler = (body) => {
            'ok': true,
            'sent': body['action'] != 'get_prefs',
            'reason': 'open',
            'briefing': briefingJson(),
            'prefs': {'cadence': 'daily', 'welcome': true, 'quiet_start': 21, 'quiet_end': 7, 'next_briefing_at': DateTime.now().add(const Duration(hours: 5)).toIso8601String()},
          };
    final service = LiveAvatarGuideService(fake.call);
    final key = GlobalKey<LiveAvatarGuideBarState>();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: LiveAvatarGuideBar(key: key, service: service, sessionId: () async => 'sess-123456')),
    ));
    await settle(tester);
    expect(fake.calls.first['action'], 'open');
    expect(find.textContaining('Prochain point dans'), findsOneWidget);
    await tester.tap(find.text('Faire le point'));
    await settle(tester);
    expect(fake.calls.map((c) => c['action']).where((a) => a != 'status'), ['open', 'now']);
    // Deuxième instance dans la fenêtre de 30 min : pas de second accueil automatique.
    final other = FakeInvoke()..handler = (b) => {'ok': true, 'prefs': {'cadence': 'daily'}};
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: LiveAvatarGuideBar(service: LiveAvatarGuideService(other.call)))));
    await settle(tester);
    expect(other.calls.map((c) => c['action']), ['get_prefs', 'status']);
  });

  testWidgets('réglages : choisir une cadence enregistre le patch ; refus serveur → réglage annulé et message d\'erreur', (tester) async {
    final fake = FakeInvoke()..handler = (b) => {'ok': true, 'prefs': {'cadence': b['prefs']['cadence'] ?? 'daily', 'welcome': true, 'quiet_start': 21, 'quiet_end': 7}};
    final service = LiveAvatarGuideService(fake.call);
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: LiveAvatarSettingsSheet(initial: const LiveAvatarPrefs(), service: service))));
    expect(find.text('Régler mon avatar'), findsOneWidget);
    await tester.ensureVisible(find.byKey(const ValueKey('avatar-cadence-weekly')));
    await tester.tap(find.byKey(const ValueKey('avatar-cadence-weekly')));
    await settle(tester);
    expect(fake.calls.last, {'action': 'set_prefs', 'prefs': {'cadence': 'weekly'}});
    expect(find.text('Réglages enregistrés'), findsOneWidget);

    fake.handler = (b) => null;
    await tester.ensureVisible(find.byKey(const ValueKey('avatar-cadence-off')));
    await tester.tap(find.byKey(const ValueKey('avatar-cadence-off')));
    await settle(tester);
    expect(find.text('Réglage non enregistré, réessayez.'), findsOneWidget);
    // Cadence coupée refusée : les heures calmes restent proposées (la cadence précédente est conservée).
    expect(find.byKey(const ValueKey('avatar-quiet-start')), findsOneWidget);
  });

  test('boutons de l\'avatar → actions serveur', () {
    const id = 'd1a00000-0000-4000-8000-000000000001';
    expect(liveCommerceRequestFromPayload('relancer:$id')!['follow_up'], true);
    expect(liveCommerceRequestFromPayload('veille:$id')!['action'], 'watch_offer');
    expect(liveCommerceRequestFromPayload('envoyer-offre:$id')!['action'], 'transmit_offer');
  });

  group('l\'avatar écrit dans le chat (bulles)', () {
    Map<String, dynamic> bubbleMeta(int seq, {int of = 3}) => {
          'intent': 'avatar_briefing',
          'avatar_bubble': {'seq': seq, 'of': of},
        };
    LiveMessage bubble(String id, int seq, DateTime at) =>
        LiveMessage(id: id, text: 'phrase $seq', createdAt: at, direction: 'out', meta: bubbleMeta(seq));

    test('bulle valide reconnue, le reste rejeté', () {
      expect(liveAvatarBubbleInfo(bubbleMeta(1)), (seq: 1, of: 3));
      expect(liveAvatarBubbleInfo({'intent': 'avatar_briefing'}), isNull);
      expect(liveAvatarBubbleInfo({'intent': 'autre', 'avatar_bubble': {'seq': 0, 'of': 1}}), isNull);
      expect(liveAvatarBubbleInfo({'intent': 'avatar_briefing', 'avatar_bubble': {'seq': 3, 'of': 3}}), isNull);
    });

    test('délais : croissants en direct, nuls pour l\'historique et les messages ordinaires', () {
      final now = DateTime(2026, 9, 29, 10);
      final fresh = now.subtract(const Duration(milliseconds: 200));
      expect(liveAvatarRevealDelay(bubbleMeta(0), fresh, now), const Duration(milliseconds: 700));
      expect(liveAvatarRevealDelay(bubbleMeta(1), fresh, now), const Duration(milliseconds: 1800));
      expect(liveAvatarRevealDelay(bubbleMeta(2), fresh, now), const Duration(milliseconds: 2900));
      expect(liveAvatarRevealDelay(bubbleMeta(1), now.subtract(const Duration(minutes: 5)), now), Duration.zero);
      expect(liveAvatarRevealDelay({'intent': 'x'}, fresh, now), Duration.zero);
    });

    test('affichage séquencé : les bulles apparaissent dans l\'ordre, une fois révélées elles le restent', () {
      final now = DateTime(2026, 9, 29, 10);
      final at = now.subtract(const Duration(milliseconds: 100));
      final msgs = [bubble('a', 0, at), bubble('b', 1, at), bubble('c', 2, at)];
      final reveal = LiveAvatarReveal();
      var r = reveal.filter(msgs, now);
      expect(r.visible, isEmpty);
      expect(r.nextAt, now.add(const Duration(milliseconds: 700)));
      r = reveal.filter(msgs, now.add(const Duration(milliseconds: 800)));
      expect(r.visible.map((m) => m.id), ['a']);
      r = reveal.filter(msgs, now.add(const Duration(milliseconds: 1900)));
      expect(r.visible.map((m) => m.id), ['a', 'b']);
      r = reveal.filter(msgs, now.add(const Duration(seconds: 4)));
      expect(r.visible.map((m) => m.id), ['a', 'b', 'c']);
      expect(r.nextAt, isNull);
      // Historique : tout est visible d\'un coup, sans indicateur.
      final old = now.subtract(const Duration(hours: 2));
      final hist = LiveAvatarReveal().filter([bubble('x', 0, old), bubble('y', 1, old)], now);
      expect(hist.visible.length, 2);
      expect(hist.nextAt, isNull);
    });

    test('réglages WhatsApp : évènements actifs, bilans coupés par défaut', () {
      final d = liveParseAvatarPrefs({});
      expect([d!.notifyEvents, d.notifyDigest], [true, false]);
      final p = liveParseAvatarPrefs({'notify_events': false, 'notify_digest': true});
      expect([p!.notifyEvents, p.notifyDigest], [false, true]);
      expect(const LiveAvatarPrefs().copyWith(notifyDigest: true).notifyDigest, true);
    });

    testWidgets('une bulle de l\'avatar est un message ordinaire : texte lisible sans rien ouvrir, boutons sur la dernière', (tester) async {
      final msg = LiveMessage(
        id: 'last', text: 'Prochaine étape : relancer le vendeur.', createdAt: DateTime.now().subtract(const Duration(hours: 1)), direction: 'out',
        meta: {...bubbleMeta(2), 'actions': [{'id': 'relancer:n1', 'label': 'Relancer le vendeur'}]},
      );
      final taps = <String>[];
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child: LiveMessageBubble(message: msg, onPayload: taps.add)))));
      expect(find.byType(LiveAvatarBriefingCard), findsNothing);
      expect(find.textContaining('Prochaine étape'), findsOneWidget);
      await tester.tap(find.text('Relancer le vendeur'));
      expect(taps.single, startsWith('relancer:'));
    });

    testWidgets('« L\'avatar écrit… » s\'affiche', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: Scaffold(body: LiveAvatarTypingRow())));
      expect(find.byKey(const ValueKey('avatar-typing')), findsOneWidget);
    });
  });
}
