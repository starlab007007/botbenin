import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_match_navigation.dart';
import 'package:waouh_app_native/live/live_models.dart';

void main() {
  test('la route produit reste identique avant et après le thread autoritaire',
      () {
    final provisional = LiveMatch(
      key: 'pending_interest_request-1',
      articleId: 'article-1',
      role: 'buyer',
      title: 'Produit',
      lastAt: DateTime.utc(2026, 8, 5),
      sellerUserId: 'seller-1',
      counterpartUserId: 'seller-1',
      seedText: 'Je suis intéressé',
    );
    final resolved = provisional.withAuthoritativeThread('thread-1');

    expect(
      liveMatchChatLocation(provisional),
      '/app/chat/match/art_article-1_buyer_seller-1',
    );
    expect(
      liveMatchChatLocation(resolved),
      liveMatchChatLocation(provisional),
    );
    expect(resolved.key, 'art_article-1_buyer_seller-1');
    expect(resolved.threadId, 'thread-1');
  });

  test('la clé Web sépare article, rôle et interlocuteur', () {
    expect(
      liveMatchKey('article-9', 'seller', 'buyer-a', 'thread-a'),
      'art_article-9_seller_buyer-a',
    );
    expect(
      liveMatchKey('article-9', 'seller', 'buyer-b', 'thread-b'),
      'art_article-9_seller_buyer-b',
    );
    expect(
      liveMatchKey('article-9', 'buyer', null, 'thread-c'),
      'art_article-9_buyer_any',
    );
  });

  test('un ancien lien uniquement thread reste lisible', () {
    final legacy = LiveMatch(
      key: 'meet_thread-legacy',
      articleId: '',
      role: 'buyer',
      title: 'Discussion produit',
      lastAt: DateTime.utc(2026, 8, 5),
      threadId: 'thread-legacy',
    );

    expect(
      liveMatchChatLocation(legacy),
      '/app/chat/match/meet_thread-legacy',
    );
  });

  test('une route canonique ne remonte jamais pendant la promotion', () {
    final resolved = LiveMatch(
      key: 'art_article-2_buyer_seller-2',
      articleId: 'article-2',
      role: 'buyer',
      title: 'Produit',
      lastAt: DateTime.utc(2026, 8, 5),
      counterpartUserId: 'seller-2',
      sellerUserId: 'seller-2',
      threadId: 'thread-2',
    );

    expect(
      liveShouldReplaceLegacyMatchRoute(
        currentRouteKey: 'art_article-2_buyer_any',
        resolved: resolved,
      ),
      isFalse,
    );
    expect(
      liveShouldReplaceLegacyMatchRoute(
        currentRouteKey: 'pending_interest_old-request',
        resolved: resolved,
      ),
      isTrue,
    );
  });
}
