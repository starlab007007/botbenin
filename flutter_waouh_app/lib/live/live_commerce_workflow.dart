import 'live_models.dart';

/// Contrat unique du parcours commercial WAOUH côté Flutter.
///
/// Les payloads sont structurés et restent lisibles par les anciens backends.
/// Le texte envoyé au moteur est toujours OUI / NON / une proposition libre,
/// tandis que les identifiants métier voyagent dans les métadonnées.
enum LiveCommerceActionKind {
  interest,
  accept,
  counter,
  reject,
  unknown,
}

class LiveCommerceActionSpec {
  const LiveCommerceActionSpec({
    required this.kind,
    required this.label,
    required this.payload,
  });

  final LiveCommerceActionKind kind;
  final String label;
  final String payload;
}

String _foldCommerce(String value) => value
    .trim()
    .toLowerCase()
    .replaceAll('é', 'e')
    .replaceAll('è', 'e')
    .replaceAll('ê', 'e')
    .replaceAll('à', 'a')
    .replaceAll('ô', 'o')
    .replaceAll('_', '-')
    .replaceAll(' ', '-');

String liveCommerceRawCommand(String payload) {
  final value = payload.trim();
  final queryAt = value.indexOf('?');
  return (queryAt < 0 ? value : value.substring(0, queryAt)).trim();
}

String? liveCommerceLegacyReference(String payload) {
  final command = liveCommerceRawCommand(payload);
  if (command.toLowerCase().startsWith('waouh:')) return null;
  final separator = command.indexOf(':');
  if (separator < 0 || separator == command.length - 1) return null;
  final value = command.substring(separator + 1).trim();
  return value.isEmpty ? null : value;
}

Map<String, String> liveCommerceQuery(String payload) {
  final value = payload.trim();
  final queryAt = value.indexOf('?');
  if (queryAt < 0 || queryAt == value.length - 1) {
    return const <String, String>{};
  }
  try {
    return Uri.splitQueryString(value.substring(queryAt + 1));
  } catch (_) {
    return const <String, String>{};
  }
}

LiveCommerceActionKind liveCommerceActionKind(String payload) {
  var command = _foldCommerce(liveCommerceRawCommand(payload));
  if (command.startsWith('waouh:')) command = command.substring(6);
  final colonAt = command.indexOf(':');
  if (colonAt >= 0) command = command.substring(0, colonAt);

  if (command == 'interest' ||
      command == 'interested' ||
      command.startsWith('interess') ||
      command.startsWith('buyer-interest') ||
      command.startsWith('product-interest') ||
      command.startsWith('status-interest') ||
      command.startsWith('radar-interest')) {
    return LiveCommerceActionKind.interest;
  }
  if (<String>{
    'accept',
    'accepter',
    'oui',
    'yes',
    'confirm',
    'confirmer',
  }.contains(command)) {
    return LiveCommerceActionKind.accept;
  }
  if (<String>{
    'counter',
    'counter-offer',
    'contre-offre',
    'contre-proposition',
    'proposer',
    'proposal',
  }.contains(command)) {
    return LiveCommerceActionKind.counter;
  }
  if (<String>{
    'reject',
    'refuse',
    'refuser',
    'non',
    'no',
    'decline',
    'annuler',
  }.contains(command)) {
    return LiveCommerceActionKind.reject;
  }
  return LiveCommerceActionKind.unknown;
}

String liveCommerceOutboundText(String payload) {
  switch (liveCommerceActionKind(payload)) {
    case LiveCommerceActionKind.accept:
      return 'OUI';
    case LiveCommerceActionKind.reject:
      return 'NON';
    case LiveCommerceActionKind.counter:
      return 'Je propose';
    case LiveCommerceActionKind.interest:
    case LiveCommerceActionKind.unknown:
      return liveCommerceRawCommand(payload);
  }
}

String liveCanonicalWorkflowPayload(
  LiveCommerceActionKind kind, {
  Map<String, String> context = const <String, String>{},
}) {
  final action = switch (kind) {
    LiveCommerceActionKind.accept => 'accept',
    LiveCommerceActionKind.counter => 'counter',
    LiveCommerceActionKind.reject => 'reject',
    LiveCommerceActionKind.interest => 'interest',
    LiveCommerceActionKind.unknown => 'unknown',
  };
  final query = <String, String>{
    ...context,
    'commerce_action': action,
    'origin_surface': context['origin_surface'] ?? 'flutter_match_chat',
  };
  return 'waouh:$action?${Uri(queryParameters: query).query}';
}

Map<String, String> liveCommerceScopeFromMessage(LiveMessage message) {
  final scope = <String, String>{};
  for (final key in const <String>[
    'thread_id',
    'article_id',
    'buyer_user_id',
    'seller_user_id',
    'counterpart_user_id',
    'negotiation_id',
    'deal_id',
    'transaction_id',
    'role',
    'source',
    'status_id',
    'radar_item_id',
    'search_request_id',
  ]) {
    final raw = message.meta[key] ??
        (key == 'thread_id' ? message.threadId : null) ??
        (key == 'article_id' ? message.articleId : null);
    final value = '${raw ?? ''}'.trim();
    if (value.isNotEmpty && value != 'null') scope[key] = value;
  }
  return scope;
}

