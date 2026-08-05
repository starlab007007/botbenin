import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';
import 'package:waouh_app_native/live/live_widgets.dart';

void main() {
  group('détection Intéressé Flutter robuste', () {
    for (final alias in const <String>[
      'intéressé 1',
      'interesse 2',
      'interested 3',
      'buyer_interest',
      'product-interest',
      'status_interest',
      'radar-interested',
      'interrer 4',
      'interrese 5',
      'buyer_interest 6',
      'status-interested 7',
    ]) {
      test('reconnaît $alias', () {
        expect(
          liveIsInterestedMeta(
            <String, dynamic>{'button_payload': alias},
            text: alias,
          ),
          isTrue,
        );
      });
    }

    test('ne confond pas une action métier différente', () {
      expect(
        liveIsInterestedMeta(
          const <String, dynamic>{'action': 'negotiate'},
          text: 'Je propose 50 000 FCFA',
        ),
        isFalse,
      );
      expect(liveLooksInterestedText('Article intéressant à lire'), isFalse);
      expect(liveLooksInterestedText('Taux d’intérêt bancaire'), isFalse);
      expect(
        liveIsInterestedMeta(
          const <String, dynamic>{'button_payload': 'interruption 5'},
          text: 'interruption 5',
        ),
        isFalse,
      );
    });

    test('retire seulement un index numérique pour les alias exacts', () {
      expect(
        liveIsInterestedMeta(
          const <String, dynamic>{'button_payload': 'interrese 5'},
          text: 'interrese 5',
        ),
        isTrue,
      );
      expect(
        liveIsInterestedMeta(
          const <String, dynamic>{'button_payload': 'interrese produit'},
          text: 'interrese produit',
        ),
        isFalse,
      );
    });
  });

  group('payload produit auto-descriptif', () {
    test('ajoute action et intent même sans identité commerciale', () {
      final payload = liveCanonicalInterestedButtonPayload('interested 1');
      final meta = liveCommercePayloadMeta(payload);

      expect(liveCommercePayloadText(payload), 'interested 1');
      expect(meta['action'], 'interested');
      expect(meta['intent'], 'interested');
      expect(meta['origin_surface'], 'flutter_product_card');
    });

    test('conserve le contexte produit existant', () {
      final payload = liveCanonicalInterestedButtonPayload(
        'intéressé 2?article_id=article-2',
        context: const <String, String>{
          'seller_user_id': 'seller-2',
          'title': 'Bic E2E CR',
        },
      );
      final meta = liveCommercePayloadMeta(payload);

      expect(meta['article_id'], 'article-2');
      expect(meta['seller_user_id'], 'seller-2');
      expect(meta['title'], 'Bic E2E CR');
      expect(meta['action'], 'interested');
      expect(meta['intent'], 'interested');
    });
  });

  group('rattrapage par réponse backend', () {
    test('ouvre un Meet pour match_buyer avec identité produit', () {
      expect(
        liveResponseRequestsProductMeet(
          const <String, dynamic>{
            'intent': 'match_buyer',
            'article_id': 'article-backend',
            'counterpart_user_id': 'seller-backend',
          },
        ),
        isTrue,
      );
    });

    test('ouvre un Meet pour CONFIRM avec thread autoritaire', () {
      expect(
        liveResponseRequestsProductMeet(
          const <String, dynamic>{
            'intent': 'CONFIRM',
            'thread': <String, dynamic>{'id': 'thread-backend'},
          },
        ),
        isTrue,
      );
    });

    test('refuse un intent générique sans identité produit', () {
      expect(
        liveResponseRequestsProductMeet(
          const <String, dynamic>{'intent': 'CONFIRM'},
        ),
        isFalse,
      );
    });
  });
}
