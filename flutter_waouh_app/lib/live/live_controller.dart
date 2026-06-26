import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';

import '../main.dart' as legacy;
import 'live_chat_service.dart';
import 'live_location.dart';
import 'live_media.dart';
import 'live_models.dart';
import 'live_notification_service.dart';
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
  }

  final legacy.AuthController auth;
  final LiveSessionStore session;
  final LiveLocationService location;
  late final LiveChatService chat;
  late final LiveMediaService media;
  late final LiveStatusService status;
  late final LiveNotificationService notifications;

  LiveLocation _position = const LiveLocation();
  String? _composerSeed;
  Map<String, dynamic> _composerMeta = const {};
  String? error;
  bool busy = false;

  LiveLocation get position => _position;

  Future<void> initialize() async {
    await session.initialize();
    if (auth.signedIn) await session.clearGuestMessageCount();
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
    return media.uploadImage(file: file, bucket: 'waouh-uploads', folder: 'web/$sid');
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
        () => chat.loadMainHistory(authUserId: auth.user?.id),
        const Duration(seconds: 4),
      );

  Stream<List<LiveConversation>> conversations({bool archived = false}) => _poll(
        () => chat.loadConversations(authUserId: auth.user?.id, archived: archived),
        const Duration(seconds: 5),
      );

  Stream<List<LiveMessage>> conversationMessages(String conversationId) => _poll(
        () => chat.loadConversationMessages(conversationId),
        const Duration(seconds: 4),
      );

  Stream<List<LiveMatch>> matches({bool archived = false}) => _poll(
        () => notifications.loadMatches(auth.user?.id, archived: archived),
        const Duration(seconds: 5),
      );

  Stream<List<LiveStatus>> statuses({String? type}) => _poll(
        () => status.load(type: type),
        const Duration(seconds: 5),
      );

  Stream<List<LiveNotification>> notificationItems() => _poll(
        () => notifications.load(auth.user?.id),
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
        await chat.sendMainMessage(
          text: value,
          attachments: attachments,
          authUserId: auth.user?.id,
          city: await city,
          latitude: _position.latitude,
          longitude: _position.longitude,
          meta: meta,
        );
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

  Future<void> sendConversation(String id, String text) => _guard(() =>
      chat.sendConversationMessage(
        conversationId: id,
        text: text,
        authUserId: auth.user?.id,
      ));

  Future<void> archiveConversation(String id) => _guard(() => chat.archiveConversation(id));

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

  Future<void> markNotificationRead(String id) => _guard(() => notifications.markRead(id));

  Future<void> markAllNotificationsRead() =>
      _guard(() => notifications.markAllRead(auth.user?.id));

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

  Stream<T> _poll<T>(Future<T> Function() loader, Duration interval) async* {
    while (true) {
      try {
        yield await loader();
      } catch (exception) {
        error = exception.toString();
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
      error = exception.toString();
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  void _onAuthChange() {
    if (auth.signedIn) session.clearGuestMessageCount();
    notifyListeners();
  }

  @override
  void dispose() {
    auth.removeListener(_onAuthChange);
    super.dispose();
  }
}
