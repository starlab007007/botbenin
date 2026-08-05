import 'live_models.dart';

const _flowContainers = <String>[
  'data',
  'result',
  'payload',
  'response',
  'match',
  'interest',
  'notification',
  'thread',
];

bool _flowEmpty(dynamic value) {
  if (value == null) return true;
  if (value is String) return value.trim().isEmpty;
  if (value is Iterable) return value.isEmpty;
  if (value is Map) return value.isEmpty;
  return false;
}

Map<String, dynamic> liveNormalizeChannelResponse(dynamic raw) {
  final root = liveMap(raw);
  if (root.isEmpty) return const <String, dynamic>{};
  final merged = <String, dynamic>{};

  void absorb(dynamic value, int depth) {
    if (depth > 6) return;
    final map = liveMap(value);
    if (map.isEmpty) return;

    for (final entry in map.entries) {
      final current = merged[entry.key];
      if (!merged.containsKey(entry.key) || _flowEmpty(current)) {
        merged[entry.key] = entry.value;
      }
    }

    final thread = liveMap(map['thread']);
    final threadId = liveText(
      thread['thread_id'] ??
          thread['threadId'] ??
          thread['chat_thread_id'] ??
          thread['id'],
    ).trim();
    if (threadId.isNotEmpty && _flowEmpty(merged['thread_id'])) {
      merged['thread_id'] = threadId;
    }

    for (final key in _flowContainers) {
      absorb(map[key], depth + 1);
    }
  }

  absorb(root, 0);
  return merged;
}

dynamic liveFlowValue(
  dynamic raw,
  Iterable<String> keys, {
  int maxDepth = 6,
}) {
  final wanted = keys.toSet();

  dynamic find(dynamic value, int depth) {
    if (depth > maxDepth) return null;
    final decoded = value is String ? liveMap(value) : value;
    if (decoded is Map) {
      for (final key in wanted) {
        final candidate = decoded[key];
        if (!_flowEmpty(candidate)) return candidate;
      }
      for (final key in _flowContainers) {
        final candidate = find(decoded[key], depth + 1);
        if (!_flowEmpty(candidate)) return candidate;
      }
      for (final entry in decoded.entries) {
        if (_flowContainers.contains(entry.key.toString())) continue;
        final candidate = find(entry.value, depth + 1);
        if (!_flowEmpty(candidate)) return candidate;
      }
    } else if (decoded is List) {
      for (final item in decoded) {
        final candidate = find(item, depth + 1);
        if (!_flowEmpty(candidate)) return candidate;
      }
    }
    return null;
  }

  return find(raw, 0);
}

String liveFlowText(
  dynamic raw,
  Iterable<String> keys, [
  String fallback = '',
]) {
  final value = liveFlowValue(raw, keys);
  final text = liveText(value).trim();
  return text.isEmpty ? fallback : text;
}

String liveThreadIdFromResponse(dynamic raw) {
  // `liveNormalizeChannelResponse` transforme aussi les formes historiques
  // `payload.thread.id`, `data.thread.id` et `response.thread.id` en
  // `thread_id`. Lire d'abord cette représentation canonique évite de perdre
  // un thread autoritaire uniquement parce qu'il est imbriqué.
  final normalized = liveNormalizeChannelResponse(raw);
  final normalizedThread = liveText(
    normalized['thread_id'] ??
        normalized['threadId'] ??
        normalized['chat_thread_id'] ??
        normalized['chatThreadId'],
  ).trim();
  if (normalizedThread.isNotEmpty) return normalizedThread;

  final direct = liveFlowText(raw, const [
    'thread_id',
    'threadId',
    'chat_thread_id',
    'chatThreadId',
  ]);
  if (direct.isNotEmpty) return direct;

  final matchKey = liveFlowText(raw, const ['match_key', 'matchKey']);
  if (matchKey.startsWith('meet_') && matchKey.length > 5) {
    return matchKey.substring(5);
  }
  return '';
}

