// Parité Web ⇄ Flutter : le Web fait foi. Mêmes données de référence que
// src/components/waouh/__tests__/waouhChatParity.test.ts
// (docs/contracts/chat/parity-fixtures.json).
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/live_commerce_action_client.dart';
import 'package:waouh_app_native/live/live_commerce_workflow.dart';
import 'package:waouh_app_native/live/live_models.dart';
import 'package:waouh_app_native/live/live_thread_flow.dart';

Map<String, dynamic> _fixtures() {
  final file = File('../docs/contracts/chat/parity-fixtures.json');
  return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
}

const _dealKinds = <LiveCommerceActionKind>{
  LiveCommerceActionKind.paymentMobile,
  LiveCommerceActionKind.paymentDelivery,
  LiveCommerceActionKind.sellerConfirm,
  LiveCommerceActionKind.confirmPaymentCash,
  LiveCommerceActionKind.confirmPaymentMobile,
  LiveCommerceActionKind.cancelDeal,
};

void main() {
  final fixtures = _fixtures();

  test('correlation_id identique au Web', () {
    for (final raw in fixtures['correlation'] as List) {
      final c = raw as Map<String, dynamic>;
      expect(
        liveCorrelationIdFor(
          c['article'] as String?,
          c['role'] as String,
          c['counterpart'] as String?,
        ),
        c['expected'],
      );
    }
  });

  test('boutons serveur : le payload de la timeline donne la requête v3 du Web',
      () {
    final buttons = fixtures['buttons'] as Map<String, dynamic>;
    final threadId = (buttons['scope'] as Map)['thread_id'] as String;
    for (final raw in buttons['cases'] as List) {
      final c = raw as Map<String, dynamic>;
      final id = c['id'] as String;
      final kind = liveCommerceActionKind(id);
      final reference = liveCommerceLegacyReference(id)!;
      // Même construction que _scopeMessageAction (live_widgets.dart).
      final payload = liveCanonicalWorkflowPayload(
        kind,
        context: <String, String>{
          'thread_id': threadId,
          _dealKinds.contains(kind) ? 'deal_id' : 'negotiation_id': reference,
        },
      );
      expect(payload.startsWith('waouh:'), isTrue);
      expect(
        liveCommerceRequestFromPayload(payload, threadId: threadId),
        equals(c['request']),
        reason: id,
      );
      // Le bouton brut donne la même requête (chemin historique conservé).
      expect(
        liveCommerceRequestFromPayload(id, threadId: threadId),
        equals(c['request']),
        reason: 'brut $id',
      );
    }
  });

  test('contre-offre, prix et question restent dans le composeur', () {
    final buttons = fixtures['buttons'] as Map<String, dynamic>;
    for (final id in (buttons['composerOnly'] as List).cast<String>()) {
      expect(liveCommerceRequestFromPayload(id), isNull, reason: id);
    }
    expect(
      liveCommerceRequestFromPayload(
        liveCanonicalWorkflowPayload(
          LiveCommerceActionKind.counter,
          context: const <String, String>{'negotiation_id': 'n-1'},
        ),
      ),
      isNull,
    );
  });

  test('un payload canonique sans identifiant ne part pas au serveur v3', () {
    expect(
      liveCommerceRequestFromPayload(
        liveCanonicalWorkflowPayload(LiveCommerceActionKind.accept),
      ),
      isNull,
    );
    expect(
      liveCommerceRequestFromPayload(
        liveCanonicalWorkflowPayload(LiveCommerceActionKind.paymentMobile),
      ),
      isNull,
    );
  });

  test('conversation clôturée : mêmes statuts que le Web', () {
    final statuses = fixtures['closedStatuses'] as Map<String, dynamic>;
    for (final value in statuses['closed'] as List) {
      expect(liveIsClosedArticleStatus(value as String?), isTrue, reason: '$value');
    }
    for (final value in statuses['open'] as List) {
      expect(liveIsClosedArticleStatus(value as String?), isFalse, reason: '$value');
    }
  });

  test('métadonnées d’envoi : product_title et correlation_id comme le Web', () {
    final match = LiveMatch(
      key: 'k',
      articleId: '3f2c1b0a-0000-4000-8000-00000000a001',
      role: 'buyer',
      title: 'Téléphone WAOUH',
      lastAt: DateTime.utc(2026, 9, 29),
      counterpartUserId: 'abcd1234-ef56-7890',
      threadId: 'thread-1',
    );
    final meta = liveCanonicalMatchMeta(match: match, actionMeta: const {});
    expect(meta['product_title'], 'Téléphone WAOUH');
    expect(meta['correlation_id'], 'corr_3f2c1b0a_buyer_abcd1234');
    expect(meta['thread_id'], 'thread-1');
    expect(meta['role'], 'buyer');
  });
}
