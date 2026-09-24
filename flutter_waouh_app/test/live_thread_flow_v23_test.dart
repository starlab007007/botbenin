import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';

LiveMatch _match({
  required String key,
  required String articleId,
  required String threadId,
  required String buyer,
  required String seller,
  required DateTime lastAt,
}) =>
    LiveMatch(
      key: key,
      articleId: articleId,
      role: 'buyer',
      title: 'Produit',
      lastAt: lastAt,
      threadId: threadId,
      buyerUserId: buyer,
      sellerUserId: seller,
      counterpartUserId: seller,
    );

void main() {
  group('détection Intéressé multi-source', () {
    test('reconnaît Radar, Statut et texte visible', () {
      expect(liveIsInterestedMeta(const {'radar_intent': 'interest'}), isTrue);
      expect(
          liveIsInterestedMeta(const {'status_action': 'interested'}), isTrue);
      expect(
        liveIsInterestedMeta(
          const {'intent': 'message'},
          text: 'Je suis intéressé par ce produit.',
        ),
        isTrue,
      );
      expect(
        liveIsInterestedMeta(
          const {'action': 'negotiate'},
          text: 'Je souhaite négocier ce produit.',
        ),
        isFalse,
      );
    });

    test('canonicalise acheteur, vendeur, action et origine', () {
      final meta = liveCanonicalInterestedMeta(
        text: 'Je suis intéressé par ce produit.',
        authUserId: 'buyer-auth',
        meta: const {
          'radar_intent': 'interest',
          'owner_user_id': 'seller-owner',
          'origin_surface': 'flutter_radar_map',
          'article_id': 'article-1',
        },
      );

      expect(meta['action'], 'interested');
      expect(meta['intent'], 'interested');
      expect(meta['role'], 'buyer');
      expect(meta['buyer_user_id'], isNull);
      expect(meta['auth_user_id'], 'buyer-auth');
      expect(meta['seller_user_id'], 'seller-owner');
      expect(meta['counterpart_user_id'], 'seller-owner');
      expect(meta['source'], 'flutter_radar_map');
      expect(meta['thread_type'], 'product_meet');
    });
  });

  group('entrée de navigation du Chat Meet', () {
    test('utilise immédiatement un thread déjà autoritaire', () {
      final match = liveBuildInterestedEntryMatch(
        text: 'Intéressé',
        requestMeta: const {
          'thread_id': 'thread-known',
          'article_id': 'article-known',
          'buyer_user_id': 'buyer-known',
          'seller_user_id': 'seller-known',
          'title': 'Produit connu',
        },
        now: DateTime(2026, 8, 3, 18),
      );

      expect(match.threadId, 'thread-known');
      expect(match.articleId, 'article-known');
      expect(match.buyerUserId, 'buyer-known');
      expect(match.sellerUserId, 'seller-known');
      expect(liveIsProvisionalInterestedMatch(match), isFalse);
    });

    test('ne fabrique aucun faux thread lorsque le backend est en attente', () {
      final match = liveBuildInterestedEntryMatch(
        text: 'Je suis intéressé',
        requestMeta: const {
          'idempotency_key': 'request-unique',
          'article_id': 'article-pending',
          'buyer_user_id': 'buyer-pending',
          'seller_user_id': 'seller-pending',
        },
        now: DateTime(2026, 8, 3, 18),
      );

      expect(match.key, 'pending_interest_request-unique');
      expect(match.threadId, isNull);
      expect(liveIsProvisionalInterestedMatch(match), isTrue);
    });
  });

  group('résolution autoritaire et isolation', () {
    test('rejette un thread exact différent', () {
      final now = DateTime(2026, 8, 3, 18);
      final wrong = _match(
        key: 'meet-wrong',
        articleId: 'article-1',
        threadId: 'thread-wrong',
        buyer: 'buyer-1',
        seller: 'seller-1',
        lastAt: now,
      );

      expect(
        liveSelectInterestedMatch(
          matches: [wrong],
          requestMeta: const {
            'thread_id': 'thread-required',
            'article_id': 'article-1',
            'buyer_user_id': 'buyer-1',
            'seller_user_id': 'seller-1',
          },
          now: now,
        ),
        isNull,
      );
    });

    test('rejette tout Meet sans identité commerciale forte', () {
      final now = DateTime(2026, 8, 3, 18);
      final candidate = _match(
        key: 'meet-candidate',
        articleId: 'article-1',
        threadId: 'thread-1',
        buyer: 'buyer-1',
        seller: 'seller-1',
        lastAt: now,
      );

      expect(
        liveSelectInterestedMatch(
          matches: [candidate],
          requestMeta: const {'source': 'flutter_status'},
          now: now,
        ),
        isNull,
      );
    });

    test('accepte uniquement article, acheteur et vendeur exacts', () {
      final now = DateTime(2026, 8, 3, 18);
      final expected = _match(
        key: 'meet-expected',
        articleId: 'article-1',
        threadId: 'thread-1',
        buyer: 'buyer-1',
        seller: 'seller-1',
        lastAt: now.subtract(const Duration(seconds: 2)),
      );
      final wrongBuyer = _match(
        key: 'meet-wrong-buyer',
        articleId: 'article-1',
        threadId: 'thread-2',
        buyer: 'buyer-2',
        seller: 'seller-1',
        lastAt: now,
      );

      expect(
        liveSelectInterestedMatch(
          matches: [wrongBuyer, expected],
          requestMeta: const {
            'article_id': 'article-1',
            'buyer_user_id': 'buyer-1',
            'seller_user_id': 'seller-1',
          },
          now: now,
        )?.key,
        'meet-expected',
      );
    });
  });
  group('promotion et isolation multi-compte', () {
    test('un thread résolu promeut seulement le même article et vendeur', () {
      final seed = liveBuildInterestedEntryMatch(
        text: 'Intéressé',
        requestMeta: const {
          'idempotency_key': 'promotion-1',
          'article_id': 'article-1',
          'seller_user_id': 'seller-1',
        },
        now: DateTime(2026, 8, 5, 10),
      );
      final resolved = _match(
        key: 'resolved',
        articleId: 'article-1',
        threadId: 'thread-1',
        buyer: 'buyer-waouh-1',
        seller: 'seller-1',
        lastAt: DateTime(2026, 8, 5, 10, 0, 2),
      );
      final wrongSeller = _match(
        key: 'wrong',
        articleId: 'article-1',
        threadId: 'thread-2',
        buyer: 'buyer-waouh-1',
        seller: 'seller-2',
        lastAt: DateTime(2026, 8, 5, 10, 0, 2),
      );

      expect(
        liveCanPromoteInterestedMatch(seed: seed, resolved: resolved),
        isTrue,
      );
      expect(
        liveCanPromoteInterestedMatch(seed: seed, resolved: wrongSeller),
        isFalse,
      );
    });

    test('le cache message est séparé entre deux comptes authentifiés', () {
      final match = _match(
        key: 'meet',
        articleId: 'article-1',
        threadId: 'thread-1',
        buyer: 'buyer-1',
        seller: 'seller-1',
        lastAt: DateTime(2026, 8, 5, 10),
      );
      final buyerKey = liveMatchMessageCacheKey(
        match: match,
        authUserId: 'auth-buyer',
        controllerIdentity: 1,
      );
      final sellerKey = liveMatchMessageCacheKey(
        match: match,
        authUserId: 'auth-seller',
        controllerIdentity: 1,
      );
      expect(buyerKey, isNot(sellerKey));
      expect(buyerKey, contains('auth_auth-buyer'));
      expect(sellerKey, contains('auth_auth-seller'));
    });
  });
}
