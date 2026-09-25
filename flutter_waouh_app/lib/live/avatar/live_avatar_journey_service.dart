import 'package:supabase_flutter/supabase_flutter.dart';

import '../live_models.dart';

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

List<dynamic> _list(dynamic value) => value is List ? value : const [];

String _text(dynamic value, [String fallback = '']) =>
    value == null ? fallback : value.toString().trim();

num? _num(dynamic value) {
  if (value is num) return value;
  return num.tryParse(_text(value).replaceAll(RegExp(r'[^0-9.,-]'), '').replaceAll(',', '.'));
}

class AvatarJourneyOffer {
  const AvatarJourneyOffer({
    required this.index,
    required this.title,
    required this.raw,
    this.articleId,
    this.fabricId,
    this.sellerUserId,
    this.price,
    this.city,
    this.source,
    this.photo,
    this.marketLine,
    this.recommendation,
  });

  final int index;
  final String title;
  final Map<String, dynamic> raw;
  final String? articleId;
  final String? fabricId;
  final String? sellerUserId;
  final num? price;
  final String? city;
  final String? source;
  final String? photo;
  final String? marketLine;
  final String? recommendation;

  factory AvatarJourneyOffer.fromJson(Map<String, dynamic> row, int index) {
    final photos = liveAttachments(
      row['photos'] ?? row['images'] ?? row['image_url'] ?? row['photo'],
    );
    final scores = _map(row['scores']);
    final reasons = _list(row['reasons'] ?? scores['reasons'])
        .map(_text)
        .where((value) => value.isNotEmpty)
        .take(3)
        .join(' · ');
    return AvatarJourneyOffer(
      index: index,
      title: _text(row['title'] ?? row['name'] ?? row['nom'], 'Opportunité'),
      raw: row,
      articleId: _text(row['article_id'] ?? row['id']).isEmpty
          ? null
          : _text(row['article_id'] ?? row['id']),
      fabricId: _text(row['fabric_id']).isEmpty ? null : _text(row['fabric_id']),
      sellerUserId: _text(
        row['seller_user_id'] ??
            row['owner_user_id'] ??
            row['author_user_id'] ??
            row['user_id'],
      ).isEmpty
          ? null
          : _text(
              row['seller_user_id'] ??
                  row['owner_user_id'] ??
                  row['author_user_id'] ??
                  row['user_id'],
            ),
      price: _num(row['price'] ?? row['amount'] ?? row['prix']),
      city: _text(row['city'] ?? row['ville']).isEmpty
          ? null
          : _text(row['city'] ?? row['ville']),
      source: _text(row['source'] ?? row['source_label'] ?? row['origin']).isEmpty
          ? null
          : _text(row['source'] ?? row['source_label'] ?? row['origin']),
      photo: photos.isEmpty ? null : photos.first.url,
      marketLine: _text(
        row['market_comparison'] ??
            row['market_line'] ??
            row['marche_reel'],
      ).isEmpty
          ? null
          : _text(
              row['market_comparison'] ??
                  row['market_line'] ??
                  row['marche_reel'],
            ),
      recommendation: reasons.isNotEmpty
          ? reasons
          : (_text(row['recommendation'] ?? row['advice']).isEmpty
              ? null
              : _text(row['recommendation'] ?? row['advice'])),
    );
  }
}

class AvatarJourneySearchResult {
  const AvatarJourneySearchResult({
    required this.reply,
    required this.offers,
    required this.sourceMix,
    this.intelligence,
  });

  final String reply;
  final List<AvatarJourneyOffer> offers;
  final Map<String, dynamic> sourceMix;
  final Map<String, dynamic>? intelligence;
}

class LiveAvatarJourneyService {
  LiveAvatarJourneyService(this.client);

  final SupabaseClient client;

  String get _sessionId =>
      'avatar-${client.auth.currentUser?.id ?? 'guest'}';

