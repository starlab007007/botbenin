import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';

void main() {
  test('la fenêtre provisoire conserve le contexte produit complet', () {
    final seed = liveBuildInterestedEntryMatch(
      text: 'intéressé 5',
      requestMeta: const <String, dynamic>{
        'idempotency_key': 'idem-product-5',
        'article_id': 'article-5',
        'seller_user_id': 'seller-5',
        'title': 'Ordinateur Lenovo ThinkPad',
        'price': '250000',
        'city': 'Cotonou',
        'image_url': 'https://example.test/thinkpad.jpg',
      },
      now: DateTime.utc(2026, 8, 4, 15, 52),
    );

    final preview = liveInterestedProductPreview(seed);

    expect(seed.title, 'Ordinateur Lenovo ThinkPad');
    expect(seed.price, 250000);
    expect(seed.city, 'Cotonou');
    expect(seed.photo, 'https://example.test/thinkpad.jpg');
    expect(preview['article_id'], 'article-5');
    expect(preview['title'], 'Ordinateur Lenovo ThinkPad');
    expect(preview['workflow_state'], 'summary_only');
  });

  test('le thread autoritaire hérite des informations locales manquantes', () {
    final seed = LiveMatch(
      key: 'pending_interest_idem',
      articleId: 'article-5',
      role: 'buyer',
      title: 'Ordinateur Lenovo ThinkPad',
      lastAt: DateTime.utc(2026, 8, 4, 15, 52),
      sellerUserId: 'seller-5',
      counterpartUserId: 'seller-5',
      seedText: 'intéressé 5',
      price: 250000,
      city: 'Cotonou',
      photo: 'https://example.test/thinkpad.jpg',
      photoUrls: const <String>['https://example.test/thinkpad.jpg'],
    );
    final remote = LiveMatch(
      key: 'meet_thread-5',
      articleId: '',
      role: 'buyer',
      title: 'Annonce',
      lastAt: DateTime.utc(2026, 8, 4, 15, 53),
      threadId: 'thread-5',
    );

    final result = liveEnrichResolvedInterestedMatch(
      seed: seed,
      resolved: remote,
    );

    expect(result.key, 'art_article-5_buyer_seller-5');
    expect(result.threadId, 'thread-5');
    expect(result.articleId, 'article-5');
    expect(result.title, 'Ordinateur Lenovo ThinkPad');
    expect(result.price, 250000);
    expect(result.city, 'Cotonou');
    expect(result.photoUrls, contains('https://example.test/thinkpad.jpg'));
  });
}
