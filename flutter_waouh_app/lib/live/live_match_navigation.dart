import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import 'live_models.dart';

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
