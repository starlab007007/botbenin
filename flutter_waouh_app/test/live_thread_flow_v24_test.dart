import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';

void main() {
  group('résolution Intéressé corrélée', () {
    test('affiche immédiatement la fenêtre provisoire sans attendre le thread',
        () {
      final seed = liveBuildProvisionalInterestedMatch(
        text: 'intéressé 1',
        requestMeta: const <String, dynamic>{
          'idempotency_key': 'idem-window-immediate',
          'article_id': 'article-window',
          'seller_user_id': 'seller-window',
          'title': 'Produit fenêtre immédiate',
        },
        now: DateTime.utc(2026, 8, 4, 14, 30),
      );

      expect(liveIsProvisionalInterestedMatch(seed), isTrue);
      expect(liveShouldDisplayInterestedWindowImmediately(seed), isTrue);
      expect(seed.threadId, isNull);
      expect(seed.seedText, 'intéressé 1');
      expect(seed.title, 'Produit fenêtre immédiate');
    });

    test('normalise directement payload.thread.id en thread autoritaire', () {
      final threadId = liveThreadIdFromResponse(
        const <String, dynamic>{
          'payload': <String, dynamic>{
            'thread': <String, dynamic>{'id': 'thread-nested-direct'},
          },
        },
      );

      expect(threadId, 'thread-nested-direct');
    });

    test('résout un thread exact par idempotency_key sans article local', () {
      final match = liveInterestedMatchFromCorrelatedRecord(
        record: <String, dynamic>{
          'thread_id': 'thread-autoritaire-1',
          'created_at': '2026-08-03T20:00:00Z',
          'meta': <String, dynamic>{
            'idempotency_key': 'idem-exact-1',
            'article_id': 'article-1',
            'buyer_user_id': 'buyer-1',
            'seller_user_id': 'seller-1',
            'title': 'Produit test',
          },
        },
        requestMeta: const <String, dynamic>{
          'idempotency_key': 'idem-exact-1',
          'action': 'interested',
        },
      );

      expect(match, isNotNull);
      expect(match!.threadId, 'thread-autoritaire-1');
      expect(match.articleId, 'article-1');
      expect(match.buyerUserId, 'buyer-1');
      expect(match.sellerUserId, 'seller-1');
      expect(match.key, 'art_article-1_buyer_seller-1');
    });

    test('rejette un thread portant une autre corrélation', () {
      final match = liveInterestedMatchFromCorrelatedRecord(
        record: const <String, dynamic>{
          'thread_id': 'thread-autre',
          'payload': <String, dynamic>{
            'idempotency_key': 'idem-autre',
          },
        },
        requestMeta: const <String, dynamic>{
          'idempotency_key': 'idem-attendu',
        },
      );

      expect(match, isNull);
    });

    test('rejette une notification corrélée sans thread autoritaire', () {
      final match = liveInterestedMatchFromCorrelatedRecord(
        record: const <String, dynamic>{
          'notification_type': 'interest_created',
          'payload': <String, dynamic>{
            'idempotency_key': 'idem-2',
            'article_id': 'article-2',
          },
        },
        requestMeta: const <String, dynamic>{
          'idempotency_key': 'idem-2',
        },
      );

      expect(match, isNull);
    });

    test('accepte le thread porté dans payload imbriqué', () {
      final match = liveInterestedMatchFromCorrelatedRecord(
        record: const <String, dynamic>{
          'payload': <String, dynamic>{
            'idempotency_key': 'idem-3',
            'thread': <String, dynamic>{'id': 'thread-3'},
            'article_id': 'article-3',
            'seller_user_id': 'seller-3',
          },
        },
        requestMeta: const <String, dynamic>{
          'idempotency_key': 'idem-3',
        },
      );

      expect(match?.threadId, 'thread-3');
      expect(match?.sellerUserId, 'seller-3');
    });

    test('résout un enregistrement texte unique sans corrélation persistée',
        () {
      final match = liveInterestedMatchFromUniqueTextRecord(
        record: const <String, dynamic>{
          'thread_id': 'thread-texte-1',
          'text': 'intéressé 1',
          'created_at': '2026-08-03T20:00:00Z',
          'meta': <String, dynamic>{
            'article_id': 'article-texte-1',
            'seller_user_id': 'seller-texte-1',
          },
        },
        requestMeta: const <String, dynamic>{
          'idempotency_key': 'idem-local-non-persiste',
        },
        requestText: 'intéressé 1',
      );

      expect(match?.threadId, 'thread-texte-1');
      expect(match?.articleId, 'article-texte-1');
    });

    test('rejette un enregistrement dont le texte exact diffère', () {
      final match = liveInterestedMatchFromUniqueTextRecord(
        record: const <String, dynamic>{
          'thread_id': 'thread-texte-2',
          'text': 'intéressé 2',
        },
        requestMeta: const <String, dynamic>{},
        requestText: 'intéressé 1',
      );

      expect(match, isNull);
    });

    test('reconstruit un thread récent déjà limité à la session', () {
      final match = liveInterestedMatchFromScopedRecentRecord(
        record: const <String, dynamic>{
          'thread_id': 'thread-session-1',
          'article_id': 'article-session-1',
          'created_at': '2026-08-04T16:58:03Z',
          'text': 'Réponse backend transformée',
          'meta': <String, dynamic>{
            'seller_user_id': 'seller-session-1',
          },
        },
        requestMeta: const <String, dynamic>{
          'idempotency_key': 'idem-non-recopie',
          'title': 'Bic E2E CR',
        },
      );

      expect(match, isNotNull);
      expect(match!.threadId, 'thread-session-1');
      expect(match.articleId, 'article-session-1');
      expect(match.title, 'Bic E2E CR');
    });

    test('accepte un unique thread acheteur récent', () {
      final now = DateTime.utc(2026, 8, 3, 20);
      final match = liveSelectUniqueRecentInterestedMatch(
        matches: <LiveMatch>[
          LiveMatch(
            key: 'meet_recent',
            articleId: '',
            role: 'buyer',
            title: 'Discussion produit',
            lastAt: now.add(const Duration(seconds: 3)),
            threadId: 'thread-recent',
          ),
        ],
        notBefore: now,
        now: now.add(const Duration(seconds: 5)),
      );

      expect(match?.threadId, 'thread-recent');
    });

    test('rejette un thread antérieur au clic courant', () {
      final now = DateTime.utc(2026, 8, 3, 20);
      final match = liveSelectUniqueRecentInterestedMatch(
        matches: <LiveMatch>[
          LiveMatch(
            key: 'meet_ancien',
            articleId: '',
            role: 'buyer',
            title: 'Ancien',
            lastAt: now.subtract(const Duration(seconds: 20)),
            threadId: 'thread-ancien',
          ),
        ],
        notBefore: now,
        now: now,
      );

      expect(match, isNull);
    });

    test('refuse de deviner entre deux threads récents', () {
      final now = DateTime.utc(2026, 8, 3, 20);
      final match = liveSelectUniqueRecentInterestedMatch(
        matches: <LiveMatch>[
          LiveMatch(
            key: 'meet_a',
            articleId: '',
            role: 'buyer',
            title: 'A',
            lastAt: now,
            threadId: 'thread-a',
          ),
          LiveMatch(
            key: 'meet_b',
            articleId: '',
            role: 'buyer',
            title: 'B',
            lastAt: now,
            threadId: 'thread-b',
          ),
        ],
        notBefore: now,
        now: now,
      );

      expect(match, isNull);
    });
  });
}
