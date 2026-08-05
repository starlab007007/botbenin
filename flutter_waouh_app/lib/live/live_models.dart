import 'dart:convert';

const _waouhSupabaseOrigin = 'https://mvynepqulhflxtyymtzs.supabase.co';

String liveVisibleText(dynamic value) {
  var text = liveText(value);
  text = text.replaceAll(
    RegExp(r'\[(?:E2E|TEST|TRACE)-[A-Za-z0-9_-]+\]\s*', caseSensitive: false),
    '',
  );
  return text.replaceAll(RegExp(r'[ \t]+\n'), '\n').trim();
}

String _unwrapLiveImageUrl(String input) {
  var value = input.trim().replaceAll(r'\/', '/').replaceAll('&amp;', '&');
  final markdown = RegExp(r'!?\[[^\]]*\]\(([^)\s]+)').firstMatch(value);
  if (markdown != null) value = markdown.group(1)!;
  final html = RegExp(
    r'''(?:src|href)\s*=\s*["']([^"']+)["']''',
    caseSensitive: false,
  ).firstMatch(value);
  if (html != null) value = html.group(1)!;
  final css = RegExp(r'''^url\(["']?(.+?)["']?\)$''', caseSensitive: false)
      .firstMatch(value);
  if (css != null) value = css.group(1)!;
  while (value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")) ||
          (value.startsWith('`') && value.endsWith('`')))) {
    value = value.substring(1, value.length - 1).trim();
  }
  if (RegExp(r'^https?%3a%2f%2f', caseSensitive: false).hasMatch(value)) {
    try {
      value = Uri.decodeFull(value);
    } catch (_) {}
  }
  return value;
}

String liveImageUrl(dynamic input, {String? bucket}) {
  var value = _unwrapLiveImageUrl(liveText(input));
  if (value.isEmpty || value == 'null') return '';
  if (value.startsWith('//')) value = 'https:$value';

  final hostOnly = RegExp(
    r'^(?:[a-z0-9-]+\.)+(?:supabase\.co|supabase\.in)/',
    caseSensitive: false,
  );
  if (hostOnly.hasMatch(value)) value = 'https://$value';

  if (value.startsWith('/storage/v1/')) {
    value = '$_waouhSupabaseOrigin$value';
  } else if (value.startsWith('storage/v1/')) {
    value = '$_waouhSupabaseOrigin/$value';
  }

  final cleanBucket =
      liveText(bucket).trim().replaceAll(RegExp(r'^/+|/+$'), '');
  final cleanPath = value.replaceAll(RegExp(r'^/+'), '');
  if (cleanBucket.isNotEmpty &&
      !value.startsWith('http://') &&
      !value.startsWith('https://') &&
      !value.startsWith('data:') &&
      !value.startsWith('file:') &&
      !value.startsWith('blob:')) {
    final path = cleanPath.startsWith('$cleanBucket/')
        ? cleanPath.substring(cleanBucket.length + 1)
        : cleanPath;
    value = '$_waouhSupabaseOrigin/storage/v1/object/public/'
        '$cleanBucket/${_encodeStoragePath(path)}';
  } else if (RegExp(r'^(?:waouh-media|waouh-uploads)/', caseSensitive: false)
      .hasMatch(cleanPath)) {
    final slash = cleanPath.indexOf('/');
    final foundBucket = cleanPath.substring(0, slash);
    final path = cleanPath.substring(slash + 1);
    value = '$_waouhSupabaseOrigin/storage/v1/object/public/'
        '$foundBucket/${_encodeStoragePath(path)}';
  }

  value = value.replaceAllMapped(
    RegExp(
      r'/storage/v1/object/sign/(waouh-media|waouh-uploads)/',
      caseSensitive: false,
    ),
    (match) => '/storage/v1/object/public/${match.group(1)}/',
  );
  if (value.contains('/storage/v1/object/public/waouh-')) {
    value = value.split('?').first;
  }
  if (value.startsWith('http://mvynepqulhflxtyymtzs.supabase.co/')) {
    value = value.replaceFirst('http://', 'https://');
  }
  return value;
}

String _encodeStoragePath(String path) =>
    path.split('/').where((segment) => segment.isNotEmpty).map((segment) {
      try {
        return Uri.encodeComponent(Uri.decodeComponent(segment));
      } catch (_) {
        return Uri.encodeComponent(segment);
      }
    }).join('/');

