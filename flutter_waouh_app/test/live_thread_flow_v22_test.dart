import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';
import 'package:waouh_app_native/live/live_widgets.dart';

void main() {
  test('normalise un thread imbriqué dans data.payload', () {
    final response = liveNormalizeChannelResponse({
      'ok': true,
      'data': {
        'payload': {
          'thread': {'id': 'thread-123'},
          'article_id': 'article-9',
        },
      },
    });

    expect(liveThreadIdFromResponse(response), 'thread-123');
    expect(response['article_id'], 'article-9');
  });

  test('reconnaît les variantes intéressé', () {
    expect(
      liveIsInterestedMeta({'button_payload': 'intéressé 1?article_id=a'}),
      isTrue,
    );
    expect(liveIsInterestedMeta({'action': 'interested'}), isTrue);
    expect(liveIsInterestedMeta({'intent': 'message'}), isFalse);
  });

  test('préserve les identifiants canoniques du Meet', () {
    final match = LiveMatch(
      key: 'meet-thread-1',
      articleId: 'article-good',
      role: 'buyer',
      title: 'Produit',
      lastAt: DateTime(2026, 8, 3),
      threadId: 'thread-good',
      buyerUserId: 'buyer-good',
      sellerUserId: 'seller-good',
      counterpartUserId: 'seller-good',
    );

    final meta = liveCanonicalMatchMeta(
      match: match,
      actionMeta: const {
        'thread_id': 'thread-wrong',
        'article_id': 'article-wrong',
        'seller_user_id': 'seller-wrong',
        'commerce_action': 'accepter',
      },
    );

    expect(meta['thread_id'], 'thread-good');
    expect(meta['article_id'], 'article-good');
    expect(meta['seller_user_id'], 'seller-good');
    expect(meta['commerce_action'], 'accepter');
  });

  test('sélectionne le Meet récent correspondant', () {
    final now = DateTime(2026, 8, 3, 8, 30);
    final expected = LiveMatch(
      key: 'meet-t2',
      articleId: 'a2',
      role: 'buyer',
      title: 'Deux',
      lastAt: now.subtract(const Duration(seconds: 8)),
      threadId: 't2',
      sellerUserId: 's2',
      counterpartUserId: 's2',
    );
    final other = LiveMatch(
      key: 'meet-t1',
      articleId: 'a1',
      role: 'buyer',
      title: 'Un',
      lastAt: now.subtract(const Duration(seconds: 2)),
      threadId: 't1',
      sellerUserId: 's1',
      counterpartUserId: 's1',
    );

    expect(
      liveSelectInterestedMatch(
        matches: [other, expected],
        requestMeta: const {
          'article_id': 'a2',
          'seller_user_id': 's2',
        },
        now: now,
      )?.key,
      'meet-t2',
    );
  });

  test('une notification thread intéressé ouvre un Meet', () {
    final item = LiveNotification.fromJson({
      'id': 'n1',
      'thread_id': 'thread-9',
      'notification_type': 'interest_created',
      'payload': {
        'thread_type': 'product_meet',
        'article_id': 'article-9',
      },
      'sent_at': '2026-08-03T08:30:00Z',
    });

    expect(item.isMatch, isTrue);
  });

  test('un query payload malformé reste sûr', () {
    final meta = liveCommercePayloadMeta('intéressé 1?%%%');
    expect(meta['action'], 'interested');
  });

  test('conserve les identifiants Radar et Statut dans le payload', () {
    final meta = liveCommercePayloadMeta(
      'intéressé 1?article_id=a1&status_id=st1&radar_item_id=r1'
      '&source_id=src1&origin_surface=flutter_radar_map',
    );

    expect(meta['action'], 'interested');
    expect(meta['article_id'], 'a1');
    expect(meta['status_id'], 'st1');
    expect(meta['radar_item_id'], 'r1');
    expect(meta['source_id'], 'src1');
    expect(meta['origin_surface'], 'flutter_radar_map');
  });
  test('prépare une fenêtre provisoire immédiate sans faux thread', () {
    final seed = liveBuildProvisionalInterestedMatch(
      text: 'Intéressé 2',
      requestMeta: const {
        'idempotency_key': 'idem-123',
        'article_id': 'article-2',
        'seller_user_id': 'seller-2',
        'title': 'Produit 2',
        'price': '25000',
      },
      now: DateTime(2026, 8, 3, 14),
    );

    expect(seed.key, 'pending_interest_idem-123');
    expect(seed.articleId, 'article-2');
    expect(seed.sellerUserId, 'seller-2');
    expect(seed.threadId, isNull);
    expect(seed.price, 25000);
    expect(liveIsProvisionalInterestedMatch(seed), isTrue);
  });

  test('un même idempotency key conserve la même fenêtre provisoire', () {
    final first = liveBuildProvisionalInterestedMatch(
      text: 'Intéressé 1',
      requestMeta: const {
        'idempotency_key': 'same-request',
        'article_id': 'article-1',
      },
    );
    final second = liveBuildProvisionalInterestedMatch(
      text: 'Intéressé 1',
      requestMeta: const {
        'idempotency_key': 'same-request',
        'article_id': 'article-1',
      },
    );

    expect(first.key, second.key);
  });
}
