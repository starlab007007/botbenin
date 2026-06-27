import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

import '../main.dart' as legacy;
import 'live_chat_service.dart';
import 'live_connectivity.dart';
import 'live_location.dart';
import 'live_media.dart';
import 'live_models.dart';
import 'live_notification_service.dart';
import 'live_offline_store.dart';
import 'live_session.dart';
import 'live_status_service.dart';

class LiveWaouhController extends ChangeNotifier {
  LiveWaouhController(this.auth)
      : session = LiveSessionStore(),
        location = LiveLocationService() {
    auth.addListener(_onAuthChange);
    chat = LiveChatService(legacy.supabase, session);
    media = LiveMediaService(legacy.supabase);
    status = LiveStatusService(legacy.supabase, media);
    notifications = LiveNotificationService(chat, session);
    offline = LiveOfflineStore();
    connectivity = LiveConnectivity(_onConnectivityChanged);
  }

  final legacy.AuthController auth;
  final LiveSessionStore session;
  final LiveLocationService location;
  late final LiveChatService chat;
  late final LiveMediaService media;
  late final LiveStatusService status;
  late final LiveNotificationService notifications;
  late final LiveOfflineStore offline;
  late final LiveConnectivity connectivity;

  LiveLocation _position = const LiveLocation();
  String? _composerSeed;
  Map<String, dynamic> _composerMeta = const {};
  String? error;
  bool busy = false;
  bool syncing = false;
  int pendingActions = 0;

  LiveLocation get position => _position;
  bool get isOnline => connectivity.online;

  Future<void> initialize() async {
    await session.initialize();
    await offline.initialize();
    await connectivity.initialize();
    if (auth.signedIn) await session.clearGuestMessageCount();
    pendingActions = await offline.pendingCount();
    if (isOnline && pendingActions > 0) await syncPending();
    notifyListeners();
  }

  Future<void> setCity(String city) async {
    await session.setCity(city);
    notifyListeners();
  }

  Future<String> get city => session.city;

  Future<void> useDeviceLocation() async {
    _position = await location.requestCurrent();
    notifyListeners();
  }

  Future<LiveAttachment> uploadChatImage(XFile file) async {
    final sid = await session.sessionId;
    return media.prepareImage(
      file: file,
      bucket: 'waouh-uploads',
      folder: 'web/$sid',
      online: isOnline,
    );
  }

  Future<void> startNewChat() async {
    await session.startNewThread();
    _composerSeed = null;
    _composerMeta = const {};
    notifyListeners();
  }

  void setComposerSeed(String value, {Map<String, dynamic> meta = const {}}) {
    _composerSeed = value;
    _composerMeta = Map<String, dynamic>.from(meta);
    notifyListeners();
  }

  String? takeComposerSeed() {
    final value = _composerSeed;
    _composerSeed = null;
    return value;
  }

  Map<String, dynamic> takeComposerMeta() {
    final value = Map<String, dynamic>.from(_composerMeta);
    _composerMeta = const {};
    return value;
  }

  Stream<List<LiveMessage>> mainMessages() => _poll(
        _loadMainMessages,
        const Duration(seconds: 4),
      );

  Stream<List<LiveConversation>> conversations({bool archived = false}) => _poll(
        () => _loadConversations(archived),
        const Duration(seconds: 5),
      );

  Stream<List<LiveMessage>> conversationMessages(String conversationId) => _poll(
        () => _loadConversationMessages(conversationId),
        const Duration(seconds: 4),
      );

  Stream<List<LiveMatch>> matches({bool archived = false}) => _poll(
        () => notifications.loadMatches(auth.user?.id, archived: archived),
        const Duration(seconds: 5),
      );

  Stream<List<LiveStatus>> statuses({String? type}) => _poll(
        () => _loadStatuses(type),
        const Duration(seconds: 5),
      );

  Stream<List<LiveNotification>> notificationItems() => _poll(
        _loadNotifications,
        const Duration(seconds: 5),
      );

  Future<void> sendMain({
    required String text,
    List<LiveAttachment> attachments = const [],
    Map<String, dynamic> meta = const {},
  }) => _guard(() async {
        final value = text.trim();
        if (value.isEmpty && attachments.isEmpty) return;
        final count = await session.guestMessageCount;
        if (!auth.signedIn && count >= 10) {
          throw StateError('Connectez-vous pour continuer apres 10 messages invites.');
        }
        final payload = await _mainPayload(value, attachments, meta);
        if (!isOnline) {
          await _queueMain(payload);
          if (!auth.signedIn) await session.incrementGuestMessageCount();
          return;
        }
        try {
          await _sendMainPayload(payload);
        } catch (exception) {
          if (!_isOfflineFailure(exception)) rethrow;
          await _queueMain(payload);
        }
        if (!auth.signedIn) await session.incrementGuestMessageCount();
      });