DateTime liveDate(dynamic value) =>
    DateTime.tryParse('${value ?? ''}') ??
    DateTime.fromMillisecondsSinceEpoch(0);

String liveText(dynamic value, [String fallback = '']) =>
    value == null ? fallback : value.toString();

List<String> liveStringList(dynamic value) {
  final decoded = _liveJsonValue(value);
  if (decoded is! List) return const [];
  return decoded
      .map((item) => liveText(item).trim())
      .where((item) => item.isNotEmpty)
      .toList();
}

Map<String, dynamic> liveMap(dynamic value) {
  final decoded = _liveJsonValue(value);
  return decoded is Map ? Map<String, dynamic>.from(decoded) : const {};
}

String? liveExtractThreadId(dynamic value, [int depth = 0]) {
  if (value == null || depth > 6) return null;
  final decoded = _liveJsonValue(value);
  if (decoded is String || decoded is num) {
    final text = liveText(decoded).trim();
    return text.isEmpty || text == 'null' ? null : text;
  }
  if (decoded is List) {
    for (final item in decoded) {
      final found = liveExtractThreadId(item, depth + 1);
      if (found != null) return found;
    }
    return null;
  }
  if (decoded is Map) {
    const directKeys = <String>[
      'thread_id',
      'threadId',
      'resolved_thread_id',
      'resolvedThreadId',
      'conversation_thread_id',
    ];
    for (final key in directKeys) {
      final found = liveExtractThreadId(decoded[key], depth + 1);
      if (found != null) return found;
    }
    const nestedKeys = <String>[
      'meta',
      'payload',
      'data',
      'result',
      'thread',
      'conversation_scope',
      'conversationScope',
    ];
    for (final key in nestedKeys) {
      final found = liveExtractThreadId(decoded[key], depth + 1);
      if (found != null) return found;
    }
  }
  return null;
}

dynamic _liveJsonValue(dynamic value) {
  if (value is! String) return value;
  final text = value.trim();
  if (text.isEmpty ||
      !(text.startsWith('[') || text.startsWith('{') || text.startsWith('"'))) {
    return value;
  }
  try {
    return jsonDecode(text);
  } catch (_) {
    return value;
  }
}

String _liveAttachmentUrl(dynamic value, [int depth = 0]) {
  if (value == null || depth > 5) return '';
  final decoded = _liveJsonValue(value);
  if (decoded is String) {
    return liveImageUrl(decoded);
  }
  if (decoded is List) {
    for (final item in decoded) {
      final url = _liveAttachmentUrl(item, depth + 1);
      if (url.isNotEmpty) return url;
    }
    return '';
  }
  if (decoded is Map) {
    const directKeys = [
      'url',
      'publicUrl',
      'public_url',
      'imageUrl',
      'image_url',
      'photoUrl',
      'photo_url',
      'thumbnailUrl',
      'thumbnail_url',
      'cover_photo',
      'mediaUrl',
      'media_url',
      'downloadUrl',
      'download_url',
      'signedUrl',
      'signed_url',
      'src',
      'uri',
    ];
    for (final key in directKeys) {
      final url = _liveAttachmentUrl(decoded[key], depth + 1);
      if (url.isNotEmpty) return url;
    }
    const nestedKeys = ['image', 'photo', 'thumbnail', 'file', 'media', 'data'];
    for (final key in nestedKeys) {
      final url = _liveAttachmentUrl(decoded[key], depth + 1);
      if (url.isNotEmpty) return url;
    }
    final bucket = liveText(
      decoded['bucket'] ?? decoded['bucket_id'] ?? decoded['storage_bucket'],
    ).trim();
    for (final key in ['path', 'storage_path', 'object_path']) {
      final rawPath = decoded[key];
      final url = bucket.isEmpty
          ? _liveAttachmentUrl(rawPath, depth + 1)
          : liveImageUrl(rawPath, bucket: bucket);
      if (url.isNotEmpty) return url;
    }
  }
  return '';
}

String _liveAttachmentType(Map<String, dynamic> row, String url) {
  final explicit = liveText(
    row['type'] ?? row['mime'] ?? row['mime_type'] ?? row['content_type'],
  ).trim();
  if (explicit.contains('/')) return explicit;
  final dataType =
      RegExp(r'^data:([^;,]+)', caseSensitive: false).firstMatch(url)?.group(1);
  if (dataType != null) return dataType;
  final path = Uri.tryParse(url)?.path.toLowerCase() ?? url.toLowerCase();
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.heic') || path.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
}

