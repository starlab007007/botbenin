import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../main.dart' as legacy;
import 'live_commerce_action_client.dart';
import 'live_controller.dart';
import 'live_models.dart';
import 'live_nexus_service.dart';

/// Offre d'un vendeur WAOUH (article publié ou catalogue partenaire) : « Intéressé »
/// suit le parcours historique — intérêt transmis au vendeur (web, application,
/// WhatsApp), offre, contre-offres, accord, livraison, paiement, clôture.
/// Même règle que le web (`legacyDealCandidate`).
bool liveLegacyDealCandidate(NexusDiscoveryItem item) {
  final source = item.sourceKey.toLowerCase();
  if (!const ['waouh_app', 'partner', 'whatsapp'].contains(source)) {
    return false;
  }
  return item.fabricId.startsWith('article:') ||
      item.fabricId.startsWith('catalog:');
}

class LiveLegacyInterestException implements Exception {
  const LiveLegacyInterestException(this.message);
  final String message;
  @override
  String toString() => message;
}

String? _id(String? value, String prefix, String fabricId) {
  final v = (value ?? '').trim();
  if (v.isNotEmpty && v != 'null') return v;
  return fabricId.startsWith(prefix) ? fabricId.substring(prefix.length) : null;
}

/// Transmet l'intérêt au vendeur et ouvre la discussion de négociation de l'offre.
Future<void> openLiveLegacyInterest(
  BuildContext context,
  NexusDiscoveryItem item, {
  double? offer,
  String source = 'results_interested',
}) async {
  final match = await prepareLiveLegacyInterest(
    legacy.supabase,
    item,
    offer: offer,
    source: source,
  );
  if (!context.mounted) return;
  await showLiveInterestedMatch(context, match);
}

final _pendingInterests = <String, Future<LiveMatch>>{};

Future<LiveMatch> prepareLiveLegacyInterest(
  SupabaseClient client,
  NexusDiscoveryItem item, {
  double? offer,
  String source = 'results_interested',
}) async {
  final owner = client.auth.currentUser?.id;
  final key =
      '${identityHashCode(client)}:$owner:${item.fabricId}:${offer ?? 'interest'}';
  final pending = _pendingInterests[key];
  if (pending != null) return pending;
  final request = _prepareLiveLegacyInterest(
    client,
    item,
    offer: offer,
    source: source,
  );
  _pendingInterests[key] = request;
  try {
    final match = await request;
    if (client.auth.currentUser?.id != owner) {
      throw const LiveLegacyInterestException('Votre compte a changé.');
    }
    return match;
  } finally {
    _pendingInterests.remove(key);
  }
}

Future<LiveMatch> _prepareLiveLegacyInterest(
  SupabaseClient client,
  NexusDiscoveryItem item, {
  double? offer,
  String source = 'results_interested',
}) async {
  final owner = client.auth.currentUser?.id;
  final articleId = item.fabricId.startsWith('catalog:')
      ? null
      : item.fabricId.startsWith('article:')
          ? item.fabricId.substring(8)
          : _id(item.articleId, 'article:', item.fabricId);
  final catalogId =
      articleId == null ? _id(item.catalogId, 'catalog:', item.fabricId) : null;
  final amount = offer != null && offer > 0 ? offer.roundToDouble() : null;
  final response = await client.functions.invoke(
    'waouh-buyer-interest',
    body: <String, dynamic>{
      if (articleId != null) 'article_id': articleId,
      if (catalogId != null) 'catalog_id': catalogId,
      'source': source,
      if (amount != null) 'offer_price': amount,
      if (amount != null) 'initial_offer_amount': amount,
    },
  );
  if (client.auth.currentUser?.id != owner) {
    throw const LiveLegacyInterestException('Votre compte a changé.');
  }
  final data = response.data is Map
      ? Map<String, dynamic>.from(response.data as Map)
      : <String, dynamic>{};
  if (data['skipped'] == 'self') {
    throw const LiveLegacyInterestException(
      'C’est votre propre annonce : aucune négociation n’est ouverte.',
    );
  }
  if (data['error'] != null || data['ok'] != true) {
    throw const LiveLegacyInterestException(
      'Cet échange n’a pas pu être ouvert. Réessayez.',
    );
  }
  final resolvedArticle = '${data['article_id'] ?? articleId ?? ''}'.trim();
  final threadId = '${data['thread_id'] ?? ''}'.trim();
  if (resolvedArticle.isEmpty || threadId.isEmpty) {
    throw const LiveLegacyInterestException(
      'Cet échange n’a pas pu être ouvert. Réessayez.',
    );
  }
  return LiveMatch(
    key: liveMatchKey(resolvedArticle, 'buyer', item.sellerUserId, threadId),
    articleId: resolvedArticle,
    role: 'buyer',
    title: item.title,
    lastAt: DateTime.now(),
    threadId: threadId,
    negotiationId: data['negotiation_id']?.toString(),
    sellerUserId: item.sellerUserId,
    counterpartUserId: item.sellerUserId,
    price: item.priceMin ?? item.priceMax,
    city: item.city,
    photoUrls: item.photoUrls,
    photo: item.photoUrls.isEmpty ? null : item.photoUrls.first,
    source: source,
  );
  // waouh-buyer-interest already records the interest. No second sendMain.
}

