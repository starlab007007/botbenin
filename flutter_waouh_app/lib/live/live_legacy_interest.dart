import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_models.dart';
import 'live_nexus_service.dart';
import 'live_thread_flow.dart';

/// Offre d'un vendeur WAOUH (article publié ou catalogue partenaire) : « Intéressé »
/// suit le parcours historique — intérêt transmis au vendeur (web, application,
/// WhatsApp), offre, contre-offres, accord, livraison, paiement, clôture.
/// Même règle que le web (`legacyDealCandidate`).
bool liveLegacyDealCandidate(NexusDiscoveryItem item) {
  final source = item.sourceKey.toLowerCase();
  if (!const ['waouh_app', 'partner', 'whatsapp'].contains(source)) return false;
  return item.fabricId.startsWith('article:') || item.fabricId.startsWith('catalog:');
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
  final controller = context.read<LiveWaouhController>();
  final articleId = _id(item.articleId, 'article:', item.fabricId);
  final catalogId = articleId == null ? _id(item.catalogId, 'catalog:', item.fabricId) : null;
  final amount = offer != null && offer > 0 ? offer.roundToDouble() : null;
  final response = await legacy.supabase.functions.invoke('waouh-buyer-interest', body: <String, dynamic>{
    if (articleId != null) 'article_id': articleId,
    if (catalogId != null) 'catalog_id': catalogId,
    'source': source,
    if (amount != null) 'offer_price': amount,
    if (amount != null) 'initial_offer_amount': amount,
  });
  final data = response.data is Map ? Map<String, dynamic>.from(response.data as Map) : <String, dynamic>{};
  if (data['skipped'] == 'self') {
    throw const LiveLegacyInterestException('C’est votre propre annonce : aucune négociation n’est ouverte.');
  }
  if (data['error'] != null || data['ok'] != true) {
    throw const LiveLegacyInterestException('Cet échange n’a pas pu être ouvert. Réessayez.');
  }
  final resolvedArticle = '${data['article_id'] ?? articleId ?? ''}'.trim();
  final text = amount != null
      ? 'Je propose ${amount.round()} FCFA pour « ${item.title} ».'
      : 'Je suis intéressé par « ${item.title} ».';
  final raw = <String, dynamic>{
    'source': source,
    'origin_surface': 'flutter_results',
    'action': 'interested',
    'intent': 'interested',
    'thread_type': 'product_meet',
    'article_id': resolvedArticle,
    'seller_user_id': item.sellerUserId,
    'counterpart_user_id': item.sellerUserId,
    'title': item.title,
    'city': item.city,
    'price': item.priceMin ?? item.priceMax,
    if (amount != null) 'offer_price': amount,
    if (amount != null) 'initial_offer_amount': amount,
    'fabric_id': item.fabricId,
    if (data['thread_id'] != null) 'thread_id': data['thread_id'],
    if (data['negotiation_id'] != null) 'negotiation_id': data['negotiation_id'],
    'workflow_state': data['workflow_state'] ?? 'proposed',
    'commerce_contract': 'waouh_action_v2',
  }..removeWhere((_, value) => value == null || '$value'.trim().isEmpty);
  final meta = liveCanonicalInterestedMeta(
    text: text,
    meta: raw,
    authUserId: legacy.supabase.auth.currentUser?.id,
  );
  final seed = liveBuildInterestedEntryMatch(text: text, requestMeta: meta);
  await controller.sendMain(text: text, meta: meta);
  LiveMatch? match = controller.takePendingMeet();
  match ??= await controller.resolvePreparedInterestedMeet(seed);
  if (match == null || (match.threadId ?? '').trim().isEmpty) {
    throw const LiveLegacyInterestException('Votre intérêt est transmis au vendeur. L’échange s’ouvre dans vos discussions.');
  }
  if (!context.mounted) return;
  context.push('/app/chat/match/${Uri.encodeComponent(match.key)}', extra: match);
}
