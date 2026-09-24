import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_radar_models.dart';

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

  test('merges top-level smart workflow fields into persisted message meta', () {
    final message = LiveMessage.fromJson({
      'id': 'smart-payment',
      'text': 'Choisissez votre paiement',
      'direction': 'out',
      'workflow_state': 'awaiting_payment',
      'role': 'buyer',
      'deal_id': 'deal-1',
      'products': [
        {
          'id': 'article-1',
          'title': 'Téléphone',
          'photos': ['https://cdn.example/front.jpg']
        }
      ],
      'actions': [
        {'id': 'payer-mobile:deal-1', 'label': 'Mobile Money'}
      ],
    });

    expect(message.meta['workflow_state'], 'awaiting_payment');
    expect(message.meta['role'], 'buyer');
    expect(message.meta['deal_id'], 'deal-1');
    expect(message.meta['products'], isA<List>());
    expect(message.meta['actions'], isA<List>());
    expect(message.attachments.single.url, 'https://cdn.example/front.jpg');
  });

  test('converts a Radar result into one complete smart product contract', () {
    const item = LiveRadarItem(
      id: 'radar-1',
      sourceId: 'catalog-1',
      source: 'catalog',
      type: LiveRadarItemType.sell,
      title: 'iPhone 15',
      photoUrl: 'https://cdn.example/front.jpg',
      photoUrls: [
        'https://cdn.example/front.jpg',
        'https://cdn.example/back.jpg',
      ],
      priceMin: 105000,
      priceMax: 105000,
      currency: 'FCFA',
      city: 'Cotonou',
      district: 'Jéricho',
      latitude: 6.36,
      longitude: 2.42,
      distanceKm: 2.4,
      bearing: 90,
      ring: LiveRadarRing(
        id: 2,
        maxKm: 5,
        label: 'Proche',
        colorValue: 0xFF22C55E,
      ),
      freshnessMs: Duration(minutes: 5),
      score: .9,
      articleId: 'article-1',
      raw: {
        'market_price_min': 116250,
        'market_price_max': 138750,
        'recommendation': 'Vérifier la batterie avant achat.',
      },
    );

    final product = item.toSmartProductMap();
    expect(product['photos'], hasLength(2));
    expect(product['distance_km'], 2.4);
    expect(product['market_price_min'], 116250);
    expect(product['recommendation'], contains('batterie'));
    expect(product['actions'], hasLength(3));
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

  test('flattens nested product photo galleries', () {
    final photos = liveAttachments([
      [
        'https://cdn.example/product-front.jpg',
        {'url': 'https://cdn.example/product-back.jpg'}
      ]
    ]);

    expect(photos, hasLength(2));
    expect(photos.last.url, 'https://cdn.example/product-back.jpg');
  });

  test('normalizes storage paths, signed URLs and escaped image values', () {
    final photos = liveAttachments([
      {
        'bucket': 'waouh-media',
        'path': 'inbound/2026-08-01/iPhone 13.jpg',
      },
      '/storage/v1/object/public/waouh-uploads/chat/photo.webp',
      'https:\\/\\/cdn.example\\/photo.jpg',
      '![Produit](https://cdn.example/markdown.png)',
      'https://mvynepqulhflxtyymtzs.supabase.co/storage/v1/object/sign/'
          'waouh-media/inbound/old.jpg?token=expired',
    ]);

    expect(photos, hasLength(5));
    expect(
      photos[0].url,
      'https://mvynepqulhflxtyymtzs.supabase.co/storage/v1/object/public/'
      'waouh-media/inbound/2026-08-01/iPhone%2013.jpg',
    );
    expect(photos[1].url,
        contains('/object/public/waouh-uploads/chat/photo.webp'));
    expect(photos[2].url, 'https://cdn.example/photo.jpg');
    expect(photos[3].url, 'https://cdn.example/markdown.png');
    expect(
        photos[4].url, endsWith('/object/public/waouh-media/inbound/old.jpg'));
  });

  test('removes technical E2E codes without changing normal brackets', () {
    expect(
      liveVisibleText('📦 [E2E-9e9ef7f8] iPhone 13 Pro'),
      '📦 iPhone 13 Pro',
    );
    expect(
        liveVisibleText('📦 [Neuf] iPhone 13 Pro'), '📦 [Neuf] iPhone 13 Pro');
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