  Future<void> sendMatch({
    required LiveMatch match,
    required String text,
    List<LiveAttachment> attachments = const [],
  }) => sendMain(
        text: text,
        attachments: attachments,
        meta: {
          'article_id': match.articleId,
          'buyer_profile_id': match.buyerProfileId,
          'counterpart_user_id': match.counterpartUserId,
          'role': match.role,
          'match_key': match.key,
        },
      );

  Future<void> sendConversation(String id, String text) => _guard(() async {
        final value = text.trim();
        if (value.isEmpty) return;
        if (!isOnline) {
          await offline.enqueue('send_conversation', {'conversation_id': id, 'text': value});
          await _refreshPendingCount();
          return;
        }
        try {
          await chat.sendConversationMessage(
            conversationId: id,
            text: value,
            authUserId: auth.user?.id,
          );
        } catch (exception) {
          if (!_isOfflineFailure(exception)) rethrow;
          await offline.enqueue('send_conversation', {'conversation_id': id, 'text': value});
          await _refreshPendingCount();
        }
      });

  Future<void> archiveConversation(String id) => _guard(() async {
        if (!isOnline) {
          await offline.enqueue('archive_conversation', {'conversation_id': id});
          await _refreshPendingCount();
          return;
        }
        try {
          await chat.archiveConversation(id);
        } catch (exception) {
          if (!_isOfflineFailure(exception)) rethrow;
          await offline.enqueue('archive_conversation', {'conversation_id': id});
          await _refreshPendingCount();
        }
      });

  Future<void> archiveMatch(LiveMatch match, bool archived) =>
      _guard(() => notifications.setMatchArchived(match, archived));

  Future<void> publishStatus({
    required String type,
    required String title,
    required String caption,
    required num? price,
    required String locationText,
    required List<XFile> photos,
  }) => _guard(() async {
        final user = auth.user;
        if (user == null) throw StateError('Connectez-vous pour publier un statut.');
        if (!isOnline) {
          final paths = await media.persistFiles(photos, folder: 'statuses/${user.id}');
          await offline.enqueue('publish_status', {
            'type': type,
            'title': title,
            'caption': caption,
            'price': price,
            'location': locationText,
            'lat': _position.latitude,
            'lng': _position.longitude,
            'user_id': user.id,
            'author_name': auth.profile?.fullName ?? user.email,
            'author_avatar_url': auth.profile?.avatarUrl ?? user.userMetadata?['avatar_url']?.toString(),
            'photo_paths': paths,
          });
          await _refreshPendingCount();
          return;
        }
        try {
          await status.publish(
            type: type,
            title: title,
            caption: caption,
            price: price,
            location: locationText,
            latitude: _position.latitude,
            longitude: _position.longitude,
            userId: user.id,
            authorName: auth.profile?.fullName ?? user.email,
            authorAvatarUrl: auth.profile?.avatarUrl ?? user.userMetadata?['avatar_url']?.toString(),
            photos: photos,
          );
        } catch (exception) {
          if (!_isOfflineFailure(exception)) rethrow;
          final paths = await media.persistFiles(photos, folder: 'statuses/${user.id}');
          await offline.enqueue('publish_status', {
            'type': type,
            'title': title,
            'caption': caption,
            'price': price,
            'location': locationText,
            'lat': _position.latitude,
            'lng': _position.longitude,
            'user_id': user.id,
            'author_name': auth.profile?.fullName ?? user.email,
            'author_avatar_url': auth.profile?.avatarUrl ?? user.userMetadata?['avatar_url']?.toString(),
            'photo_paths': paths,
          });
          await _refreshPendingCount();
        }
      });

  Future<void> openStatusReply(LiveStatus status) async {
    final text = status.type == 'sell'
        ? 'Je suis interesse par « ${status.title} ». '
        : status.type == 'buy'
            ? 'Je peux vous proposer « ${status.title} ». '
            : 'Je reponds a votre annonce « ${status.title} ». ';
    setComposerSeed(text, meta: {
      'source': 'flutter_status_reply',
      'status_id': status.id,
      'status_type': status.type,
      if (status.articleId != null && status.articleId!.isNotEmpty) 'article_id': status.articleId,
      if (status.articleId != null && status.articleId!.isNotEmpty) 'role': 'buyer',
    });
  }

