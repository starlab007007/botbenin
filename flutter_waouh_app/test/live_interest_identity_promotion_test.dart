import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';

void main() {
  test('auth UUID reste séparé du waouh_users buyer_user_id', () {
    final meta = liveCanonicalInterestedMeta(
      text: 'Je suis intéressé',
      authUserId: 'auth-uuid-123',
      meta: const {
        'article_id': 'article-1',
        'seller_user_id': 'seller-waouh-1',
      },
    );

    expect(meta['auth_user_id'], 'auth-uuid-123');
    expect(meta.containsKey('buyer_user_id'), isFalse);
    expect(meta['seller_user_id'], 'seller-waouh-1');
  });

  test('une identité WAOUH déjà fournie reste intacte', () {
    final meta = liveCanonicalInterestedMeta(
      text: 'Intéressé',
      authUserId: 'auth-uuid-123',
      meta: const {
        'article_id': 'article-1',
        'buyer_user_id': 'buyer-waouh-1',
        'seller_user_id': 'seller-waouh-1',
      },
    );

    expect(meta['auth_user_id'], 'auth-uuid-123');
    expect(meta['buyer_user_id'], 'buyer-waouh-1');
  });

  test('promotion refuse un autre article même avec un thread valide', () {
    final seed = LiveMatch(
      key: 'pending_interest_identity',
      articleId: 'article-1',
      role: 'buyer',
      title: 'Produit',
      lastAt: DateTime(2026, 8, 5),
      sellerUserId: 'seller-1',
      counterpartUserId: 'seller-1',
    );
    final resolved = LiveMatch(
      key: 'resolved',
      articleId: 'article-2',
      role: 'buyer',
      title: 'Autre produit',
      lastAt: DateTime(2026, 8, 5),
      threadId: 'thread-2',
      buyerUserId: 'buyer-1',
      sellerUserId: 'seller-1',
      counterpartUserId: 'seller-1',
    );

    expect(
      liveCanPromoteInterestedMatch(seed: seed, resolved: resolved),
      isFalse,
    );
  });
}