String liveCommerceStageOf(LiveMessage message) {
  final candidates = <Object?>[
    message.meta['workflow_state'],
    message.meta['stage'],
    message.meta['intent'],
    message.meta['event_type'],
    message.meta['notification_type'],
  ];
  for (final candidate in candidates) {
    final value = _foldCommerce('${candidate ?? ''}');
    if (value.isNotEmpty) return value;
  }
  return _foldCommerce(message.text);
}

const Set<String> _terminalCommerceStages = <String>{
  'closed',
  'negotiation-closed',
  'negotiation-refused',
  'negotiation-rejected',
  'refused',
  'rejected',
  'cancelled',
  'canceled',
  'completed',
  'delivered',
  'delivery-completed',
  'reception-confirmed',
  'sale-completed',
  'transaction-completed',
  'deal-cancelled',
  'deal-canceled',
  'payment-cancelled',
  'payment-canceled',
  'delivery-cancelled',
  'delivery-canceled',
  'order-cancelled',
  'order-canceled',
  'vente-conclue',
  'achat-confirme',
};

const List<String> _terminalCommerceTextMarkers = <String>[
  'negociation-fermee',
  'negociation-cloturee',
  'negociation-cloture',
  'negociation-refusee',
  'vente-conclue',
  'achat-confirme',
  'reception-confirmee',
  'livraison-terminee',
  'transaction-terminee',
];

bool liveCommerceStageIsTerminal(String stage) {
  final value = _foldCommerce(stage);
  if (_terminalCommerceStages.contains(value)) return true;
  return _terminalCommerceTextMarkers.any(value.contains);
}

bool liveCommerceMessageIsTerminal(LiveMessage message) =>
    liveCommerceStageIsTerminal(liveCommerceStageOf(message));

bool liveCommerceMessageAwaitsCounterparty(LiveMessage message) {
  final stage = liveCommerceStageOf(message);
  return stage.contains('awaiting-counterparty') ||
      stage.contains('counter-sent') ||
      stage.contains('offer-sent');
}

/// Indique qu'un message plus récent a quitté l'étape de négociation et rend
/// définitivement obsolètes les boutons Accepter / Contre-proposer / Refuser
/// d'une offre précédente.
///
/// Ces étapes ne sont pas forcément terminales : un accord peut ouvrir le
/// paiement, la disponibilité du vendeur, la préparation ou la livraison.
/// Lorsque le backend fournit des actions explicites pour la nouvelle étape,
/// [liveCommerceMessageIsActionable] les conserve. En leur absence, Flutter
/// n'invente rien et ne réactive jamais une ancienne offre.
bool liveCommerceMessageSupersedesPreviousActions(LiveMessage message) {
  final stage = liveCommerceStageOf(message);
  return stage.contains('deal-created') ||
      stage.contains('deal-accepted') ||
      stage.contains('deal-already-accepted') ||
      stage.contains('awaiting-payment') ||
      stage.contains('payment-pending') ||
      stage.contains('payment-initiated') ||
      stage.contains('payment-confirmed') ||
      stage.contains('awaiting-availability') ||
      stage.contains('awaiting-seller-availability') ||
      stage.contains('availability-confirmed') ||
      stage.contains('preparing') ||
      stage.contains('ready-for-pickup') ||
      stage.contains('ready-for-delivery') ||
      stage.contains('delivery-assigned') ||
      stage.contains('delivery-in-progress') ||
      stage.contains('in-transit') ||
      stage.contains('problem-reported');
}

bool liveCommerceMessageIsActionable(LiveMessage message) {
  if (message.outgoing || liveCommerceMessageIsTerminal(message)) return false;
  final actions = message.meta['actions'];
  if (actions is List &&
      actions.whereType<Map>().any((item) {
        final id = '${item['id'] ?? item['payload'] ?? ''}'.trim();
        return id.isNotEmpty;
      })) {
    return true;
  }
  if (liveCommerceMessageAwaitsCounterparty(message)) return false;
  final stage = liveCommerceStageOf(message);
  return stage.contains('buyer-interest') ||
      stage.contains('new-buyer') ||
      stage.contains('proposed') ||
      stage.contains('countered') ||
      stage.contains('negotiation-open') ||
      stage.contains('negotiation-counter') ||
      stage.contains('awaiting-buyer-decision') ||
      stage.contains('awaiting-seller-decision') ||
      message.text.toLowerCase().contains('demande envoyée au vendeur') ||
      message.text.toLowerCase().contains('nouvelle offre') ||
      message.text.toLowerCase().contains('contre-offre');
}

int liveLatestActionableMessageIndex(List<LiveMessage> messages) {
  for (var index = messages.length - 1; index >= 0; index -= 1) {
    final message = messages[index];
    if (liveCommerceMessageIsTerminal(message)) return -1;
    final localAction = '${message.meta['commerce_action'] ?? ''}'.trim();
    if (message.outgoing && localAction.isNotEmpty) return -1;

    // La nouvelle étape a la priorité. Si elle contient des actions backend,
    // elles deviennent les seules actions actives. Si elle n'en contient pas,
    // elle constitue tout de même une barrière et interdit de remonter vers les
    // boutons obsolètes d'une offre antérieure.
    if (liveCommerceMessageIsActionable(message)) return index;
    if (liveCommerceMessageSupersedesPreviousActions(message)) return -1;
  }
  return -1;
}
