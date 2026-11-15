import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_bot_follow_up.dart';

void main() {
  final now = DateTime.parse('2026-11-15T18:00:00Z');

  test('dit où en est Bot sans jargon, étape par étape', () {
    final start = liveFollowUpView({'events': [{'event_type': 'delegate', 'created_at': '2026-11-15T17:59:00Z', 'id': '1'}], 'control_mode': 'bot'});
    expect(start.headline, 'Bot prépare le premier contact');
    expect(start.steps.map((s) => s.state).toList(), ['done', 'active', 'todo', 'todo']);

    expect(liveFollowUpView({'provider_joined': true, 'control_mode': 'bot'}).headline, 'En attente de la réponse du vendeur');

    final negotiating = liveFollowUpView({'provider_joined': true, 'current_offer_version': 2, 'control_mode': 'bot'});
    expect(negotiating.headline, 'Bot négocie pour vous');
    expect(negotiating.steps.map((s) => s.state).toList(), ['done', 'done', 'done', 'active']);

    final agreed = liveFollowUpView({'provider_joined': true, 'current_offer_version': 2, 'agreement': {'status': 'accepted'}});
    expect(agreed.headline, 'Accord trouvé');
    expect(agreed.steps.every((s) => s.state == 'done'), true);
  });

  test('montre la pause et les dernières activités, plus récentes en premier', () {
    final view = liveFollowUpView({
      'control_mode': 'paused',
      'events': [
        {'event_type': 'delegate', 'created_at': '2026-11-15T17:00:00Z', 'id': 'a'},
        {'event_type': 'bot_step', 'created_at': '2026-11-15T17:30:00Z', 'id': 'b'},
        {'event_type': 'inconnu_interne', 'created_at': '2026-11-15T17:40:00Z', 'id': 'c'},
      ],
    });
    expect(view.headline, 'Bot est en pause');
    expect(view.activity.map((a) => a.id).toList(), ['b', 'a']);
    expect(view.activity.every((a) => !a.text.contains('_')), true);
  });

  test('formule les durées en clair', () {
    expect(liveSinceText('2026-11-15T17:59:50Z', now), 'à l’instant');
    expect(liveSinceText('2026-11-15T17:55:00Z', now), 'il y a 5 min');
    expect(liveSinceText('2026-11-15T15:00:00Z', now), 'il y a 3 h');
    expect(liveUntilText('2026-11-15T18:12:00Z', now), 'dans 12 min');
    expect(liveSinceText(null, now), '');
  });
}