class LiveAttachment {
  const LiveAttachment({required this.url, required this.type, this.caption});

  final String url;
  final String type;
  final String? caption;

  factory LiveAttachment.fromJson(dynamic value) {
    final row = liveMap(value);
    final url = _liveAttachmentUrl(value);
    return LiveAttachment(
      url: url,
      type: _liveAttachmentType(row, url),
      caption: (row['caption'] ?? row['title'] ?? row['alt'] ?? row['name'])
          ?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'url': url,
        'type': type,
        if (caption != null && caption!.trim().isNotEmpty) 'caption': caption,
      };
}

List<LiveAttachment> liveAttachments(dynamic value) {
  final result = <LiveAttachment>[];
  final seen = <String>{};
  void collect(dynamic value) {
    final decoded = _liveJsonValue(value);
    if (decoded is List) {
      for (final item in decoded) {
        collect(item);
      }
      return;
    }
    if (decoded == null) {
      return;
    }
    final item = decoded;
    final attachment = LiveAttachment.fromJson(item);
    if (attachment.url.isEmpty || !seen.add(attachment.url)) {
      return;
    }
    result.add(attachment);
  }

  collect(value);
  return result;
}

class LiveMessage {
  const LiveMessage({
    required this.id,
    required this.text,
    required this.createdAt,
    required this.direction,
    this.conversationId,
    this.threadId,
    this.threadType = 'product_meet',
    this.searchRequestId,
    this.articleId,
    this.attachments = const [],
    this.meta = const {},
  });

  final String id;
  final String text;
  final DateTime createdAt;
  final String direction;
  final String? conversationId;
  final String? threadId;
  final String threadType;
  final String? searchRequestId;
  final String? articleId;
  final List<LiveAttachment> attachments;
  final Map<String, dynamic> meta;

  bool get outgoing =>
      direction == 'in' ||
      direction == 'inbound' ||
      direction == 'user' ||
      direction == 'buyer';

  factory LiveMessage.fromJson(Map<String, dynamic> row) {
    final meta = <String, dynamic>{...liveMap(row['meta'])};
    // Certaines fonctions renvoient les données smart au premier niveau alors
    // que l'historique les conserve dans meta. Les fusionner ici garantit le
    // même rendu dans le chat principal, les matchs, l'opérateur et le Radar.
    for (final key in [
      'actions',
      'products',
      'articles',
      'items',
      'results',
      'matches',
      'offers',
      'workflow',
      'workflow_state',
      'intent',
      'transaction_id',
      'negotiation_id',
      'deal_id',
      'role',
      'source',
      'thread_id',
      'thread_type',
      'search_request_id',
      'search_thread_id',
      'article_id',
      'buyer_user_id',
      'seller_user_id',
      'counterpart_user_id',
      'status_id',
      'status_type',
      'radar_item_id',
      'radar_signal_id',
      'radar_source',
      'radar_intent',
      'idempotency_key',
      'request_id',
      'correlation_id',
      'dedupe_key',
      'event_id',
    ]) {
      if (!meta.containsKey(key) && row[key] != null) meta[key] = row[key];
    }
    final attachments = <LiveAttachment>[];
    final seenUrls = <String>{};
    void addAttachments(dynamic value) {
      for (final attachment in liveAttachments(value)) {
        if (seenUrls.add(attachment.url)) attachments.add(attachment);
      }
    }

    for (final value in [
      row['attachments'],
      row['photos'],
      row['images'],
      row['media'],
      row['image_url'],
      row['photo_url'],
      meta['attachments'],
      meta['photos'],
      meta['images'],
      meta['media'],
      meta['image_url'],
      meta['photo_url'],
    ]) {
      addAttachments(value);
    }
    // Les réponses Smart UI peuvent encapsuler les photos dans chaque produit
    // plutôt qu'au niveau du message. Elles doivent tout de même être
    // disponibles au rendu, à l'historique et aux fenêtres de match.
    for (final key in [
      'products',
      'articles',
      'items',
      'results',
      'matches',
      'offers'
    ]) {
      final rows = meta[key];
      if (rows is! List) continue;
      for (final raw in rows.whereType<Map>()) {
        for (final imageValue in [
          raw['photos'],
          raw['images'],
          raw['media'],
          raw['photo'],
          raw['photo_url'],
          raw['image'],
          raw['image_url'],
          raw['thumbnail_url'],
        ]) {
          addAttachments(imageValue);
        }
      }
    }
    return LiveMessage(
      id: liveText(row['id'], 'local-${DateTime.now().microsecondsSinceEpoch}'),
      text: liveVisibleText(
        row['text'] ?? row['content'] ?? row['message'] ?? row['body'],
      ),
      createdAt: liveDate(row['created_at']),
      direction: liveText(row['direction'] ?? row['role'], 'out'),
      conversationId: row['conversation_id']?.toString(),
      threadId: liveExtractThreadId(<String, dynamic>{...row, 'meta': meta}),
      threadType: liveText(
        row['thread_type'] ?? meta['thread_type'],
        'product_meet',
      ),
      searchRequestId:
          (row['search_request_id'] ?? meta['search_request_id'])?.toString(),
      articleId:
          row['article_id']?.toString() ?? meta['article_id']?.toString(),
      attachments: attachments,
      meta: meta,
    );
  }
}

class LiveConversation {
  const LiveConversation({
    required this.id,
    required this.updatedAt,
    this.phoneNumber,
    this.channel,
    this.lastMessage,
    this.userId,
    this.archived = false,
  });