/// Annonce externe : « Intéressé » ouvre la même fenêtre de négociation du Chat que pour un vendeur WAOUH.
/// Retourne `false` quand cette entrée n'est pas disponible : l'appelant garde alors la Deal Room.
Future<bool> openLiveExternalInterest(
  BuildContext context,
  NexusDiscoveryItem item,
) async {
  final controller = context.read<LiveWaouhController>();
  final response = await controller.sendCommerceAction(
    liveExternalDealRequest(item.fabricId),
  );
  switch (liveExternalDealStatus(response)) {
    case LiveExternalDealStatus.fallback:
      return false;
    case LiveExternalDealStatus.refused:
      final reply = response?['reply'];
      throw LiveLegacyInterestException(
        reply is Map && '${reply['detail'] ?? ''}'.isNotEmpty
            ? '${reply['detail']}'
            : 'Cet échange n’a pas pu être ouvert. Réessayez.',
      );
    case LiveExternalDealStatus.opened:
      final articleId = '${response!['article_id'] ?? ''}';
      final threadId = '${response['thread_id'] ?? ''}';
      if (articleId.isEmpty || threadId.isEmpty) {
        throw const LiveLegacyInterestException(
          'Cet échange n’a pas pu être ouvert. Réessayez.',
        );
      }
      final match = LiveMatch(
        key: liveMatchKey(articleId, 'buyer', null, threadId),
        articleId: articleId,
        role: 'buyer',
        title: item.title,
        lastAt: DateTime.now(),
        threadId: threadId,
        negotiationId: response['negotiation_id']?.toString(),
        source: 'nexus_direct_deal',
        photoUrls: item.photoUrls,
        photo: item.photoUrls.isEmpty ? null : item.photoUrls.first,
        price: item.priceMin ?? item.priceMax,
        city: item.city,
      );
      if (!context.mounted) return true;
      await showLiveInterestedMatch(context, match);
      return true;
  }
}

Future<void> showLiveInterestedMatch(
    BuildContext context, LiveMatch match) async {
  if (!context.mounted) return;
  final path = '/app/chat/match/${Uri.encodeComponent(match.key)}';
  final router = GoRouter.of(context);
  if (router.routeInformationProvider.value.uri.path == path) return;
  // A Radar sheet or a Navigator page need not have its own GoRouterState.
  router.go(path, extra: match);
}

/// Common entry for results, Radar and existing fabric links. No additional Deal Room.
Future<void> openLiveInterestedDiscussion(
  BuildContext context,
  NexusDiscoveryItem item,
) async {
  if (item.fabricId.startsWith('article:') ||
      item.fabricId.startsWith('catalog:')) {
    await openLiveLegacyInterest(context, item);
    return;
  }
  if (item.fabricId.startsWith('external:')) {
    if (await openLiveExternalInterest(context, item)) return;
    throw const LiveLegacyInterestException(
      'Cet échange est momentanément indisponible. Réessayez.',
    );
  }
  final response = await context.read<LiveWaouhController>().sendCommerceAction(
    {
      'action': 'open_deal',
      'source_id': item.fabricId.split(':').last,
      'source': 'results_interested',
    },
  );
  final articleId = '${response?['article_id'] ?? ''}'.trim();
  final threadId = '${response?['thread_id'] ?? ''}'.trim();
  if (response?['ok'] != true || articleId.isEmpty || threadId.isEmpty) {
    throw const LiveLegacyInterestException(
      'Cet échange n’a pas pu être ouvert. Réessayez.',
    );
  }
  if (!context.mounted) return;
  await showLiveInterestedMatch(
    context,
    LiveMatch(
      key: liveMatchKey(articleId, 'buyer', null, threadId),
      articleId: articleId,
      role: 'buyer',
      title: item.title,
      lastAt: DateTime.now(),
      threadId: threadId,
      negotiationId: response?['negotiation_id']?.toString(),
      price: item.priceMin ?? item.priceMax,
      city: item.city,
      photoUrls: item.photoUrls,
    ),
  );
}