  Future<AvatarJourneySearchResult> search({
    required String intent,
    required String goal,
    String? city,
    num? budget,
  }) async {
    final normalizedIntent = intent == 'sell' ? 'sell' : intent == 'ask' ? 'assistant' : 'buy';
    final prompt = switch (normalizedIntent) {
      'sell' => 'Je veux vendre. $goal',
      'assistant' => goal,
      _ => 'Je veux acheter. $goal',
    };
    final response = await client.functions.invoke(
      'waouh-channel-in-secure',
      headers: {'x-waouh-session': _sessionId},
      body: <String, dynamic>{
        'channel': 'flutter_avatar',
        'sessionId': _sessionId,
        'text': prompt,
        'attachments': const [],
        'authUserId': client.auth.currentUser?.id,
        'city': city,
        'meta': <String, dynamic>{
          'source': 'avatar_journey',
          'intent': normalizedIntent,
          if (budget != null) 'budget_max': budget,
          if (city != null && city.trim().isNotEmpty) 'city': city.trim(),
        },
      },
    );
    final data = _map(response.data);
    if (data['ok'] == false || data['success'] == false || data['error'] != null) {
      throw StateError(_text(data['error'] ?? data['message'], 'Recherche indisponible.'));
    }
    final meta = _map(data['meta']);
    final rows = _list(
      data['results'] ??
          meta['results'] ??
          data['products'] ??
          meta['products'] ??
          data['matches'] ??
          meta['matches'],
    );
    final offers = <AvatarJourneyOffer>[];
    for (var i = 0; i < rows.length; i += 1) {
      final row = _map(rows[i]);
      if (row.isEmpty) continue;
      offers.add(AvatarJourneyOffer.fromJson(row, i + 1));
    }
    return AvatarJourneySearchResult(
      reply: _text(data['reply'] ?? data['text'] ?? meta['text']),
      offers: offers,
      sourceMix: _map(data['source_mix'] ?? meta['source_mix']),
      intelligence: _map(data['intelligence'] ?? meta['intelligence']).isEmpty
          ? null
          : _map(data['intelligence'] ?? meta['intelligence']),
    );
  }

  Future<LiveMatch> expressInterest(AvatarJourneyOffer offer) async {
    if (offer.articleId == null || offer.articleId!.isEmpty) {
      throw StateError(
        'Cette opportunité externe doit d’abord être contactée via le Contact Layer.',
      );
    }
    final response = await client.functions.invoke(
      'waouh-channel-in-secure',
      headers: {'x-waouh-session': _sessionId},
      body: <String, dynamic>{
        'channel': 'flutter_avatar',
        'sessionId': _sessionId,
        'text': 'intéressé ${offer.index}',
        'attachments': const [],
        'authUserId': client.auth.currentUser?.id,
        'meta': <String, dynamic>{
          'source': 'avatar_journey',
          'intent': 'interested',
          'article_id': offer.articleId,
          if (offer.sellerUserId != null) 'seller_user_id': offer.sellerUserId,
          if (offer.sellerUserId != null) 'counterpart_user_id': offer.sellerUserId,
          if (offer.fabricId != null) 'fabric_id': offer.fabricId,
          'title': offer.title,
          if (offer.price != null) 'price': offer.price,
          if (offer.city != null) 'city': offer.city,
        },
      },
    );
    final data = _map(response.data);
    if (data['ok'] == false || data['success'] == false || data['error'] != null) {
      throw StateError(_text(data['error'] ?? data['message'], 'Impossible de créer le Deal Room.'));
    }
    final articleId = _text(data['article_id'] ?? offer.articleId);
    final sellerUserId = _text(
      data['seller_user_id'] ??
          data['counterpart_user_id'] ??
          offer.sellerUserId,
    );
    final threadId = _text(data['thread_id']).isEmpty ? null : _text(data['thread_id']);
    final match = LiveMatch(
      key: liveMatchKey(articleId, 'buyer', sellerUserId, threadId),
      articleId: articleId,
      role: 'buyer',
      title: offer.title,
      lastAt: DateTime.now(),
      notificationIds: const [],
      counterpartUserId: sellerUserId.isEmpty ? null : sellerUserId,
      threadId: threadId,
      buyerUserId: _text(data['buyer_user_id']).isEmpty ? null : _text(data['buyer_user_id']),
      sellerUserId: sellerUserId.isEmpty ? null : sellerUserId,
      source: 'avatar_journey',
      negotiationId: _text(data['negotiation_id']).isEmpty ? null : _text(data['negotiation_id']),
      dealId: _text(data['deal_id']).isEmpty ? null : _text(data['deal_id']),
      transactionId: _text(data['transaction_id']).isEmpty ? null : _text(data['transaction_id']),
      seedText: _text(data['reply']).isEmpty ? null : _text(data['reply']),
      price: offer.price,
      city: offer.city,
      photo: offer.photo,
      photoUrls: offer.photo == null ? const [] : [offer.photo!],
    );
    return match;
  }
}