  final String id;
  final DateTime updatedAt;
  final String? phoneNumber;
  final String? channel;
  final String? lastMessage;
  final String? userId;
  final bool archived;

  factory LiveConversation.fromJson(Map<String, dynamic> row) =>
      LiveConversation(
        id: liveText(row['id']),
        updatedAt: liveDate(
            row['updated_at'] ?? row['last_message_at'] ?? row['created_at']),
        phoneNumber: row['phone_number']?.toString(),
        channel: row['channel']?.toString(),
        lastMessage:
            (row['last_message'] ?? row['last_message_text'] ?? row['preview'])
                ?.toString(),
        userId: row['user_id']?.toString(),
        archived: row['state'] == 'archived' ||
            row['status'] == 'archived' ||
            row['archived'] == true,
      );
}

class LiveMatch {
  const LiveMatch({
    required this.key,
    required this.articleId,
    required this.role,
    required this.title,
    required this.lastAt,
    this.notificationIds = const [],
    this.buyerProfileId,
    this.counterpartUserId,
    this.threadId,
    this.threadType = 'product_meet',
    this.searchRequestId,
    this.buyerUserId,
    this.sellerUserId,
    this.source,
    this.counterpartLabel,
    this.negotiationId,
    this.dealId,
    this.transactionId,
    this.seedText,
    this.price,
    this.city,
    this.photo,
    this.photoUrls = const [],
    this.unreadCount = 0,
  });

  final String key;
  final String articleId;
  final String role;
  final String title;
  final DateTime lastAt;
  final List<String> notificationIds;
  final String? buyerProfileId;
  final String? counterpartUserId;
  final String? threadId;
  final String threadType;
  final String? searchRequestId;
  final String? buyerUserId;
  final String? sellerUserId;
  final String? source;
  final String? counterpartLabel;
  final String? negotiationId;
  final String? dealId;
  final String? transactionId;
  final String? seedText;
  final num? price;
  final String? city;
  final String? photo;
  final List<String> photoUrls;
  final int unreadCount;

  bool get unread => unreadCount > 0;
  bool get isSearch => threadType == 'search';
  String get label => price == null ? title : '$title · $price FCFA';
  String get participantLabel {
    final value = counterpartLabel?.trim() ?? '';
    if (value.isNotEmpty) return value;
    final id = counterpartUserId?.trim() ?? '';
    if (id.isEmpty) return role == 'seller' ? 'Acheteur' : 'Vendeur';
    final short = id.length <= 6 ? id : id.substring(0, 6);
    return '${role == 'seller' ? 'Acheteur' : 'Vendeur'} · $short';
  }