  Future<void> markNotificationRead(String id) => _guard(() async {
        if (!isOnline) {
          await offline.enqueue('mark_notification_read', {'id': id});
          await _refreshPendingCount();
          return;
        }
        try {
          await notifications.markRead(id);
        } catch (exception) {
          if (!_isOfflineFailure(exception)) rethrow;
          await offline.enqueue('mark_notification_read', {'id': id});
          await _refreshPendingCount();
        }
      });

  Future<void> markAllNotificationsRead() => _guard(() async {
        if (!isOnline) {
          await offline.enqueue('mark_all_notifications_read', const {});
          await _refreshPendingCount();
          return;
        }
        await notifications.markAllRead(auth.user?.id);
      });

  Future<void> syncPending() async {
    if (!isOnline || syncing) return;
    syncing = true;
    notifyListeners();
    try {
      final actions = await offline.outbox();
      for (final action in actions) {
        try {
          await _syncAction(action);
          await offline.removeOutbox(action.id);
        } catch (exception) {
          error = _humanizeError(exception);
          break;
        }
      }
      await _refreshPendingCount(notify: false);
    } finally {
      syncing = false;
      notifyListeners();
    }
  }

  LiveMatch matchFromNotification(LiveNotification item) {
    final row = <String, dynamic>{
      'id': item.id,
      'notification_type': item.type ?? 'match',
      'payload': item.payload,
      'article_id': item.articleId,
      'sent_at': item.createdAt.toIso8601String(),
      'opened': item.read,
    };
    return LiveMatch.fromNotification(row);
  }

  Future<List<LiveMessage>> _loadMainMessages() async {
    final scope = await session.sessionId;
    try {
      final remote = await chat.loadMainHistory(authUserId: auth.user?.id);
      await offline.cacheMessages(scope, remote);
      return _mergeMessages(remote, await _pendingMainMessages());
    } catch (_) {
      return _mergeMessages(await offline.messages(scope), await _pendingMainMessages());
    }
  }

  Future<List<LiveConversation>> _loadConversations(bool archived) async {
    final scope = '${await session.sessionId}_${archived ? 'archived' : 'active'}';
    try {
      final remote = await chat.loadConversations(authUserId: auth.user?.id, archived: archived);
      await offline.cacheConversations(scope, remote);
      return remote;
    } catch (_) {
      return offline.conversations(scope);
    }
  }

  Future<List<LiveMessage>> _loadConversationMessages(String id) async {
    final scope = 'conversation_${await session.sessionId}_$id';
    try {
      final remote = await chat.loadConversationMessages(id);
      await offline.cacheMessages(scope, remote);
      return remote;
    } catch (_) {
      return offline.messages(scope);
    }
  }

  Future<List<LiveStatus>> _loadStatuses(String? type) async {
    final scope = '${await session.sessionId}_$type';
    try {
      final remote = await status.load(type: type);
      await offline.cacheStatuses(scope, remote);
      return remote;
    } catch (_) {
      return offline.statuses(scope);
    }
  }

  Future<List<LiveNotification>> _loadNotifications() async {
    final scope = await session.sessionId;
    try {
      final remote = await notifications.load(auth.user?.id);
      await offline.cacheNotifications(scope, remote);
      return remote;
    } catch (_) {
      return offline.notifications(scope);
    }
  }

  Future<Map<String, dynamic>> _mainPayload(
    String text,
    List<LiveAttachment> attachments,
    Map<String, dynamic> meta,
  ) async => {
        'text': text,
        'attachments': attachments.map((item) => item.toJson()).toList(),
        'city': await city,
        'lat': _position.latitude,
        'lng': _position.longitude,
        'meta': meta,
      };

  Future<void> _sendMainPayload(Map<String, dynamic> payload) async {
    final sid = await session.sessionId;
    final original = (payload['attachments'] as List? ?? const [])
        .whereType<Map>()
        .map((item) => LiveAttachment.fromJson(Map<String, dynamic>.from(item)))
        .toList();
    final resolved = <LiveAttachment>[];
    for (final item in original) {
      resolved.add(await media.resolveAttachment(
        attachment: item,
        bucket: 'waouh-uploads',
        folder: 'web/$sid',
      ));
    }
    await chat.sendMainMessage(
      text: liveText(payload['text']),
      attachments: resolved,
      authUserId: auth.user?.id,
      city: liveText(payload['city']),
      latitude: (payload['lat'] as num?)?.toDouble(),
      longitude: (payload['lng'] as num?)?.toDouble(),
      meta: liveMap(payload['meta']),
    );
  }

