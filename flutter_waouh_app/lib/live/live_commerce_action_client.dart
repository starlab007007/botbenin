import 'package:supabase_flutter/supabase_flutter.dart';

/// Client du contrat d'action v3 (edge function `waouh-commerce-action`).
///
/// Tant que l'interrupteur `commerce_action_v3` est coupé, [send] renvoie
/// `null` et l'appelant garde son chemin historique (waouh-channel-in-secure).
/// Aucun nouvel essai pendant une minute après un refus « désactivé ».
class LiveCommerceActionClient {
  LiveCommerceActionClient(this.client);

  final SupabaseClient client;
  DateTime _disabledUntil = DateTime.fromMillisecondsSinceEpoch(0);

  bool get temporarilyDisabled => DateTime.now().isBefore(_disabledUntil);

  Future<Map<String, dynamic>?> send({
    required Map<String, dynamic> request,
    required String sessionId,
    required String idem,
  }) async {
    if (temporarilyDisabled) return null;
    try {
      final response = await client.functions.invoke(
        'waouh-commerce-action',
        headers: <String, String>{'x-waouh-session': sessionId},
        body: <String, dynamic>{
          ...request,
          'idem': idem,
          'session_id': sessionId,
          'source': request['source'] ?? 'flutter_deal_room',
        },
      );
      final data = response.data;
      if (data is! Map) return null;
      final map = Map<String, dynamic>.from(data);
      if (map['code'] == 'commerce_action_disabled') {
        _disabledUntil = DateTime.now().add(const Duration(minutes: 1));
        return null;
      }
      return map;
    } on FunctionException catch (error) {
      if (error.status == 503 || error.status == 404) {
        _disabledUntil = DateTime.now().add(const Duration(minutes: 1));
        return null;
      }
      final details = error.details;
      if (details is Map) return Map<String, dynamic>.from(details);
      rethrow;
    }
  }
}

/// Bouton serveur (« accepter:<uuid> », « je-veux:<uuid> »…) → requête v3.
/// `null` : l'action se fait dans le composeur (contre-offre, prix, question).
Map<String, dynamic>? liveCommerceRequestFromPayload(
  String payload, {
  String? threadId,
}) {
  final raw = payload.trim();
  final queryAt = raw.indexOf('?');
  final command = (queryAt < 0 ? raw : raw.substring(0, queryAt)).trim();
  final query = queryAt < 0
      ? const <String, String>{}
      : Uri.splitQueryString(raw.substring(queryAt + 1));
  final match = RegExp(r'^([a-z_-]+):([0-9a-f-]{36})$', caseSensitive: false)
      .firstMatch(command);
  if (match == null) return null;
  final kind = match.group(1)!.toLowerCase();
  final target = match.group(2)!.toLowerCase();
  Map<String, dynamic> withThread(Map<String, dynamic> body) => <String, dynamic>{
        ...body,
        if (threadId != null && threadId.trim().isNotEmpty) 'thread_id': threadId,
      };
  switch (kind) {
    case 'accepter':
    case 'accept':
      return withThread(<String, dynamic>{'action': 'accept', 'negotiation_id': target});
    case 'refuser':
    case 'reject':
      return withThread(<String, dynamic>{'action': 'reject', 'negotiation_id': target});
    case 'je-veux': {
      final source = (query['source'] ?? '').trim().toLowerCase();
      final catalogId = (query['catalog_id'] ?? '').trim();
      final explicitSourceId =
          (query['source_id'] ?? query['radar_signal_id'] ?? '').trim();
      final externalSource = source == 'partner' ||
          source == 'catalog' ||
          source == 'radar' ||
          catalogId.isNotEmpty ||
          explicitSourceId.isNotEmpty;
      if (externalSource) {
        return <String, dynamic>{
          'action': 'open_deal',
          if (catalogId.isNotEmpty) 'catalog_id': catalogId,
          if (explicitSourceId.isNotEmpty) 'source_id': explicitSourceId,
          if (catalogId.isEmpty &&
              explicitSourceId.isEmpty &&
              (source == 'partner' || source == 'catalog'))
            'catalog_id': target,
          if (catalogId.isEmpty &&
              explicitSourceId.isEmpty &&
              source != 'partner' &&
              source != 'catalog')
            'source_id': target,
          if (source.isNotEmpty) 'source': source,
        };
      }
      return <String, dynamic>{'action': 'open_deal', 'article_id': target};
    }
    case 'confirmer-disponibilite':
      return <String, dynamic>{'action': 'seller_confirm', 'deal_id': target};
    case 'payer-mobile':
      return <String, dynamic>{'action': 'pay_mode', 'deal_id': target, 'method': 'mobile_money'};
    case 'paiement-livraison':
      return <String, dynamic>{'action': 'pay_mode', 'deal_id': target, 'method': 'cash'};
    case 'confirmer-paiement-cash':
      return <String, dynamic>{'action': 'confirm_payment', 'deal_id': target, 'method': 'cash'};
    case 'confirmer-paiement-mobile':
      return <String, dynamic>{'action': 'confirm_payment', 'deal_id': target, 'method': 'mobile_money'};
    case 'annuler':
      return <String, dynamic>{'action': 'cancel', 'deal_id': target};
  }
  return null;
}