  factory LiveMatch.fromNotification(Map<String, dynamic> row) {
    final payload = liveMap(row['payload']);
    final notificationType = liveText(row['notification_type'] ?? row['type']);
    final threadType = liveText(
      payload['thread_type'],
      notificationType == 'search_thread' ? 'search' : 'product_meet',
    );
    final searchRequestId = payload['search_request_id']?.toString();
    final articleId = liveText(
      row['article_id'] ?? payload['article_id'] ?? searchRequestId,
    );
    final role = payload['recipient'] == 'seller' ||
            payload['role'] == 'seller' ||
            payload['target_role'] == 'seller' ||
            notificationType == 'match_seller' ||
            notificationType == 'new_buyer' ||
            notificationType == 'buyer_interested'
        ? 'seller'
        : 'buyer';
    final threadId = (row['thread_id'] ?? payload['thread_id'])?.toString();
    final buyerUserId = payload['buyer_user_id']?.toString();
    final sellerUserId = payload['seller_user_id']?.toString();
    final counterpart = role == 'seller'
        ? (buyerUserId ?? payload['counterpart_user_id'])?.toString()
        : (sellerUserId ?? payload['counterpart_user_id'])?.toString();
    final key = liveMatchKey(articleId, role, counterpart, threadId);
    final rowPhotos =
        liveAttachments(row['photos']).map((item) => item.url).toList();
    final payloadPhotos =
        liveAttachments(payload['photos']).map((item) => item.url).toList();
    final photos = rowPhotos.isNotEmpty ? rowPhotos : payloadPhotos;
    final read = row['opened'] == true || row['read_at'] != null;
    return LiveMatch(
      key: key,
      articleId: articleId,
      role: role,
      title: liveVisibleText(liveText(payload['title'], 'Annonce')),
      lastAt: liveDate(row['sent_at'] ?? row['created_at']),
      notificationIds: row['id'] == null ? const [] : [liveText(row['id'])],
      buyerProfileId: payload['buyer_profile_id']?.toString(),
      counterpartUserId: counterpart,
      threadId: threadId,
      threadType: threadType,
      searchRequestId: searchRequestId,
      buyerUserId: buyerUserId,
      sellerUserId: sellerUserId,
      source: payload['source']?.toString(),
      counterpartLabel: (payload['counterpart_name'] ??
              payload['buyer_name'] ??
              payload['seller_name'])
          ?.toString(),
      negotiationId:
          (payload['negotiation_id'] ?? payload['neg_id'])?.toString(),
      dealId: payload['deal_id']?.toString(),
      transactionId: payload['transaction_id']?.toString(),
      seedText:
          payload['text'] == null ? null : liveVisibleText(payload['text']),
      price: payload['price'] is num
          ? payload['price'] as num
          : num.tryParse('${payload['price'] ?? ''}'),
      city: payload['city']?.toString(),
      photo:
          photos.isNotEmpty ? photos.first : liveImageUrl(payload['image_url']),
      photoUrls: photos,
      unreadCount: read ? 0 : 1,
    );
  }

  LiveMatch withAuthoritativeThread(String value) {
    final thread = value.trim();
    if (thread.isEmpty || thread == threadId) return this;
    return LiveMatch(
      key: liveMatchKey(articleId, role, counterpartUserId, thread),
      articleId: articleId,
      role: role,
      title: title,
      lastAt: lastAt,
      notificationIds: notificationIds,
      buyerProfileId: buyerProfileId,
      counterpartUserId: counterpartUserId,
      threadId: thread,
      threadType: threadType,
      searchRequestId: searchRequestId,
      buyerUserId: buyerUserId,
      sellerUserId: sellerUserId,
      source: source,
      counterpartLabel: counterpartLabel,
      negotiationId: negotiationId,
      dealId: dealId,
      transactionId: transactionId,
      seedText: seedText,
      price: price,
      city: city,
      photo: photo,
      photoUrls: photoUrls,
      unreadCount: unreadCount,
    );
  }