  Future<void> _queueMain(Map<String, dynamic> payload) async {
    await offline.enqueue('send_main', payload);
    await _refreshPendingCount();
  }

  Future<List<LiveMessage>> _pendingMainMessages() async {
    final actions = await offline.outbox();
    return actions.where((item) => item.type == 'send_main').map((item) {
      final attachments = (item.payload['attachments'] as List? ?? const [])
          .whereType<Map>()
          .map((value) => LiveAttachment.fromJson(Map<String, dynamic>.from(value)))
          .toList();
      return LiveMessage(
        id: 'pending_${item.id}',
        text: liveText(item.payload['text']),
        createdAt: item.createdAt,
        direction: 'in',
        attachments: attachments,
        meta: {...liveMap(item.payload['meta']), 'delivery_state': 'pending'},
      );
    }).toList();
  }

  List<LiveMessage> _mergeMessages(List<LiveMessage> source, List<LiveMessage> pending) {
    final values = <String, LiveMessage>{
      for (final item in source) item.id: item,
      for (final item in pending) item.id: item,
    }.values.toList();
    values.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return values;
  }

  Future<void> _syncAction(LiveOutboxAction action) async {
    final payload = action.payload;
    switch (action.type) {
      case 'send_main':
        await _sendMainPayload(payload);
      case 'send_conversation':
        await chat.sendConversationMessage(
          conversationId: liveText(payload['conversation_id']),
          text: liveText(payload['text']),
          authUserId: auth.user?.id,
        );
      case 'archive_conversation':
        await chat.archiveConversation(liveText(payload['conversation_id']));
      case 'mark_notification_read':
        await notifications.markRead(liveText(payload['id']));
      case 'mark_all_notifications_read':
        await notifications.markAllRead(auth.user?.id);
      case 'publish_status':
        final paths = (payload['photo_paths'] as List? ?? const []).map((item) => XFile('$item')).toList();
        await status.publish(
          type: liveText(payload['type']),
          title: liveText(payload['title']),
          caption: liveText(payload['caption']),
          price: payload['price'] as num?,
          location: liveText(payload['location']),
          latitude: (payload['lat'] as num?)?.toDouble(),
          longitude: (payload['lng'] as num?)?.toDouble(),
          userId: liveText(payload['user_id']),
          authorName: payload['author_name']?.toString(),
          authorAvatarUrl: payload['author_avatar_url']?.toString(),
          photos: paths,
        );
      default:
        throw StateError('Action locale inconnue : ${action.type}');
    }
  }

  Future<void> _onConnectivityChanged(bool online) async {
    if (online) await syncPending();
    notifyListeners();
  }

  Future<void> _refreshPendingCount({bool notify = true}) async {
    pendingActions = await offline.pendingCount();
    if (notify) notifyListeners();
  }

  bool _isOfflineFailure(Object error) {
    final value = error.toString().toLowerCase();
    return value.contains('socket') ||
        value.contains('network') ||
        value.contains('connection') ||
        value.contains('timeout') ||
        value.contains('clientexception');
  }

  String _humanizeError(Object error) {
    final value = error.toString();
    if (_isOfflineFailure(error)) return 'Connexion indisponible. Vos actions restent en attente.';
    return value;
  }

  Stream<T> _poll<T>(Future<T> Function() loader, Duration interval) async* {
    while (true) {
      try {
        yield await loader();
      } catch (exception) {
        error = _humanizeError(exception);
        notifyListeners();
      }
      await Future<void>.delayed(interval);
    }
  }

  Future<void> _guard(Future<void> Function() action) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      await action();
    } catch (exception) {
      error = _humanizeError(exception);
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  void _onAuthChange() {
    if (auth.signedIn) {
      unawaited(session.clearGuestMessageCount());
      if (isOnline) unawaited(syncPending());
    }
    notifyListeners();
  }

  @override
  void dispose() {
    auth.removeListener(_onAuthChange);
    unawaited(connectivity.dispose());
    super.dispose();
  }
}
