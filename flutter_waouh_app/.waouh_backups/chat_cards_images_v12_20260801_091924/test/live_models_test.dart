import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';

void main() {
  test('maps a WAOUH incoming user message with attachment', () {
    final message = LiveMessage.fromJson({
      'id': 'm-1',
      'text': 'Je cherche du riz',
      'direction': 'in',
      'created_at': '2026-06-26T10:00:00Z',
      'attachments': [
        {'url': 'https://cdn.example/riz.jpg', 'type': 'image/jpeg'}
      ],
      'meta': {'article_id': 'a-1'},
    });

    expect(message.outgoing, isTrue);
    expect(message.articleId, 'a-1');
    expect(message.attachments.single.type, 'image/jpeg');
  });

  test('keeps string and alternate image attachment formats', () {
    final message = LiveMessage.fromJson({
      'id': 'm-images',
      'text': 'Trois produits',
      'direction': 'out',
      'created_at': '2026-07-31T10:00:00Z',
      'attachments': [
        'https://cdn.example/one.jpg',
        {'publicUrl': '//cdn.example/two.png', 'caption': 'Produit 2'},
        {
          'image': {'image_url': 'https://cdn.example/three.webp'}
        },
      ],
    });

    expect(message.attachments, hasLength(3));
    expect(message.attachments[0].url, 'https://cdn.example/one.jpg');
    expect(message.attachments[1].url, 'https://cdn.example/two.png');
    expect(message.attachments[1].type, 'image/png');
    expect(message.attachments[2].type, 'image/webp');
  });

  test(
      'decodes JSON attachments and merges meta image arrays without duplicates',
      () {
    final message = LiveMessage.fromJson({
      'id': 'm-json-images',
      'text': 'Résultats',
      'direction': 'out',
      'created_at': '2026-07-31T10:00:00Z',
      'attachments':
          '[{"url":"https://cdn.example/a.jpg","type":"image/jpeg"}]',
      'meta': {
        'photos': [
          'https://cdn.example/a.jpg',
          {'photo_url': 'https://cdn.example/b.jpg'}
        ],
      },
    });

    expect(message.attachments, hasLength(2));
    expect(message.attachments.last.url, 'https://cdn.example/b.jpg');
  });

  test('builds one seller-side match key per interested buyer', () {
    final first = LiveMatch.fromNotification({
      'id': 'n-1',
      'notification_type': 'new_buyer',
      'article_id': 'article-9',
      'sent_at': '2026-06-26T10:00:00Z',
      'opened': false,
      'payload': {
        'recipient': 'seller',
        'buyer_user_id': 'buyer-1',
        'title': 'Moto TVS',
        'price': 550000,
      },
    });
    final second = LiveMatch.fromNotification({
      'id': 'n-2',
      'notification_type': 'new_buyer',
      'article_id': 'article-9',
      'sent_at': '2026-06-26T11:00:00Z',
      'opened': false,
      'payload': {
        'recipient': 'seller',
        'buyer_user_id': 'buyer-2',
        'title': 'Moto TVS',
      },
    });

    expect(first.key, isNot(second.key));
    expect(first.role, 'seller');
    expect(second.counterpartUserId, 'buyer-2');
  });

  test('keeps only active statuses in a consumer filter', () {
    final active = LiveStatus.fromJson({
      'id': 's-1',
      'type': 'sell',
      'title': 'iPhone 13',
      'created_at': '2026-06-26T08:00:00Z',
      'expires_at': DateTime.now()
          .add(const Duration(hours: 2))
          .toUtc()
          .toIso8601String(),
      'media_urls': ['https://cdn.example/iphone.jpg'],
    });
    final expired = LiveStatus.fromJson({
      'id': 's-2',
      'type': 'buy',
      'title': 'Recherche ordinateur',
      'created_at': '2026-06-25T08:00:00Z',
      'expires_at': DateTime.now()
          .subtract(const Duration(minutes: 1))
          .toUtc()
          .toIso8601String(),
    });

    expect(active.active, isTrue);
    expect(expired.active, isFalse);
  });

  test('reads notification navigation payload', () {
    final item = LiveNotification.fromJson({
      'id': 'n-3',
      'notification_type': 'match_buyer',
      'sent_at': '2026-06-26T10:00:00Z',
      'article_id': 'article-2',
      'payload': {'title': 'Nouveau match', 'counterpart_user_id': 'seller-1'},
    });

    expect(item.isMatch, isTrue);
    expect(item.articleId, 'article-2');
  });
}
