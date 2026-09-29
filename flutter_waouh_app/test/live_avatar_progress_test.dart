// Notes de l'avatar (parité Web) : lecture défensive, jauge, libellés et rendu.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_avatar_progress.dart';
import 'package:waouh_app_native/live/live_commerce_action_client.dart';

const steps = [
  {'key': 'verified', 'label': 'Annonce vérifiée', 'state': 'done'},
  {'key': 'room', 'label': 'Deal Room ouverte', 'state': 'done'},
  {'key': 'offer', 'label': 'Offre préparée', 'state': 'done'},
  {'key': 'sent', 'label': 'Offre transmise', 'state': 'current'},
  {'key': 'follow', 'label': 'Suivi actif', 'state': 'todo'},
  {'key': 'reply', 'label': 'Réponse du vendeur', 'state': 'todo'},
];

void main() {
  test('lecture défensive : données invalides ignorées sans exception', () {
    expect(liveParseAvatarProgress(null), isNull);
    expect(liveParseAvatarProgress('x'), isNull);
    expect(liveParseAvatarProgress([{'label': 'seul', 'state': 'done'}]), isNull);
    expect(
      liveParseAvatarProgress([
        {'label': 'a', 'state': 'bizarre'},
        {'label': 'b', 'state': 'done'},
        {'label': 'c', 'state': 'todo'},
      ])!.length,
      2,
    );
    expect(liveParseAvatarSynthesis({}), isNull);
    expect(liveParseAvatarSynthesis({'offer': 'abc'}), isNull);
    expect(liveParseAvatarSynthesis({'offer': 130000, 'stance': 'n\'importe quoi'})!.stance, 'unknown');
  });

  test('jauge, posture et libellé du prochain point', () {
    final s = liveParseAvatarSynthesis({'offer': 90000, 'listPrice': 150000, 'gapPct': -40, 'stance': 'ambitious', 'suggested': 127500})!;
    expect(s.gauge, 60);
    expect(s.stanceLabel, 'Offre ambitieuse');
    expect(liveParseAvatarSynthesis({'offer': 200000, 'listPrice': 150000})!.gauge, 100);
    final now = DateTime.utc(2026, 9, 29, 8);
    expect(liveFollowUpLabel(DateTime.utc(2026, 9, 30, 8), now: now), 'demain');
    expect(liveFollowUpLabel(DateTime.utc(2026, 9, 29, 13), now: now), 'dans 5 h');
    expect(liveFollowUpLabel(DateTime.utc(2026, 10, 2, 8), now: now), 'dans 3 jours');
    expect(liveFollowUpLabel(DateTime.utc(2026, 9, 29, 7), now: now), 'maintenant');
    expect(liveFollowUpLabel(null), 'bientôt');
  });

  testWidgets('stepper et synthèse s\'affichent (6 points, offre, prix affiché, conseil)', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SingleChildScrollView(
          child: liveAvatarBlocks({
            'avatar_progress': steps,
            'avatar_synthesis': {
              'offer': 90000, 'listPrice': 150000, 'gapPct': -40, 'stance': 'ambitious', 'suggested': 127500,
              'etaHours': 24, 'nextFollowUpAt': DateTime.now().add(const Duration(hours: 30)).toIso8601String(),
            },
          }),
        ),
      ),
    ));
    expect(find.text('Offre transmise'), findsOneWidget);
    expect(find.text('Avatar · 3/6 points notés'), findsOneWidget);
    expect(find.text('SYNTHÈSE DE L\'AVATAR'), findsOneWidget);
    expect(find.text('Offre ambitieuse'), findsOneWidget);
    expect(find.textContaining('90 000 FCFA'), findsOneWidget);
    expect(find.textContaining('127 500 FCFA'), findsOneWidget);
    expect(find.textContaining('sous 24 h'), findsOneWidget);
  });

  testWidgets('message sans données d\'avatar : rien n\'est rendu', (tester) async {
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: liveAvatarBlocks({'intent': 'x'}))));
    expect(find.byType(LiveAvatarProgressStrip), findsNothing);
    expect(find.byType(LiveAvatarSynthesisCard), findsNothing);
  });

  test('boutons de l\'avatar → actions serveur (relance, veille)', () {
    const id = 'd1a00000-0000-4000-8000-000000000001';
    expect(liveCommerceRequestFromPayload('relancer:$id', threadId: 't1'),
        {'action': 'transmit_offer', 'negotiation_id': id, 'follow_up': true, 'thread_id': 't1'});
    expect(liveCommerceRequestFromPayload('veille:$id'), {'action': 'watch_offer', 'negotiation_id': id});
    expect(liveCommerceRequestFromPayload('waouh:watch_offer?negotiation_id=$id'),
        {'action': 'watch_offer', 'negotiation_id': id});
  });
}