  LiveMatch merge(LiveMatch other) {
    final newer = other.lastAt.isAfter(lastAt) ? other : this;
    final resolvedTitle =
        newer.title == 'Annonce' && title != 'Annonce' ? title : newer.title;
    final ids = <String>{...notificationIds, ...other.notificationIds}.toList();
    return LiveMatch(
      key: key,
      articleId: articleId,
      role: role,
      title: resolvedTitle,
      lastAt: newer.lastAt,
      notificationIds: ids,
      buyerProfileId: newer.buyerProfileId ?? buyerProfileId,
      counterpartUserId: newer.counterpartUserId ?? counterpartUserId,
      threadId: newer.threadId ?? threadId,
      threadType: newer.threadType,
      searchRequestId: newer.searchRequestId ?? searchRequestId,
      buyerUserId: newer.buyerUserId ?? buyerUserId,
      sellerUserId: newer.sellerUserId ?? sellerUserId,
      source: newer.source ?? source,
      counterpartLabel: newer.counterpartLabel ?? counterpartLabel,
      negotiationId: newer.negotiationId ?? negotiationId,
      dealId: newer.dealId ?? dealId,
      transactionId: newer.transactionId ?? transactionId,
      seedText: newer.seedText ?? seedText,
      price: newer.price ?? price,
      city: newer.city ?? city,
      photo: newer.photo ?? photo,
      photoUrls: <String>{...photoUrls, ...other.photoUrls}.toList(),
      unreadCount: unreadCount + other.unreadCount,
    );
  }
}

String liveMatchKey(
  String articleId,
  String role,
  String? counterpartUserId, [
  String? threadId,
]) {
  final article = articleId.trim();
  final normalizedRole =
      role.trim().isEmpty ? 'buyer' : role.trim().toLowerCase();
  final counterpart = counterpartUserId?.trim() ?? '';

  // Parité Web : une fenêtre est identifiée par
  // 1 article × 1 rôle × 1 interlocuteur. Le thread_id enrichit le fil
  // sans remplacer cette identité métier ni provoquer un second écran.
  if (article.isNotEmpty) {
    return 'art_${article}_${normalizedRole}_${counterpart.isEmpty ? 'any' : counterpart}';
  }

  // Compatibilité pour les anciens liens qui ne portent qu'un thread_id.
  final thread = threadId?.trim() ?? '';
  if (thread.isNotEmpty) return 'meet_$thread';
  return 'art_none_${normalizedRole}_${counterpart.isEmpty ? 'any' : counterpart}';
}

String liveMatchScopeKey(LiveMatch match) {
  final counterpart = match.counterpartUserId?.trim() ?? '';
  return 'scope_${match.articleId}_${match.role}_${counterpart.isEmpty ? 'any' : counterpart}';
}

String _liveMessageCounterpart(LiveMessage message, String role) {
  final meta = message.meta;
  final value = role == 'seller'
      ? meta['buyer_user_id'] ?? meta['counterpart_user_id']
      : meta['seller_user_id'] ?? meta['counterpart_user_id'];
  return liveText(value).trim();
}

bool liveMessageBelongsToMatch(
  LiveMessage message,
  LiveMatch match, {
  String? authoritativeThreadId,
}) {
  final expectedThread = (authoritativeThreadId ?? match.threadId ?? '').trim();
  final messageThread = (message.threadId ?? '').trim();
  if (expectedThread.isNotEmpty && messageThread == expectedThread) return true;
  if (expectedThread.isNotEmpty &&
      messageThread.isNotEmpty &&
      messageThread != expectedThread) {
    return false;
  }

  final expectedArticle = match.isSearch ? '' : match.articleId.trim();
  final messageArticle =
      (message.articleId ?? liveText(message.meta['article_id'])).trim();
  if (expectedArticle.isNotEmpty && messageArticle != expectedArticle) {
    return false;
  }

  final expectedCounterpart = match.counterpartUserId?.trim() ?? '';
  final messageCounterpart = _liveMessageCounterpart(message, match.role);
  if (expectedCounterpart.isNotEmpty &&
      messageCounterpart.isNotEmpty &&
      messageCounterpart != expectedCounterpart) {
    return false;
  }
  return expectedArticle.isNotEmpty || expectedThread.isNotEmpty;
}

class LiveStatus {
  const LiveStatus({
    required this.id,
    required this.type,
    required this.title,
    required this.createdAt,
    required this.expiresAt,
    this.caption,
    this.price,
    this.location,
    this.latitude,
    this.longitude,
    this.mediaUrls = const [],
    this.authorName,
    this.authorAvatarUrl,
    this.authorUserId,
    this.articleId,
    this.views = 0,
  });

  final String id;
  final String type;
  final String title;
  final DateTime createdAt;
  final DateTime expiresAt;
  final String? caption;
  final num? price;
  final String? location;
  final double? latitude;
  final double? longitude;
  final List<String> mediaUrls;
  final String? authorName;
  final String? authorAvatarUrl;
  final String? authorUserId;
  final String? articleId;
  final int views;

