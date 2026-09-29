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
  // Boutons serveur affichés par la timeline : `waouh:<action>?negotiation_id=…`.
  // Même correspondance que `commerceRequestFromButton` côté Web, afin que
  // Accepter / Refuser / paiement / annulation passent par waouh-commerce-action
  // et non plus par l'ancien chemin waouh-channel-in-secure.
  if (command.toLowerCase().startsWith('waouh:')) {
    return _liveCommerceRequestFromCanonical(
      command.substring(6).toLowerCase(),
      query,
      threadId,
    );
  }
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
    case 'envoyer-offre':
    case 'transmit_offer':
      // Résultat Nexus externe : l'acheteur transmet son offre (politique de contact côté serveur).
      return withThread(<String, dynamic>{'action': 'transmit_offer', 'negotiation_id': target});
  }
  return null;
}

Map<String, dynamic>? _liveCommerceRequestFromCanonical(
  String action,
  Map<String, String> query,
  String? threadId,
) {
  String value(String key) => (query[key] ?? '').trim();
  final thread = (threadId != null && threadId.trim().isNotEmpty)
      ? threadId.trim()
      : value('thread_id');
  final negotiationId = value('negotiation_id');
  final dealId = value('deal_id');
  Map<String, dynamic> negotiation(String name) => <String, dynamic>{
        'action': name,
        'negotiation_id': negotiationId,
        if (thread.isNotEmpty) 'thread_id': thread,
      };
  Map<String, dynamic> deal(String name, [String? method]) => <String, dynamic>{
        'action': name,
        'deal_id': dealId,
        if (method != null) 'method': method,
      };
  switch (action) {
    case 'accept':
      return negotiationId.isEmpty ? null : negotiation('accept');
    case 'reject':
      return negotiationId.isEmpty ? null : negotiation('reject');
    case 'payment_preference_mobile':
      return dealId.isEmpty ? null : deal('pay_mode', 'mobile_money');
    case 'payment_preference_cod':
      return dealId.isEmpty ? null : deal('pay_mode', 'cash');
    case 'seller_confirm_available':
      return dealId.isEmpty ? null : deal('seller_confirm');
    case 'confirm_payment_cash':
      return dealId.isEmpty ? null : deal('confirm_payment', 'cash');
    case 'confirm_payment_mobile':
      return dealId.isEmpty ? null : deal('confirm_payment', 'mobile_money');
    case 'cancel_deal':
      return dealId.isEmpty ? null : deal('cancel');
    case 'transmit_offer':
      return negotiationId.isEmpty ? null : negotiation('transmit_offer');
  }
  // counter / interest / unknown : composeur ou chemin historique (comme le Web).
  return null;
}

// ---------------------------------------------------------------------------
// Résultats Nexus externes → Deal Room directe (parité Web : src/lib/waouh/nexusDeal.ts).
// ---------------------------------------------------------------------------
final RegExp _externalFabricRe = RegExp(
  r'^external:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  caseSensitive: false,
);

/// Offre externe (pas une demande d'achat) qui peut entrer directement en Deal Room.
bool liveIsDirectDealCandidate({
  required String fabricId,
  String? intent,
  String? actorType,
}) {
  final upper = (intent ?? '').trim().toUpperCase();
  if (upper == 'BUY' || upper == 'RFQ') return false;
  if ((actorType ?? '').trim().toLowerCase() == 'buyer') return false;
  return _externalFabricRe.hasMatch(fabricId.trim());
}

/// Requête `open_deal` d'un résultat externe : le serveur matérialise l'article, aucun message au tiers.
Map<String, dynamic> liveExternalDealRequest(String fabricId, {num? amount}) =>
    <String, dynamic>{
      'action': 'open_deal',
      'fabric_id': fabricId.trim().toLowerCase(),
      if (amount != null && amount > 0) 'amount': amount.round(),
      'source': 'nexus_card',
    };

enum LiveExternalDealStatus { opened, refused, fallback }

/// Réponse serveur → issue. `fallback` : drapeau nexus_direct_deal coupé ou parcours v3 indisponible
/// (l'appelant garde la fiche de contact de l'Avatar).
LiveExternalDealStatus liveExternalDealStatus(Map<String, dynamic>? response) {
  if (response == null || response['code'] == 'nexus_direct_deal_disabled') {
    return LiveExternalDealStatus.fallback;
  }
  final article = '${response['article_id'] ?? ''}'.trim();
  final thread = '${response['thread_id'] ?? ''}'.trim();
  return response['ok'] == true && article.isNotEmpty && thread.isNotEmpty
      ? LiveExternalDealStatus.opened
      : LiveExternalDealStatus.refused;
}
