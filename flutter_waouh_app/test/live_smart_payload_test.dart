import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';

void main() {
  group('WAOUH smart notification payload', () {
    test('reads smart route, display text and ordered actions', () {
      final item = LiveNotification.fromJson({
        'id': 'n1',
        'title': 'Ancien titre',
        'body': 'Ancien texte',
        'sent_at': '2026-10-06T12:00:00Z',
        'payload': {
          'correlation_id': 'corr-demo',
          'smart': {
            'schema': 'waouh.smart.v1',
            'domain': 'missions',
            'intent': 'avatar_nudge_due',
            'priority': 'high',
            'title': 'Bot a avancé',
            'detail': 'Une décision vous attend.',
            'route': '/app/missions',
            'next_best_action': 'review',
            'actions': [
              {'id': 'later', 'label': 'Plus tard', 'priority': 2},
              {'id': 'review', 'label': 'Voir maintenant', 'priority': 1},
            ],
          },
        },
      });

      expect(item.displayTitle, 'Bot a avancé');
      expect(item.displayBody, 'Une décision vous attend.');
      expect(item.smartDomain, 'missions');
      expect(item.smartPriority, 'high');
      expect(item.smartActionUrl, '/app/missions');
      expect(item.primarySmartAction?.id, 'review');
      expect(item.smartActions.map((action) => action.id).toList(), ['review', 'later']);
    });

    test('rejects external smart routes', () {
      final item = LiveNotification.fromJson({
        'id': 'n2',
        'title': 'Test',
        'body': 'Test',
        'sent_at': '2026-10-06T12:00:00Z',
        'payload': {
          'smart': {
            'schema': 'waouh.smart.v1',
            'domain': 'chat',
            'intent': 'message',
            'route': 'https://example.com',
            'actions': [
              {'id': 'open', 'label': 'Ouvrir', 'route': '//example.com'},
            ],
          },
        },
      });
      expect(item.smartRoute, isNull);
      expect(item.smartActions.first.route, isNull);
    });
  });
}
