import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_match_history_service.dart';
import 'package:waouh_app_native/live/live_models.dart';

LiveMatch _match({String? threadId, String counterpart = 'seller-1'}) =>
    LiveMatch(
      key: threadId == null
          ? 'pending_interest_scope'
          : liveMatchKey('article-1', 'buyer', counterpart, threadId),
      articleId: 'article-1',
      role: 'buyer',
      title: 'Produit',
      lastAt: DateTime.utc(2026, 8, 4),
      counterpartUserId: counterpart,
      sellerUserId: counterpart,
      threadId: threadId,
      seedText: 'Intéressé 1',
    );

void main() {
  test('extrait un thread autoritaire dans les formats backend imbriqués', () {
    expect(
      liveExtractThreadId({
        'data': {
          'payload': {'threadId': 'thread-123'}
        }
      }),
      'thread-123',
    );
  });

  test('historique provisoire accepte un message sans thread par scope métier',
      () {
    final match = _match();
    final result = LiveMatchHistoryResult.fromResponse(
      {
        'ok': true,
        'messages': [
          {
            'id': 'm-1',
            'article_id': 'article-1',
            'direction': 'out',
            'text': 'Historique disponible',
            'created_at': '2026-08-04T20:00:00Z',
            'meta': {'seller_user_id': 'seller-1'},
          }
        ],
      },
      match: match,
    );

    expect(result.ok, isTrue);
    expect(result.messages, hasLength(1));
    expect(result.messages.single.text, 'Historique disponible');
    expect(result.messages.single.threadId, isNull);
  });

  test('thread résolu enrichit les anciennes lignes sans thread_id', () {
    final match = _match();
    final result = LiveMatchHistoryResult.fromResponse(
      {
        'ok': true,
        'resolved_thread_id': 'thread-real-1',
        'messages': [
          {
            'id': 'm-2',
            'article_id': 'article-1',
            'direction': 'out',
            'text': 'Réponse vendeur',
            'created_at': '2026-08-04T20:01:00Z',
            'meta': {'seller_user_id': 'seller-1'},
          }
        ],
      },
      match: match,
    );

    expect(result.resolvedThreadId, 'thread-real-1');
    expect(result.messages.single.threadId, 'thread-real-1');
  });

  test('scope métier rejette un autre vendeur sur le même article', () {
    final match = _match();
    final message = LiveMessage.fromJson({
      'id': 'wrong-cp',
      'article_id': 'article-1',
      'direction': 'out',
      'text': 'Autre conversation',
      'created_at': '2026-08-04T20:02:00Z',
      'meta': {'seller_user_id': 'seller-2'},
    });

    expect(liveMessageBelongsToMatch(message, match), isFalse);
  });

  test('seedNotification.text est accepté sans payload imbriqué', () {
    final result = LiveMatchHistoryResult.fromResponse(
      {
        'ok': true,
        'seedNotification': {
          'sent_at': '2026-08-04T20:03:00Z',
          'notification_type': 'match_buyer',
          'text': 'Discussion créée',
        },
      },
      match: _match(),
    );

    expect(result.messages, hasLength(1));
    expect(result.messages.single.text, 'Discussion créée');
  });

  test('promotion conserve le scope et remplace seulement le thread', () {
    final provisional = _match();
    final resolved = provisional.withAuthoritativeThread('thread-9');

    expect(resolved.threadId, 'thread-9');
    expect(resolved.articleId, provisional.articleId);
    expect(resolved.counterpartUserId, provisional.counterpartUserId);
    expect(resolved.key, 'art_article-1_buyer_seller-1');
  });
}
