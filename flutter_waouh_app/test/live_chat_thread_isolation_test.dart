import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_widgets.dart';

Map<String, dynamic> notification({
  required String id,
  required String articleId,
  required String threadId,
  required String buyerId,
  required String sellerId,
  required String recipient,
  String type = 'match',
}) =>
    <String, dynamic>{
      'id': id,
      'article_id': articleId,
      'notification_type': type,
      'sent_at': '2026-08-01T12:00:00Z',
      'payload': <String, dynamic>{
        'article_id': articleId,
        'thread_id': threadId,
        'buyer_user_id': buyerId,
        'seller_user_id': sellerId,
        'recipient': recipient,
        'title': 'iPhone',
      },
    };

void main() {
  test('un vendeur et deux acheteurs ont deux fenêtres étanches', () {
    final first = LiveMatch.fromNotification(notification(
      id: 'n1',
      articleId: 'article-a',
      threadId: 'thread-buyer-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      recipient: 'seller',
    ));
    final second = LiveMatch.fromNotification(notification(
      id: 'n2',
      articleId: 'article-a',
      threadId: 'thread-buyer-2',
      buyerId: 'buyer-2',
      sellerId: 'seller-1',
      recipient: 'seller',
    ));

    expect(first.key, isNot(second.key));
    expect(first.counterpartUserId, 'buyer-1');
    expect(second.counterpartUserId, 'buyer-2');
  });

  test('un acheteur et deux vendeurs ont deux fenêtres étanches', () {
    final first = LiveMatch.fromNotification(notification(
      id: 'n1',
      articleId: 'article-a',
      threadId: 'thread-seller-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      recipient: 'buyer',
    ));
    final second = LiveMatch.fromNotification(notification(
      id: 'n2',
      articleId: 'article-b',
      threadId: 'thread-seller-2',
      buyerId: 'buyer-1',
      sellerId: 'seller-2',
      recipient: 'buyer',
    ));

    expect(first.key, isNot(second.key));
    expect(first.counterpartUserId, 'seller-1');
    expect(second.counterpartUserId, 'seller-2');
  });

  test('un acheteur et deux produits du même vendeur restent étanches', () {
    final first = LiveMatch.fromNotification(notification(
      id: 'n1',
      articleId: 'article-a',
      threadId: 'thread-article-a',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      recipient: 'buyer',
    ));
    final second = LiveMatch.fromNotification(notification(
      id: 'n2',
      articleId: 'article-b',
      threadId: 'thread-article-b',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      recipient: 'buyer',
    ));

    expect(first.key, isNot(second.key));
    expect(first.articleId, isNot(second.articleId));
  });

  test('les notifications du même cycle réutilisent le même Chat Meet', () {
    final match = LiveMatch.fromNotification(notification(
      id: 'match',
      articleId: 'article-a',
      threadId: 'thread-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      recipient: 'buyer',
    ));
    final payment = LiveMatch.fromNotification(notification(
      id: 'payment',
      articleId: 'article-a',
      threadId: 'thread-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      recipient: 'buyer',
      type: 'deal_payment_request',
    ));

    expect(match.key, payment.key);
    expect(match.merge(payment).notificationIds, containsAll(<String>['match', 'payment']));
  });

  test('un message conserve son thread autoritaire', () {
    final message = LiveMessage.fromJson(<String, dynamic>{
      'id': 'message-1',
      'text': 'Je suis intéressé',
      'direction': 'in',
      'created_at': '2026-08-01T12:00:00Z',
      'article_id': 'article-a',
      'thread_id': 'thread-1',
    });

    expect(message.threadId, 'thread-1');
    expect(message.articleId, 'article-a');
  });

  test('une notification commerciale ouvre le Chat Meet exact', () {
    final item = LiveNotification.fromJson(<String, dynamic>{
      'id': 'deal-1',
      'notification_type': 'deal_buyer',
      'article_id': 'article-a',
      'payload': <String, dynamic>{
        'article_id': 'article-a',
        'thread_id': 'thread-1',
      },
      'sent_at': '2026-08-01T12:00:00Z',
    });

    expect(item.threadId, 'thread-1');
    expect(item.isMatch, isTrue);
  });

  test('les clés legacy distinguent aussi la contrepartie côté acheteur', () {
    expect(
      liveMatchKey('article-a', 'buyer', 'seller-1'),
      isNot(liveMatchKey('article-a', 'buyer', 'seller-2')),
    );
  });

  test('deux recherches identiques conservent deux identités distinctes', () {
    const first = 'search:buyer-1:request-1';
    const second = 'search:buyer-1:request-2';
    expect(first, isNot(second));
  });

  test('une recherche possède sa propre fenêtre sans faux article', () {
    final row = <String, dynamic>{
      'id': 'search-notification-1',
      'notification_type': 'search_thread',
      'sent_at': '2026-08-01T12:00:00Z',
      'payload': <String, dynamic>{
        'thread_id': 'search-thread-1',
        'thread_type': 'search',
        'search_request_id': 'search-request-1',
        'title': 'Recherche · iPhone',
      },
    };
    final notification = LiveNotification.fromJson(row);
    final match = LiveMatch.fromNotification(row);

    expect(notification.isMatch, isTrue);
    expect(match.isSearch, isTrue);
    expect(match.threadId, 'search-thread-1');
    expect(match.searchRequestId, 'search-request-1');
  });

  test('le payload intéressé transporte le thread sans afficher ses UUID', () {
    const payload =
        'interesse:2?thread_id=thread-2&article_id=article-b&buyer_user_id=buyer-1&seller_user_id=seller-1';
    final meta = liveCommercePayloadMeta(payload);

    expect(liveCommercePayloadText(payload), 'interesse:2');
    expect(meta['action'], 'interested');
    expect(meta['thread_id'], 'thread-2');
    expect(meta['article_id'], 'article-b');
    expect(meta['buyer_user_id'], 'buyer-1');
    expect(meta['seller_user_id'], 'seller-1');
  });

  test('la colonne thread_id reste autoritaire si le payload est incomplet', () {
    final item = LiveNotification.fromJson(<String, dynamic>{
      'id': 'notification-column-thread',
      'thread_id': 'thread-column',
      'notification_type': 'match_buyer',
      'article_id': 'article-a',
      'sent_at': '2026-08-01T12:00:00Z',
      'payload': <String, dynamic>{'article_id': 'article-a'},
    });

    expect(item.threadId, 'thread-column');
    expect(item.isMatch, isTrue);
  });
}
