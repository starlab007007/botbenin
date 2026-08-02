import 'dart:convert';

DateTime liveDate(dynamic value) =>
    DateTime.tryParse('${value ?? ''}') ?? DateTime.fromMillisecondsSinceEpoch(0);

String liveText(dynamic value, [String fallback = '']) =>
    value == null ? fallback : value.toString();

List<String> liveStringList(dynamic value) {
  if (value is! List) return const [];
  return value.map((item) => '$item').where((item) => item.isNotEmpty).toList();
}

Map<String, dynamic> liveMap(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : const {};

class LiveAttachment {
  const LiveAttachment({required this.url, required this.type, this.caption});

  final String url;
  final String type;
  final String? caption;

  factory LiveAttachment.fromJson(dynamic value) {
    final row = liveMap(value);
    return LiveAttachment(
      url: liveText(row['url']),
      type: liveText(row['type'], 'image/jpeg'),
      caption: row['caption']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'url': url,
        'type': type,
        if (caption != null && caption!.trim().isNotEmpty) 'caption': caption,
      };
}

class LiveMessage {
  const LiveMessage({
    required this.id,
    required this.text,
    required this.createdAt,
    required this.direction,
    this.conversationId,
    this.articleId,
    this.attachments = const [],
    this.meta = const {},
  });

  final String id;
  final String text;
  final DateTime createdAt;
  final String direction;
  final String? conversationId;
  final String? articleId;
  final List<LiveAttachment> attachments;
  final Map<String, dynamic> meta;

  bool get outgoing =>
      direction == 'in' || direction == 'inbound' || direction == 'user' || direction == 'buyer';

  factory LiveMessage.fromJson(Map<String, dynamic> row) {
    final rawAttachments = row['attachments'];
    return LiveMessage(
      id: liveText(row['id'], 'local-${DateTime.now().microsecondsSinceEpoch}'),
      text: liveText(row['text'] ?? row['content'] ?? row['message'] ?? row['body']),
      createdAt: liveDate(row['created_at']),
      direction: liveText(row['direction'] ?? row['role'], 'out'),
      conversationId: row['conversation_id']?.toString(),
      articleId: row['article_id']?.toString() ?? liveMap(row['meta'])['article_id']?.toString(),
      attachments: rawAttachments is List
          ? rawAttachments.map(LiveAttachment.fromJson).where((item) => item.url.isNotEmpty).toList()
          : const [],
      meta: liveMap(row['meta']),
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

  factory LiveConversation.fromJson(Map<String, dynamic> row) => LiveConversation(
        id: liveText(row['id']),
        updatedAt: liveDate(row['updated_at'] ?? row['last_message_at'] ?? row['created_at']),
        phoneNumber: row['phone_number']?.toString(),
        channel: row['channel']?.toString(),
        lastMessage: (row['last_message'] ?? row['last_message_text'] ?? row['preview'])?.toString(),
        userId: row['user_id']?.toString(),
        archived: row['state'] == 'archived' || row['status'] == 'archived' || row['archived'] == true,
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
    this.seedText,
    this.price,
    this.city,
    this.photo,
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
  final String? seedText;
  final num? price;
  final String? city;
  final String? photo;
  final int unreadCount;

  bool get unread => unreadCount > 0;
  String get label => price == null ? title : '$title · $price FCFA';

  factory LiveMatch.fromNotification(Map<String, dynamic> row) {
    final payload = liveMap(row['payload']);
    final articleId = liveText(row['article_id'] ?? payload['article_id']);
    final notificationType = liveText(row['notification_type'] ?? row['type']);
    final role = payload['recipient'] == 'seller' ||
            notificationType == 'match_seller' ||
            notificationType == 'new_buyer'
        ? 'seller'
        : 'buyer';
    final counterpart = (payload['counterpart_user_id'] ?? payload['buyer_user_id'])?.toString();
    final key = liveMatchKey(articleId, role, role == 'seller' ? counterpart : null);
    final photos = liveStringList(row['photos']).isNotEmpty
        ? liveStringList(row['photos'])
        : liveStringList(payload['photos']);
    final read = row['opened'] == true || row['read_at'] != null;
    return LiveMatch(
      key: key,
      articleId: articleId,
      role: role,
      title: liveText(payload['title'], 'Annonce'),
      lastAt: liveDate(row['sent_at'] ?? row['created_at']),
      notificationIds: row['id'] == null ? const [] : [liveText(row['id'])],
      buyerProfileId: payload['buyer_profile_id']?.toString(),
      counterpartUserId: counterpart,
      seedText: payload['text']?.toString(),
      price: payload['price'] is num ? payload['price'] as num : num.tryParse('${payload['price'] ?? ''}'),
      city: payload['city']?.toString(),
      photo: photos.isNotEmpty ? photos.first : payload['image_url']?.toString(),
      unreadCount: read ? 0 : 1,
    );
  }

  LiveMatch merge(LiveMatch other) {
    final newer = other.lastAt.isAfter(lastAt) ? other : this;
    final ids = <String>{...notificationIds, ...other.notificationIds}.toList();
    return LiveMatch(
      key: key,
      articleId: articleId,
      role: role,
      title: newer.title,
      lastAt: newer.lastAt,
      notificationIds: ids,
      buyerProfileId: newer.buyerProfileId ?? buyerProfileId,
      counterpartUserId: newer.counterpartUserId ?? counterpartUserId,
      seedText: newer.seedText ?? seedText,
      price: newer.price ?? price,
      city: newer.city ?? city,
      photo: newer.photo ?? photo,
      unreadCount: unreadCount + other.unreadCount,
    );
  }
}

String liveMatchKey(String articleId, String role, String? counterpartUserId) {
  final suffix = role == 'seller' && counterpartUserId != null && counterpartUserId.isNotEmpty
      ? '_$counterpartUserId'
      : '';
  return 'art_${articleId}_${role}$suffix';
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
      price: row['price_fcfa'] is num ? row['price_fcfa'] as num : num.tryParse('${row['price_fcfa'] ?? row['price'] ?? ''}'),
      location: row['location']?.toString(),
      latitude: (row['lat'] as num?)?.toDouble(),
      longitude: (row['lng'] as num?)?.toDouble(),
      mediaUrls: media.isNotEmpty ? media : (fallback == null || fallback.isEmpty ? const [] : [fallback]),
      authorName: row['author_name']?.toString(),
      authorAvatarUrl: row['author_avatar_url']?.toString(),
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
  final Map<String, dynamic> payload;

  factory LiveNotification.fromJson(Map<String, dynamic> row) {
    final payload = liveMap(row['payload'] ?? row['metadata']);
    return LiveNotification(
      id: liveText(row['id']),
      title: liveText(row['title'] ?? row['template'], 'Notification'),
      body: liveText(row['content'] ?? row['body'] ?? row['message'] ?? payload['message'] ?? payload['text']),
      createdAt: liveDate(row['sent_at'] ?? row['created_at']),
      read: row['opened'] == true || row['read_at'] != null || row['read'] == true,
      type: (row['notification_type'] ?? row['type'] ?? row['template'])?.toString(),
      actionUrl: (row['action_url'] ?? payload['action_url'])?.toString(),
      articleId: (row['article_id'] ?? payload['article_id'])?.toString(),
      conversationId: (row['conversation_id'] ?? payload['conversation_id'])?.toString(),
      payload: payload,
    );
  }

  bool get isMatch =>
      articleId != null &&
      const {'match', 'match_buyer', 'match_seller', 'new_buyer', 'radar_match'}
          .contains(type);
}

String liveEncodeSet(Set<String> values) => jsonEncode(values.toList());
Set<String> liveDecodeSet(String? value) {
  try {
    final decoded = jsonDecode(value ?? '[]');
    return decoded is List ? decoded.map((item) => '$item').toSet() : <String>{};
  } catch (_) {
    return <String>{};
  }
}