  bool get active => expiresAt.isAfter(DateTime.now());

  factory LiveStatus.fromJson(Map<String, dynamic> row) {
    final media = liveStringList(row['media_urls']);
    final fallback = row['media_url']?.toString();
    return LiveStatus(
      id: liveText(row['id']),
      type: liveText(row['type'], 'sell'),
      title: liveText(row['title']),
      createdAt: liveDate(row['created_at']),
      expiresAt: liveDate(row['expires_at']),
      caption: row['caption']?.toString(),
      price: row['price_fcfa'] is num
          ? row['price_fcfa'] as num
          : num.tryParse('${row['price_fcfa'] ?? row['price'] ?? ''}'),
      location: row['location']?.toString(),
      latitude: (row['lat'] as num?)?.toDouble(),
      longitude: (row['lng'] as num?)?.toDouble(),
      mediaUrls: media.isNotEmpty
          ? media
          : (fallback == null || fallback.isEmpty ? const [] : [fallback]),
      authorName: row['author_name']?.toString(),
      authorAvatarUrl: row['author_avatar_url']?.toString(),
      authorUserId: row['user_id']?.toString(),
      articleId: row['article_id']?.toString(),
      views: int.tryParse('${row['views_count'] ?? row['views'] ?? 0}') ?? 0,
    );
  }
}

class LiveNotification {
  const LiveNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.createdAt,
    this.read = false,
    this.type,
    this.actionUrl,
    this.articleId,
    this.conversationId,
    this.threadId,
    this.payload = const {},
  });

  final String id;
  final String title;
  final String body;
  final DateTime createdAt;
  final bool read;
  final String? type;
  final String? actionUrl;
  final String? articleId;
  final String? conversationId;
  final String? threadId;
  final Map<String, dynamic> payload;

  factory LiveNotification.fromJson(Map<String, dynamic> row) {
    final payload = liveMap(row['payload'] ?? row['metadata']);
    return LiveNotification(
      id: liveText(row['id']),
      title: liveText(row['title'] ?? row['template'], 'Notification'),
      body: liveText(row['content'] ??
          row['body'] ??
          row['message'] ??
          payload['message'] ??
          payload['text']),
      createdAt: liveDate(row['sent_at'] ?? row['created_at']),
      read: row['opened'] == true ||
          row['read_at'] != null ||
          row['read'] == true,
      type: (row['notification_type'] ?? row['type'] ?? row['template'])
          ?.toString(),
      actionUrl: (row['action_url'] ?? payload['action_url'])?.toString(),
      articleId: (row['article_id'] ?? payload['article_id'])?.toString(),
      conversationId:
          (row['conversation_id'] ?? payload['conversation_id'])?.toString(),
      threadId: (row['thread_id'] ?? payload['thread_id'])?.toString(),
      payload: payload,
    );
  }

  bool get isMatch {
    final thread = threadId?.trim() ?? '';
    final threadType = liveText(payload['thread_type']).toLowerCase();
    final notificationType = liveText(type).toLowerCase();
    const matchTypes = {
      'match',
      'match_buyer',
      'match_seller',
      'new_buyer',
      'radar_match',
      'negotiation_open',
      'deal_created',
      'deal_accepted',
      'deal_seller',
      'deal_buyer',
      'deal_assigned',
      'deal_eta_updated',
      'deal_picked_up',
      'deal_delivered',
      'deal_payment_request',
      'deal_paid',
      'deal_cancelled',
      'payment_link',
      'contact_exchange',
      'search_thread',
      'interested',
      'interest_created',
      'buyer_interested',
      'status_interest',
    };
    if (thread.isNotEmpty &&
        (threadType == 'search' ||
            threadType == 'product_meet' ||
            matchTypes.contains(notificationType))) {
      return true;
    }
    return articleId?.trim().isNotEmpty == true &&
        matchTypes.contains(notificationType);
  }
}

String liveEncodeSet(Set<String> values) => jsonEncode(values.toList());
Set<String> liveDecodeSet(String? value) {
  try {
    final decoded = jsonDecode(value ?? '[]');
    return decoded is List
        ? decoded.map((item) => '$item').toSet()
        : <String>{};
  } catch (_) {
    return <String>{};
  }
}
