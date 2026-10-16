import 'dart:convert';

import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'live_models.dart';

/// Conserve l'identité complète du bouton : plusieurs négociations peuvent
/// concerner le même article mais des interlocuteurs distincts.
String liveGuideMatchPayload(Map action) {
  const keys = [
    'article_id', 'thread_id', 'counterpart_user_id',
    'negotiation_id', 'role', 'title',
  ];
  final data = <String, String>{
    for (final key in keys)
      if (action[key] != null) key: action[key].toString(),
  };
  return 'ouvrir-match-data:${base64Url.encode(utf8.encode(jsonEncode(data)))}';
}

/// Résout le bouton de guide sur le message qui l'a émis. L'identifiant seul
/// ne contient ni le thread ni l'interlocuteur nécessaires à la Deal Room.
LiveMatch? liveMatchFromGuideAction(
  String payload,
  Iterable<LiveMessage> messages,
) {
  if (payload.startsWith('ouvrir-match-data:')) {
    try {
      final bytes = base64Url.decode(payload.substring('ouvrir-match-data:'.length));
      final raw = jsonDecode(utf8.decode(bytes));
      if (raw is! Map) return null;
      final articleId = '${raw['article_id'] ?? ''}'.trim();
      if (articleId.isEmpty) return null;
      String? optional(String key) {
        final value = '${raw[key] ?? ''}'.trim();
        return value.isEmpty ? null : value;
      }

      final role = raw['role'] == 'seller' ? 'seller' : 'buyer';
      final counterpart = optional('counterpart_user_id');
      final thread = optional('thread_id');
      return LiveMatch(
        key: liveMatchKey(articleId, role, counterpart, thread),
        articleId: articleId,
        role: role,
        title: optional('title') ?? 'Annonce',
        lastAt: DateTime.now(),
        counterpartUserId: counterpart,
        threadId: thread,
        negotiationId: optional('negotiation_id'),
        source: 'smart_fallback',
      );
    } on FormatException {
      return null;
    }
  }
  const prefix = 'ouvrir-match:';
  if (!payload.startsWith(prefix)) return null;
  final articleId = payload.substring(prefix.length).trim();
  if (articleId.isEmpty) return null;
  for (final message in messages.toList().reversed) {
    final smart = message.meta['smart'];
    final smartActions = smart is Map ? smart['actions'] : null;
    final actions = smartActions is List && smartActions.isNotEmpty
        ? smartActions
        : message.meta['actions'];
    if (actions is! List) continue;
    for (final action in actions.whereType<Map>()) {
      if ('${action['id'] ?? ''}' != payload) continue;
      if ('${action['article_id'] ?? ''}'.trim() != articleId) continue;
      String? optional(String key) {
        final value = '${action[key] ?? ''}'.trim();
        return value.isEmpty ? null : value;
      }

      final role = action['role'] == 'seller' ? 'seller' : 'buyer';
      final counterpart = optional('counterpart_user_id');
      final thread = optional('thread_id');
      return LiveMatch(
        key: liveMatchKey(articleId, role, counterpart, thread),
        articleId: articleId,
        role: role,
        title: optional('title') ?? 'Annonce',
        lastAt: message.createdAt,
        counterpartUserId: counterpart,
        threadId: thread,
        negotiationId: optional('negotiation_id'),
        source: 'smart_fallback',
      );
    }
  }
  return null;
}

String liveMatchRouteKey(LiveMatch match) {
  final article = match.articleId.trim();
  if (article.isNotEmpty) {
    return liveMatchKey(
      article,
      match.role,
      match.counterpartUserId,
      match.threadId,
    );
  }
  return match.key;
}

String liveMatchChatLocation(LiveMatch match) =>
    '/app/chat/match/${Uri.encodeComponent(liveMatchRouteKey(match))}';

/// Une route canonique article × rôle × interlocuteur ne doit jamais être
/// remplacée au moment où le thread autoritaire apparaît. Le remplacement est
/// réservé aux anciennes routes provisoires créées avant V25.7.
bool liveShouldReplaceLegacyMatchRoute({
  required String currentRouteKey,
  required LiveMatch resolved,
}) {
  final current = Uri.decodeComponent(currentRouteKey).trim();
  final target = liveMatchRouteKey(resolved);
  if (current.isEmpty || current == target) return false;
  return current.startsWith('pending_interest_');
}

/// Ouvre toujours le Chat Meet dans une nouvelle page de navigation.
/// L'utilisation de `push` est volontaire : `go` remplace la route courante
/// et peut rester masqué lorsqu'une fiche Statut ou une route impérative est
/// encore au-dessus du routeur.
Future<T?> livePushMatchChat<T>(
  BuildContext context,
  LiveMatch match,
) =>
    GoRouter.of(context).push<T>(
      liveMatchChatLocation(match),
      extra: match,
    );
