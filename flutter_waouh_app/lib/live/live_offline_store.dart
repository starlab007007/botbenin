import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'live_models.dart';

class LiveOutboxAction {
  const LiveOutboxAction({
    required this.id,
    required this.type,
    required this.payload,
    required this.createdAt,
  });

  final String id;
  final String type;
  final Map<String, dynamic> payload;
  final DateTime createdAt;

  factory LiveOutboxAction.fromJson(Map<String, dynamic> value) => LiveOutboxAction(
        id: liveText(value['id']),
        type: liveText(value['type']),
        payload: liveMap(value['payload']),
        createdAt: liveDate(value['created_at']),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'payload': payload,
        'created_at': createdAt.toUtc().toIso8601String(),
      };
}

class LiveOfflineStore {
  static const _outboxKey = 'waouh_outbox_v1';
  SharedPreferences? _prefs;

  Future<void> initialize() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  Future<void> cacheMessages(String scope, List<LiveMessage> values) =>
      _save('messages_$scope', values.map(_messageJson).toList());

  Future<List<LiveMessage>> messages(String scope) async =>
      (await _load('messages_$scope'))
          .map(LiveMessage.fromJson)
          .toList();

  Future<void> cacheConversations(String scope, List<LiveConversation> values) =>
      _save('conversations_$scope', values.map(_conversationJson).toList());

  Future<List<LiveConversation>> conversations(String scope) async =>
      (await _load('conversations_$scope'))
          .map(LiveConversation.fromJson)
          .toList();

  Future<void> cacheStatuses(String scope, List<LiveStatus> values) =>
      _save('statuses_$scope', values.map(_statusJson).toList());

  Future<List<LiveStatus>> statuses(String scope) async =>
      (await _load('statuses_$scope')).map(LiveStatus.fromJson).toList();

  Future<void> cacheNotifications(String scope, List<LiveNotification> values) =>
      _save('notifications_$scope', values.map(_notificationJson).toList());

  Future<List<LiveNotification>> notifications(String scope) async =>
      (await _load('notifications_$scope'))
          .map(LiveNotification.fromJson)
          .toList();

  Future<List<LiveOutboxAction>> outbox() async {
    final list = await _load(_outboxKey);
    return list.map(LiveOutboxAction.fromJson).where((item) => item.id.isNotEmpty).toList();
  }

  Future<void> enqueue(String type, Map<String, dynamic> payload) async {
    final actions = await outbox();
    actions.add(LiveOutboxAction(
      id: 'outbox_${DateTime.now().microsecondsSinceEpoch}',
      type: type,
      payload: payload,
      createdAt: DateTime.now(),
    ));
    await _save(_outboxKey, actions.map((item) => item.toJson()).toList());
  }

  Future<void> removeOutbox(String id) async {
    final actions = await outbox();
    actions.removeWhere((item) => item.id == id);
    await _save(_outboxKey, actions.map((item) => item.toJson()).toList());
  }

  Future<int> pendingCount() async => (await outbox()).length;

  Future<void> _save(String key, List<Map<String, dynamic>> values) async {
    await initialize();
    final trimmed = values.length > 250 ? values.sublist(values.length - 250) : values;
    await _prefs!.setString(key, jsonEncode(trimmed));
  }

  Future<List<Map<String, dynamic>>> _load(String key) async {
    await initialize();
    try {
      final raw = jsonDecode(_prefs!.getString(key) ?? '[]');
      if (raw is! List) return const [];
      return raw.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
    } catch (_) {
      return const [];
    }
  }

  Map<String, dynamic> _messageJson(LiveMessage item) => {
        'id': item.id,
        'text': item.text,
        'created_at': item.createdAt.toUtc().toIso8601String(),
        'direction': item.direction,
        'conversation_id': item.conversationId,
        'article_id': item.articleId,
        'attachments': item.attachments.map((attachment) => attachment.toJson()).toList(),
        'meta': item.meta,
      };

  Map<String, dynamic> _conversationJson(LiveConversation item) => {
        'id': item.id,
        'updated_at': item.updatedAt.toUtc().toIso8601String(),
        'phone_number': item.phoneNumber,
        'channel': item.channel,
        'last_message': item.lastMessage,
        'user_id': item.userId,
        'state': item.archived ? 'archived' : 'open',
      };

  Map<String, dynamic> _statusJson(LiveStatus item) => {
        'id': item.id,
        'type': item.type,
        'title': item.title,
        'caption': item.caption,
        'price_fcfa': item.price,
        'location': item.location,
        'lat': item.latitude,
        'lng': item.longitude,
        'media_urls': item.mediaUrls,
        'author_name': item.authorName,
        'author_avatar_url': item.authorAvatarUrl,
        'article_id': item.articleId,
        'views_count': item.views,
        'created_at': item.createdAt.toUtc().toIso8601String(),
        'expires_at': item.expiresAt.toUtc().toIso8601String(),
      };

  Map<String, dynamic> _notificationJson(LiveNotification item) => {
        'id': item.id,
        'title': item.title,
        'content': item.body,
        'sent_at': item.createdAt.toUtc().toIso8601String(),
        'opened': item.read,
        'notification_type': item.type,
        'action_url': item.actionUrl,
        'article_id': item.articleId,
        'conversation_id': item.conversationId,
        'payload': item.payload,
      };
}