String liveNormalizeCommerceAction(dynamic value) {
  var text = liveText(value).trim().toLowerCase();
  if (text.isEmpty) return '';
  final query = text.indexOf('?');
  if (query >= 0) text = text.substring(0, query);
  final colon = text.indexOf(':');
  if (colon >= 0) text = text.substring(0, colon);
  return text
      .replaceAll('é', 'e')
      .replaceAll('è', 'e')
      .replaceAll('ê', 'e')
      .replaceAll('ë', 'e')
      .replaceAll('à', 'a')
      .replaceAll('â', 'a')
      .replaceAll('î', 'i')
      .replaceAll('ï', 'i')
      .replaceAll('ô', 'o')
      .replaceAll('ö', 'o')
      .replaceAll('ù', 'u')
      .replaceAll('û', 'u')
      .replaceAll('ü', 'u')
      .replaceAll('’', "'")
      .replaceAll(RegExp(r'[_./-]+'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

const _interestedExactAliases = <String>{
  'interest',
  'interested',
  'interesse',
  'interessee',
  'interesser',
  'interrese',
  'interrer',
  'interer',
  'buyer interest',
  'buyer interested',
  'buyer interesse',
  'product interest',
  'product interested',
  'product interesse',
  'article interest',
  'article interested',
  'item interest',
  'item interested',
  'status interest',
  'status interested',
  'radar interest',
  'radar interested',
  'interest created',
  'buyer interested created',
};

bool _isInterestedAction(String action) {
  if (action.isEmpty) return false;

  // Les payloads historiques ajoutent parfois un index à un alias exact
  // (« interrese 5 », « interrer 4 », « buyer_interest 2 »). Retirer
  // uniquement ce suffixe numérique avant de consulter la liste blanche évite
  // d'élargir la détection à des mots sans rapport avec une intention d'achat.
  final aliasWithoutIndex = action.replaceFirst(RegExp(r'\s+\d+$'), '').trim();
  if (_interestedExactAliases.contains(action) ||
      _interestedExactAliases.contains(aliasWithoutIndex)) {
    return true;
  }

  // Les variantes orthographiques régulières restent reconnues, avec ou sans
  // index. Les identifiants structurés peuvent aussi être préfixés par leur
  // surface : buyer_interest, status-interest, radar_interest, etc.
  if (RegExp(
          r'^(?:interess[a-z]*|interest(?:ed)?|interrer|interer)(?:\s+\d+)?$')
      .hasMatch(action)) {
    return true;
  }
  return RegExp(
    r'^(?:buyer|product|article|item|status|radar)\s+'
    r'(?:interess[a-z]*|interest(?:ed)?|interrer|interer)(?:\s+\d+)?$',
  ).hasMatch(action);
}

bool liveLooksInterestedText(String text) {
  final normalized = liveNormalizeCommerceAction(text);
  if (_isInterestedAction(normalized)) return true;
  return RegExp(
        r"\b(?:je\s+suis|m[' ]?interesse|je\s+m[' ]?interesse|interesse)\s+"
        r'(?:par|a|au|aux|pour)?\s*(?:ce|cet|cette|le|la|les|un|une)?\s*'
        r'(?:produit|article|annonce)?\b',
        caseSensitive: false,
      ).hasMatch(normalized) ||
      RegExp(
        r'\binterested\s+(?:in|by)\b',
        caseSensitive: false,
      ).hasMatch(normalized);
}

bool liveIsInterestedMeta(
  Map<String, dynamic> meta, {
  String? text,
}) {
  for (final value in [
    meta['action'],
    meta['intent'],
    meta['commerce_action'],
    meta['button_payload'],
    meta['payload_action'],
    meta['action_type'],
    meta['event'],
    meta['notification_type'],
    meta['radar_intent'],
    meta['status_action'],
  ]) {
    if (_isInterestedAction(liveNormalizeCommerceAction(value))) return true;
  }
  return text != null && liveLooksInterestedText(text);
}

const _dedicatedProductMeetIntents = <String>{
  'confirm',
  'negotiate',
  'negotiation open',
  'match buyer',
  'match seller',
  'contact exchange',
  'deal accepted',
  'deal refused',
};

/// Filet de sécurité équivalent au Web : une réponse backend structurée peut
/// demander l'ouverture d'un Chat Meet même lorsqu'un ancien bouton Flutter a
/// envoyé un alias ou une faute non encore connue. Une identité produit ou un
/// thread autoritaire reste obligatoire afin d'éviter tout faux routage.
bool liveResponseRequestsProductMeet(dynamic raw) {
  final normalized = liveNormalizeChannelResponse(raw);
  if (normalized.isEmpty) return false;

  final responseMeta = <String, dynamic>{
    ...normalized,
    ...liveMap(normalized['meta']),
    ...liveMap(normalized['payload']),
  };
  final responseText = liveFlowText(
    normalized,
    const ['reply', 'message', 'text'],
  );
  if (liveIsInterestedMeta(responseMeta, text: responseText)) return true;

  final intent = liveNormalizeCommerceAction(
    liveFlowValue(normalized, const [
      'intent',
      'action',
      'event',
      'notification_type',
      'workflow_intent',
    ]),
  );
  if (!_dedicatedProductMeetIntents.contains(intent)) return false;

  final hasIdentity = liveThreadIdFromResponse(normalized).isNotEmpty ||
      liveFlowText(normalized, const [
        'article_id',
        'seller_user_id',
        'counterpart_user_id',
        'negotiation_id',
        'deal_id',
      ]).isNotEmpty;
  return hasIdentity;
}

/// Normalise uniquement le contrat métier de l'action « Intéressé ».
/// Les autres actions et tous les champs inconnus restent inchangés.
Map<String, dynamic> liveCanonicalInterestedMeta({
  required String text,
  required Map<String, dynamic> meta,
  String? authUserId,
}) {
  final result = <String, dynamic>{...meta};
  if (!liveIsInterestedMeta(result, text: text)) return result;

  result['action'] = 'interested';
  result['intent'] = 'interested';
  result['role'] = 'buyer';

  // `buyer_user_id` appartient au domaine `waouh_users.id`. Le Supabase
  // Auth UUID ne doit jamais y être injecté : le backend résout cette identité
  // séparément via `auth_user_id` et la session courante.
  final buyer = liveText(result['buyer_user_id']).trim();
  if (buyer.isNotEmpty) {
    result['buyer_user_id'] = buyer;
  } else {
    result.remove('buyer_user_id');
  }
  final authIdentity = liveText(result['auth_user_id'] ?? authUserId).trim();
  if (authIdentity.isNotEmpty) result['auth_user_id'] = authIdentity;

  final seller = liveText(
    result['seller_user_id'] ??
        result['owner_user_id'] ??
        result['counterpart_user_id'],
  ).trim();
  if (seller.isNotEmpty) {
    result['seller_user_id'] = seller;
    result['counterpart_user_id'] = seller;
  }

  final source = liveText(
    result['source'] ?? result['origin_surface'],
    'flutter_chat',
  ).trim();
  if (source.isNotEmpty) result['source'] = source;
  result.putIfAbsent('origin_surface', () => source);
  result.putIfAbsent('thread_type', () => 'product_meet');
  return result;
}

bool liveCanPromoteInterestedMatch({
  required LiveMatch seed,
  required LiveMatch? resolved,
}) {
  if (!liveIsProvisionalInterestedMatch(seed) || resolved == null) return false;
  final threadId = resolved.threadId?.trim() ?? '';
  if (threadId.isEmpty) return false;

  final seedArticle = seed.articleId.trim();
  final resolvedArticle = resolved.articleId.trim();
  if (seedArticle.isNotEmpty &&
      resolvedArticle.isNotEmpty &&
      seedArticle != resolvedArticle) {
    return false;
  }

  final seedSeller = (seed.sellerUserId ?? seed.counterpartUserId ?? '').trim();
  final resolvedSeller =
      (resolved.sellerUserId ?? resolved.counterpartUserId ?? '').trim();
  if (seedSeller.isNotEmpty &&
      resolvedSeller.isNotEmpty &&
      seedSeller != resolvedSeller) {
    return false;
  }
  return true;
}

String liveMatchMessageCacheKey({
  required LiveMatch match,
  required String? authUserId,
  required int controllerIdentity,
}) {
  final authIdentity = authUserId?.trim() ?? '';
  final owner = authIdentity.isEmpty
      ? 'controller_$controllerIdentity'
      : 'auth_$authIdentity';
  return '${owner}_${liveMatchScopeKey(match)}';
}

Map<String, dynamic> liveCanonicalMatchMeta({
  required LiveMatch match,
  Map<String, dynamic> actionMeta = const <String, dynamic>{},
}) {
  final result = <String, dynamic>{...actionMeta};

  void canonical(String key, String? value) {
    final normalized = value?.trim() ?? '';
    if (normalized.isEmpty) {
      result.remove(key);
    } else {
      result[key] = normalized;
    }
  }

  canonical('article_id', match.isSearch ? null : match.articleId);
  canonical('thread_type', match.threadType);
  canonical('search_request_id', match.searchRequestId);
  canonical('buyer_profile_id', match.buyerProfileId);
  canonical('counterpart_user_id', match.counterpartUserId);
  canonical('thread_id', match.threadId);
  canonical('buyer_user_id', match.buyerUserId);
  canonical('seller_user_id', match.sellerUserId);
  canonical('negotiation_id', match.negotiationId);
  canonical('deal_id', match.dealId);
  canonical('transaction_id', match.transactionId);
  result['role'] = match.role;
  result['match_key'] = match.key;
  return result;
}

String _safePendingKey(String value) {
  final sanitized = value.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '_');
  return sanitized.length <= 96 ? sanitized : sanitized.substring(0, 96);
}

num? _flowNumber(dynamic value) {
  if (value is num) return value;
  return num.tryParse(
    '${value ?? ''}'.replaceAll(RegExp(r'[^0-9.,-]'), '').replaceAll(',', '.'),
  );
}

LiveMatch _buildInterestedMatch({
  required String text,
  required Map<String, dynamic> requestMeta,
  required DateTime createdAt,
  String? forcedThreadId,
}) {
  final articleId = liveText(requestMeta['article_id']).trim();
  final buyerUserId = liveText(requestMeta['buyer_user_id']).trim();
  final sellerUserId = liveText(
    requestMeta['seller_user_id'] ?? requestMeta['counterpart_user_id'],
  ).trim();
  final threadId = liveText(
    forcedThreadId ?? requestMeta['thread_id'],
  ).trim();
  final idempotency = liveText(requestMeta['idempotency_key']).trim();
  final sourceIdentity = liveText(
    requestMeta['source_id'] ??
        requestMeta['status_id'] ??
        requestMeta['radar_item_id'],
  ).trim();
  final identity = idempotency.isNotEmpty
      ? idempotency
      : '${articleId}_${sourceIdentity}_${sellerUserId}_${createdAt.microsecondsSinceEpoch}';
  final rawPhotos = requestMeta['photos'] ??
      requestMeta['images'] ??
      requestMeta['attachments'] ??
      requestMeta['image_url'];
  final photos = liveAttachments(rawPhotos)
      .map((item) => item.url)
      .where((url) => url.trim().isNotEmpty)
      .toList();
  final rawTitle = liveText(
    requestMeta['title'] ?? requestMeta['product_title'],
    text,
  ).trim();
  final key = threadId.isNotEmpty
      ? liveMatchKey(articleId, 'buyer', sellerUserId, threadId)
      : 'pending_interest_${_safePendingKey(identity)}';

  return LiveMatch(
    key: key,
    articleId: articleId,
    role: 'buyer',
    title: liveVisibleText(
      rawTitle.isEmpty ? 'Discussion produit' : rawTitle,
    ),
    lastAt: createdAt,
    threadId: threadId.isEmpty ? null : threadId,
    threadType: liveText(requestMeta['thread_type'], 'product_meet'),
    buyerUserId: buyerUserId.isEmpty ? null : buyerUserId,
    sellerUserId: sellerUserId.isEmpty ? null : sellerUserId,
    counterpartUserId: sellerUserId.isEmpty ? null : sellerUserId,
    source: liveText(
      requestMeta['source'] ?? requestMeta['origin_surface'],
      'flutter_chat',
    ),
    counterpartLabel: liveText(
      requestMeta['seller_name'] ?? requestMeta['counterpart_name'],
    ),
    seedText: liveVisibleText(text),
    price: _flowNumber(requestMeta['price']),
    city: liveText(requestMeta['city']).trim().isEmpty
        ? null
        : liveText(requestMeta['city']).trim(),
    photo: photos.isEmpty ? null : photos.first,
    photoUrls: photos,
    unreadCount: 0,
  );
}

/// Fabrique l'entrée de navigation. Lorsqu'un thread autoritaire est déjà
/// présent dans le payload, il est utilisé immédiatement. Sinon, une identité
/// locale provisoire sans thread est créée.
LiveMatch liveBuildInterestedEntryMatch({
  required String text,
  required Map<String, dynamic> requestMeta,
  DateTime? now,
}) =>
    _buildInterestedMatch(
      text: text,
      requestMeta: requestMeta,
      createdAt: now ?? DateTime.now(),
    );

/// Fabrique uniquement une identité locale provisoire. Elle ouvre la fenêtre
/// immédiatement, mais n'est jamais utilisée comme thread distant.
LiveMatch liveBuildProvisionalInterestedMatch({
  required String text,
  required Map<String, dynamic> requestMeta,
  DateTime? now,
}) =>
    _buildInterestedMatch(
      text: text,
      requestMeta: requestMeta,
      createdAt: now ?? DateTime.now(),
      forcedThreadId: '',
    );

bool liveIsProvisionalInterestedMatch(LiveMatch match) =>
    match.threadId?.trim().isNotEmpty != true &&
    match.key.startsWith('pending_interest_');

/// Une fenêtre « Intéressé » doit être rendue immédiatement dès qu'elle
/// possède une identité locale déterministe. Le thread distant reste
/// autoritaire pour les messages temps réel, mais ne doit jamais bloquer
/// l'ouverture visuelle de la nouvelle page.
bool liveShouldDisplayInterestedWindowImmediately(LiveMatch match) =>
    liveIsProvisionalInterestedMatch(match) ||
    match.threadId?.trim().isNotEmpty == true;

/// Produit local affichable dans la timeline pendant la résolution distante.
Map<String, dynamic> liveInterestedProductPreview(LiveMatch match) => {
      if (match.articleId.trim().isNotEmpty) 'article_id': match.articleId,
      'title': match.title.trim().isEmpty ? 'Discussion produit' : match.title,
      if (match.price != null) 'price': match.price,
      if (match.city?.trim().isNotEmpty == true) 'city': match.city,
      if (match.photoUrls.isNotEmpty) 'photos': match.photoUrls,
      if (match.photoUrls.isEmpty && match.photo?.trim().isNotEmpty == true)
        'image_url': match.photo,
      if (match.sellerUserId?.trim().isNotEmpty == true)
        'seller_user_id': match.sellerUserId,
      if (match.counterpartLabel?.trim().isNotEmpty == true)
        'seller_name': match.counterpartLabel,
      'role': 'buyer',
      'workflow_state': 'summary_only',
    };

/// Le thread distant reste autoritaire. Les informations locales complètent
/// les anciennes réponses qui ne renvoient que le thread_id.
LiveMatch liveEnrichResolvedInterestedMatch({
  required LiveMatch seed,
  required LiveMatch resolved,
}) {
  final genericResolvedTitle = resolved.title.trim().isEmpty ||
      resolved.title == 'Annonce' ||
      liveLooksInterestedText(resolved.title);
  final articleId =
      resolved.articleId.trim().isEmpty ? seed.articleId : resolved.articleId;
  final sellerUserId = resolved.sellerUserId?.trim().isNotEmpty == true
      ? resolved.sellerUserId
      : seed.sellerUserId;
  final counterpart = resolved.counterpartUserId?.trim().isNotEmpty == true
      ? resolved.counterpartUserId
      : seed.counterpartUserId;

  return LiveMatch(
    key: liveMatchKey(
      articleId,
      resolved.role,
      counterpart,
      resolved.threadId,
    ),
    articleId: articleId,
    role: resolved.role,
    title: genericResolvedTitle ? seed.title : resolved.title,
    lastAt: resolved.lastAt,
    notificationIds: resolved.notificationIds,
    buyerProfileId: resolved.buyerProfileId ?? seed.buyerProfileId,
    counterpartUserId: counterpart,
    threadId: resolved.threadId,
    threadType: resolved.threadType,
    searchRequestId: resolved.searchRequestId ?? seed.searchRequestId,
    buyerUserId: resolved.buyerUserId ?? seed.buyerUserId,
    sellerUserId: sellerUserId,
    source: resolved.source ?? seed.source,
    counterpartLabel: resolved.counterpartLabel ?? seed.counterpartLabel,
    negotiationId: resolved.negotiationId ?? seed.negotiationId,
    dealId: resolved.dealId ?? seed.dealId,
    transactionId: resolved.transactionId ?? seed.transactionId,
    seedText: resolved.seedText ?? seed.seedText,
    price: resolved.price ?? seed.price,
    city: resolved.city ?? seed.city,
    photo: resolved.photo ?? seed.photo,
    photoUrls: <String>{
      ...seed.photoUrls,
      ...resolved.photoUrls,
    }.toList(),
    unreadCount: resolved.unreadCount,
  );
}

String liveInterestCorrelationKey(Map<String, dynamic> meta) => liveText(
      meta['idempotency_key'] ??
          meta['request_id'] ??
          meta['correlation_id'] ??
          meta['dedupe_key'],
    ).trim();

LiveMatch? _liveInterestedMatchFromAuthoritativeRecord({
  required Map<String, dynamic> record,
  required Map<String, dynamic> requestMeta,
  DateTime? now,
}) {
  final normalized = liveNormalizeChannelResponse(record);
  final recordMeta = <String, dynamic>{
    ...liveMap(record['meta']),
    ...liveMap(record['payload']),
  };
  final threadId = liveText(
    normalized['thread_id'] ??
        liveThreadIdFromResponse(<String, dynamic>{
          ...record,
          ...recordMeta,
        }),
  ).trim();
  if (threadId.isEmpty) return null;

  final articleId = liveText(
    record['article_id'] ??
        recordMeta['article_id'] ??
        normalized['article_id'] ??
        requestMeta['article_id'],
  ).trim();
  final buyerUserId = liveText(
    recordMeta['buyer_user_id'] ??
        normalized['buyer_user_id'] ??
        requestMeta['buyer_user_id'],
  ).trim();
  final sellerUserId = liveText(
    recordMeta['seller_user_id'] ??
        recordMeta['owner_user_id'] ??
        recordMeta['counterpart_user_id'] ??
        normalized['seller_user_id'] ??
        normalized['owner_user_id'] ??
        requestMeta['seller_user_id'] ??
        requestMeta['counterpart_user_id'],
  ).trim();
  final rawPhotos = recordMeta['photos'] ??
      recordMeta['images'] ??
      normalized['photos'] ??
      normalized['images'] ??
      requestMeta['photos'] ??
      requestMeta['images'];
  final photos = liveAttachments(rawPhotos)
      .map((item) => item.url)
      .where((url) => url.trim().isNotEmpty)
      .toList();
  final title = liveVisibleText(liveText(
    recordMeta['title'] ??
        recordMeta['product_title'] ??
        normalized['title'] ??
        requestMeta['title'],
    'Discussion produit',
  ));

  return LiveMatch(
    key: liveMatchKey(articleId, 'buyer', sellerUserId, threadId),
    articleId: articleId,
    role: 'buyer',
    title: title,
    lastAt: liveDate(
      record['sent_at'] ?? record['created_at'] ?? now ?? DateTime.now(),
    ),
    threadId: threadId,
    threadType: liveText(
      recordMeta['thread_type'] ?? requestMeta['thread_type'],
      'product_meet',
    ),
    buyerUserId: buyerUserId.isEmpty ? null : buyerUserId,
    sellerUserId: sellerUserId.isEmpty ? null : sellerUserId,
    counterpartUserId: sellerUserId.isEmpty ? null : sellerUserId,
    source: liveText(
      recordMeta['source'] ?? requestMeta['source'],
      'flutter_chat',
    ),
    counterpartLabel: liveText(
      recordMeta['seller_name'] ?? recordMeta['counterpart_name'],
    ),
    seedText: liveVisibleText(liveText(recordMeta['text'] ?? record['text'])),
    price: _flowNumber(recordMeta['price'] ?? requestMeta['price']),
    city: liveText(recordMeta['city'] ?? requestMeta['city']).trim().isEmpty
        ? null
        : liveText(recordMeta['city'] ?? requestMeta['city']).trim(),
    photo: photos.isEmpty ? null : photos.first,
    photoUrls: photos,
    unreadCount: 0,
  );
}

/// Reconstruit un Chat Meet uniquement à partir d'un enregistrement corrélé à
/// la requête « Intéressé ». Une corrélation exacte par idempotency_key permet
/// de résoudre les cartes textuelles qui ne possèdent pas encore d'article ou
/// de vendeur dans le payload local, sans risquer de sélectionner un autre fil.
LiveMatch? liveInterestedMatchFromCorrelatedRecord({
  required Map<String, dynamic> record,
  required Map<String, dynamic> requestMeta,
  DateTime? now,
}) {
  final normalized = liveNormalizeChannelResponse(record);
  final recordMeta = <String, dynamic>{
    ...liveMap(record['meta']),
    ...liveMap(record['payload']),
  };
  final expectedCorrelation = liveInterestCorrelationKey(requestMeta);
  final actualCorrelation = liveInterestCorrelationKey(<String, dynamic>{
    ...normalized,
    ...recordMeta,
  });
  if (expectedCorrelation.isEmpty || actualCorrelation != expectedCorrelation) {
    return null;
  }
  return _liveInterestedMatchFromAuthoritativeRecord(
    record: record,
    requestMeta: requestMeta,
    now: now,
  );
}

/// Fallback strict lorsqu'une ancienne fonction distante n'a pas conservé la
/// clé d'idempotence. Le service appelant ne l'utilise qu'après avoir prouvé
/// qu'un seul thread récent, dans la session courante, porte exactement le
/// texte envoyé.
LiveMatch? liveInterestedMatchFromUniqueTextRecord({
  required Map<String, dynamic> record,
  required Map<String, dynamic> requestMeta,
  required String requestText,
  DateTime? now,
}) {
  final expected = liveVisibleText(requestText).trim();
  final actual = liveVisibleText(
    liveText(record['text'] ?? liveMap(record['meta'])['text']),
  ).trim();
  if (expected.isEmpty || actual != expected) return null;
  return _liveInterestedMatchFromAuthoritativeRecord(
    record: record,
    requestMeta: requestMeta,
    now: now,
  );
}

/// Reconstruit un Match depuis un message récent déjà limité par le service à
/// la session ou aux identités WAOUH de l'utilisateur courant. Cette fonction
/// ne prouve pas seule la corrélation : le service appelant doit encore exiger
/// une identité produit exacte ou l'unicité d'un seul thread autour du clic.
LiveMatch? liveInterestedMatchFromScopedRecentRecord({
  required Map<String, dynamic> record,
  required Map<String, dynamic> requestMeta,
  DateTime? now,
}) =>
    _liveInterestedMatchFromAuthoritativeRecord(
      record: record,
      requestMeta: requestMeta,
      now: now,
    );

LiveMatch? liveSelectInterestedMatch({
  required List<LiveMatch> matches,
  required Map<String, dynamic> requestMeta,
  DateTime? now,
}) {
  final reference = now ?? DateTime.now();
  final expectedThread = liveText(requestMeta['thread_id']).trim();
  final expectedArticle = liveText(requestMeta['article_id']).trim();
  final expectedBuyer = liveText(requestMeta['buyer_user_id']).trim();
  final expectedSeller = liveText(
    requestMeta['seller_user_id'] ?? requestMeta['counterpart_user_id'],
  ).trim();

  final hasThreadIdentity = expectedThread.isNotEmpty;
  final hasArticleAndParticipant = expectedArticle.isNotEmpty &&
      (expectedBuyer.isNotEmpty || expectedSeller.isNotEmpty);
  final hasParticipantPair =
      expectedBuyer.isNotEmpty && expectedSeller.isNotEmpty;
  if (!hasThreadIdentity && !hasArticleAndParticipant && !hasParticipantPair) {
    return null;
  }

  final candidates = matches.where((match) {
    if (match.role != 'buyer') return false;
    if (reference.difference(match.lastAt).abs() >
        const Duration(minutes: 15)) {
      return false;
    }
    final thread = (match.threadId ?? '').trim();
    if (thread.isEmpty) return false;
    if (expectedThread.isNotEmpty && thread != expectedThread) return false;
    if (expectedArticle.isNotEmpty &&
        match.articleId.trim() != expectedArticle) {
      return false;
    }
    if (expectedBuyer.isNotEmpty &&
        (match.buyerUserId ?? '').trim() != expectedBuyer) {
      return false;
    }
    if (expectedSeller.isNotEmpty) {
      final seller =
          (match.sellerUserId ?? match.counterpartUserId ?? '').trim();
      if (seller != expectedSeller) return false;
    }
    return true;
  }).toList()
    ..sort((a, b) => b.lastAt.compareTo(a.lastAt));

  return candidates.isEmpty ? null : candidates.first;
}

/// Dernier recours sans identité produit : accepter seulement un unique thread
/// acheteur créé autour du clic courant. Deux threads distincts ou un résultat
/// ancien rendent la sélection volontairement ambiguë et donc nulle.
LiveMatch? liveSelectUniqueRecentInterestedMatch({
  required List<LiveMatch> matches,
  required DateTime notBefore,
  DateTime? now,
}) {
  final lowerBound = notBefore.subtract(const Duration(seconds: 10));
  final upperBound = (now ?? DateTime.now()).add(const Duration(seconds: 30));
  final candidates = matches.where((match) {
    if (match.role != 'buyer') return false;
    if (match.threadId?.trim().isNotEmpty != true) return false;
    if (match.lastAt.isBefore(lowerBound)) return false;
    if (match.lastAt.isAfter(upperBound)) return false;
    return true;
  }).toList()
    ..sort((a, b) => b.lastAt.compareTo(a.lastAt));

  final threadIds = candidates
      .map((match) => match.threadId!.trim())
      .where((threadId) => threadId.isNotEmpty)
      .toSet();
  if (threadIds.length != 1) return null;
  return candidates.first;
}
