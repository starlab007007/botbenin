import 'dart:async';
import 'dart:math';

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
import 'live_thread_flow.dart';

final Random _waouhSecureRandom = Random.secure();

String _waouhUuidV4() {
  final bytes = List<int>.generate(16, (_) => _waouhSecureRandom.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  final hex =
      bytes.map((value) => value.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-'
      '${hex.substring(12, 16)}-${hex.substring(16, 20)}-'
      '${hex.substring(20)}';
}

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
  DateTime? _positionAt;
  String? _composerSeed;
  Map<String, dynamic> _composerMeta = const {};
  String? _pendingMeetKey;
  LiveMatch? _pendingMeet;
  final Map<String, Completer<LiveMatch?>> _preparedInterestWaiters =
      <String, Completer<LiveMatch?>>{};
  final Map<String, Object> _preparedInterestErrors = <String, Object>{};
  final Map<String, Map<String, dynamic>> _preparedInterestRequests =
      <String, Map<String, dynamic>>{};
  final Map<String, Map<String, dynamic>> _preparedInterestPayloads =
      <String, Map<String, dynamic>>{};
  final Map<String, LiveMatch> _preparedInterestResults = <String, LiveMatch>{};
  final Set<String> _preparedInterestResolutionInFlight = <String>{};
  final Set<String> _preparedInterestSubmissionAccepted = <String>{};
  final Map<String, Future<LiveMatch?>> _preparedInterestRepairs =
      <String, Future<LiveMatch?>>{};
  final Map<String, LiveMatch> _preparedInterestSeeds = <String, LiveMatch>{};
  bool _initialized = false;
  Future<void>? _initializeFuture;
  Stream<List<LiveMessage>>? _mainMessagesStream;
  Stream<List<LiveNotification>>? _notificationItemsStream;
  final Map<bool, Stream<List<LiveConversation>>> _conversationStreams = {};
  final Map<String, Stream<List<LiveMessage>>> _conversationMessageStreams = {};
  final Map<bool, Stream<List<LiveMatch>>> _matchStreams = {};
  final Map<String, Stream<List<LiveStatus>>> _statusStreams = {};
  String? error;
  bool busy = false;
  bool syncing = false;
  int pendingActions = 0;

  LiveLocation get position => _position;
  bool get isOnline => connectivity.online;
  String newIdempotencyKey() => _waouhUuidV4();

  Future<void> initialize() {
    if (_initialized) return Future<void>.value();
    return _initializeFuture ??= _initializeOnce();
  }

  Future<void> _initializeOnce() async {
    try {
      await Future.wait<void>([
        session.initialize(),
        offline.initialize(),
        connectivity.initialize(),
      ]);
      if (auth.signedIn) await session.clearGuestMessageCount();
      pendingActions = await offline.pendingCount();
      if (isOnline && pendingActions > 0) await syncPending();
      _initialized = true;
      notifyListeners();
      unawaited(useDeviceLocation());
    } finally {
      if (!_initialized) _initializeFuture = null;
    }
  }

  Future<void> setCity(String city) async {
    await session.setCity(city);
    notifyListeners();
  }

  Future<String> get city => session.city;

  Future<void> useDeviceLocation() async {
    _position = await location.requestCurrent();
    if (_position.available) _positionAt = DateTime.now();
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

  LiveMatch? takePendingMeet() {
    final value = _pendingMeet;
    _pendingMeet = null;
    if (value != null) _pendingMeetKey = null;
    return value;
  }

  String? takePendingMeetKey() {
    final value = _pendingMeetKey;
    _pendingMeetKey = null;
    if (value != null && _pendingMeet?.key == value) _pendingMeet = null;
    return value;
  }

  void _publishPendingMeetForCaller(LiveMatch match) {
    _pendingMeet = match;
    _pendingMeetKey = match.key;
  }

  LiveMatch prepareInterestedMeet({
    required String text,
    required Map<String, dynamic> meta,
  }) {
    final canonical = liveCanonicalInterestedMeta(
      text: text,
      meta: meta,
      authUserId: auth.user?.id,
    );
    final seed = liveBuildInterestedEntryMatch(
      text: text,
      requestMeta: canonical,
    );
    if (!liveIsProvisionalInterestedMatch(seed)) {
      notifications.rememberMatch(seed);
      return seed;
    }
    _preparedInterestRequests[seed.key] = canonical;
    _preparedInterestSeeds[seed.key] = seed;
    notifications.rememberMatch(seed);
    _preparedInterestWaiters.putIfAbsent(
      seed.key,
      () => Completer<LiveMatch?>(),
    );
    return seed;
  }

  Map<String, dynamic> _clonePreparedInterestPayload(
    Map<String, dynamic> payload,
  ) {
    final rawAttachments = payload['attachments'] as List? ?? const [];
    return <String, dynamic>{
      ...payload,
      'meta': Map<String, dynamic>.from(liveMap(payload['meta'])),
      'attachments': rawAttachments
          .map((item) => item is Map ? Map<String, dynamic>.from(item) : item)
          .toList(),
    };
  }

  void _rememberPreparedInterestPayload(Map<String, dynamic> payload) {
    final text = liveText(payload['text']);
    final meta = liveCanonicalInterestedMeta(
      text: text,
      meta: liveMap(payload['meta']),
      authUserId: auth.user?.id,
    );
    if (!liveIsInterestedMeta(meta, text: text)) return;
    final seed = liveBuildInterestedEntryMatch(
      text: text,
      requestMeta: meta,
    );
    if (!liveIsProvisionalInterestedMatch(seed)) return;
    _preparedInterestRequests[seed.key] = meta;
    _preparedInterestSeeds.putIfAbsent(seed.key, () => seed);
    _preparedInterestPayloads[seed.key] = _clonePreparedInterestPayload(
      <String, dynamic>{...payload, 'meta': meta},
    );
    _preparedInterestWaiters.putIfAbsent(
      seed.key,
      () => Completer<LiveMatch?>(),
    );
  }

  LiveMatch? preparedInterestedResolution(LiveMatch seed) {
    if (!liveIsProvisionalInterestedMatch(seed)) return seed;
    final resolved = _preparedInterestResults[seed.key];
    return liveCanPromoteInterestedMatch(seed: seed, resolved: resolved)
        ? resolved
        : null;
  }

  Future<LiveMatch?> resolvePreparedInterestedMeet(LiveMatch seed) async {
    if (!liveIsProvisionalInterestedMatch(seed)) return seed;
    final cached = _preparedInterestResults[seed.key];
    if (cached != null) return cached;

    final pendingFailure = _preparedInterestErrors.remove(seed.key);
    if (pendingFailure != null) throw pendingFailure;

    var waiter = _preparedInterestWaiters[seed.key];
    if (waiter == null || waiter.isCompleted) {
      waiter = Completer<LiveMatch?>();
      _preparedInterestWaiters[seed.key] = waiter;
    }
    final requestMeta = _preparedInterestRequests[seed.key];
    if (requestMeta != null) {
      unawaited(
        _ensurePreparedInterestResolution(
          seed: seed,
          requestMeta: requestMeta,
        ),
      );
    }

    final resolved = await waiter.future.timeout(
      const Duration(seconds: 6),
      onTimeout: () => null,
    );
    final failure = _preparedInterestErrors.remove(seed.key);
    if (failure != null) throw failure;
    return resolved ?? _preparedInterestResults[seed.key];
  }

  /// Répare réellement une synchronisation bloquée. Avant tout renvoi, la
  /// méthode recherche une création serveur tardive. Si aucun thread n'existe,
  /// elle rejoue exactement le payload initial avec la même idempotency_key,
  /// puis relance la résolution. Le backend peut donc dédupliquer l'opération.
  Future<LiveMatch?> repairPreparedInterestedMeet(
    LiveMatch seed, {
    bool replayAcceptedSubmission = false,
  }) async {
    if (!liveIsProvisionalInterestedMatch(seed)) return seed;
    final cached = _preparedInterestResults[seed.key];
    if (cached != null) return cached;

    final existing = _preparedInterestRepairs[seed.key];
    if (existing != null) return existing;

    final future = _repairPreparedInterestedMeet(
      seed,
      replayAcceptedSubmission: replayAcceptedSubmission,
    );
    _preparedInterestRepairs[seed.key] = future;
    try {
      return await future;
    } finally {
      if (identical(_preparedInterestRepairs[seed.key], future)) {
        _preparedInterestRepairs.remove(seed.key);
      }
    }
  }

  Future<LiveMatch?> _repairPreparedInterestedMeet(
    LiveMatch seed, {
    required bool replayAcceptedSubmission,
  }) async {
    final requestMeta = _preparedInterestRequests[seed.key];
    if (requestMeta == null) {
      throw StateError(
        'La requête Intéressé n’est plus disponible. Revenez au chat et renvoyez votre intérêt.',
      );
    }

    final lateCandidate = await _resolvePreparedInterestOnce(
      seed: seed,
      requestMeta: requestMeta,
      includeMatchHistory: true,
    );
    if (lateCandidate != null) {
      _completePreparedInterest(seed.key, lateCandidate);
      notifyListeners();
      return _preparedInterestResults[seed.key];
    }

    if (!isOnline) {
      throw StateError(
        'Connexion indisponible. La création du fil reprendra dès le retour du réseau.',
      );
    }

    if (pendingActions > 0) {
      await syncPending();
      final synced = _preparedInterestResults[seed.key];
      if (synced != null) return synced;
    }

    if (_preparedInterestSubmissionAccepted.contains(seed.key) &&
        !replayAcceptedSubmission) {
      unawaited(
        _ensurePreparedInterestResolution(
          seed: seed,
          requestMeta: requestMeta,
        ),
      );
      return resolvePreparedInterestedMeet(seed);
    }

    var payload = _preparedInterestPayloads[seed.key];
    payload ??= await _mainPayload(
      seed.seedText ?? 'Intéressé',
      const <LiveAttachment>[],
      requestMeta,
    );
    _rememberPreparedInterestPayload(payload);
    _preparedInterestErrors.remove(seed.key);
    final waiter = _preparedInterestWaiters[seed.key];
    if (waiter == null || waiter.isCompleted) {
      _preparedInterestWaiters[seed.key] = Completer<LiveMatch?>();
    }

    await _sendMainPayload(
      _clonePreparedInterestPayload(payload),
    ).timeout(const Duration(seconds: 20));

    final direct = _preparedInterestResults[seed.key];
    if (direct != null) return direct;

    final afterReplay = await _resolvePreparedInterestOnce(
      seed: seed,
      requestMeta: requestMeta,
      includeMatchHistory: true,
    );
    if (afterReplay != null) {
      _completePreparedInterest(seed.key, afterReplay);
      notifyListeners();
      return _preparedInterestResults[seed.key];
    }

    unawaited(
      _ensurePreparedInterestResolution(
        seed: seed,
        requestMeta: requestMeta,
      ),
    );
    return resolvePreparedInterestedMeet(seed);
  }

  void _completePreparedInterest(
    String key,
    LiveMatch? match, {
    Object? error,
  }) {
    if (match != null) {
      final seed = _preparedInterestSeeds[key];
      final enriched = seed == null
          ? match
          : liveEnrichResolvedInterestedMatch(
              seed: seed,
              resolved: match,
            );
      _preparedInterestResults[key] = enriched;
      _preparedInterestErrors.remove(key);
      _preparedInterestPayloads.remove(key);
      _preparedInterestSubmissionAccepted.remove(key);
      notifications.replaceRememberedMatch(key, enriched);
      match = enriched;
    }
    if (error != null) _preparedInterestErrors[key] = error;
    final waiter = _preparedInterestWaiters.putIfAbsent(
      key,
      () => Completer<LiveMatch?>(),
    );
    if (!waiter.isCompleted) waiter.complete(match);
  }

  LiveMatch reconcileAuthoritativeMatchThread(
    LiveMatch seed,
    String value,
  ) {
    final threadId = value.trim();
    if (threadId.isEmpty) return seed;
    final resolved = seed.withAuthoritativeThread(threadId);
    if (resolved.threadId == seed.threadId) return seed;

    notifications.rememberMatch(resolved);
    if (liveIsProvisionalInterestedMatch(seed)) {
      _completePreparedInterest(seed.key, resolved);
    } else {
      notifications.replaceRememberedMatch(seed.key, resolved);
    }
    _publishPendingMeetForCaller(resolved);
    notifyListeners();
    return _preparedInterestResults[seed.key] ?? resolved;
  }

  Future<LiveMatch?> _resolvePreparedInterestOnce({
    required LiveMatch seed,
    required Map<String, dynamic> requestMeta,
    required bool includeMatchHistory,
  }) async {
    final fastResults = await Future.wait<LiveMatch?>([
      notifications
          .resolveInterestedMatchByCorrelation(
            authUserId: auth.user?.id,
            requestMeta: requestMeta,
            notBefore: seed.lastAt,
          )
          .timeout(
            const Duration(seconds: 4),
            onTimeout: () => null,
          )
          .catchError((_) => null),
      notifications
          .resolveInterestedMatchByIdentity(
            authUserId: auth.user?.id,
            requestMeta: requestMeta,
            notBefore: seed.lastAt,
          )
          .timeout(
            const Duration(seconds: 4),
            onTimeout: () => null,
          )
          .catchError((_) => null),
      chat
          .resolveInterestedMatchByCorrelation(
            authUserId: auth.user?.id,
            requestMeta: requestMeta,
            notBefore: seed.lastAt,
            requestText: seed.seedText ?? '',
          )
          .timeout(
            const Duration(seconds: 4),
            onTimeout: () => null,
          )
          .catchError((_) => null),
      chat
          .resolveUniqueRecentInterestedMatch(
            authUserId: auth.user?.id,
            requestMeta: requestMeta,
            notBefore: seed.lastAt,
          )
          .timeout(
            const Duration(seconds: 4),
            onTimeout: () => null,
          )
          .catchError((_) => null),
    ]);

    for (final value in fastResults) {
      if (value?.threadId?.trim().isNotEmpty == true) return value;
    }

    if (!includeMatchHistory) return null;
    try {
      final recentMatches = await notifications
          .loadMatches(
            auth.user?.id,
            force: true,
          )
          .timeout(
            const Duration(seconds: 5),
            onTimeout: () => const <LiveMatch>[],
          );
      var candidate = liveSelectInterestedMatch(
        matches: recentMatches,
        requestMeta: requestMeta,
      );
      candidate ??= liveSelectUniqueRecentInterestedMatch(
        matches: recentMatches,
        notBefore: seed.lastAt,
      );
      return candidate;
    } catch (_) {
      return null;
    }
  }

  Future<void> _ensurePreparedInterestResolution({
    required LiveMatch seed,
    required Map<String, dynamic> requestMeta,
  }) async {
    if (_preparedInterestResults.containsKey(seed.key)) return;
    if (!_preparedInterestResolutionInFlight.add(seed.key)) return;
    const delays = <Duration>[
      Duration.zero,
      Duration(milliseconds: 300),
      Duration(milliseconds: 700),
      Duration(milliseconds: 1500),
      Duration(seconds: 3),
      Duration(seconds: 6),
      Duration(seconds: 10),
    ];

    try {
      for (var attempt = 0; attempt < delays.length; attempt += 1) {
        final delay = delays[attempt];
        if (_preparedInterestResults.containsKey(seed.key)) return;
        if (delay != Duration.zero) await Future<void>.delayed(delay);
        if (_preparedInterestResults.containsKey(seed.key)) return;

        final candidate = await _resolvePreparedInterestOnce(
          seed: seed,
          requestMeta: requestMeta,
          includeMatchHistory: attempt >= 2,
        );
        if (candidate != null &&
            candidate.threadId?.trim().isNotEmpty == true) {
          _completePreparedInterest(seed.key, candidate);
          notifyListeners();
          return;
        }
      }
      // Ne jamais compléter avec null : un résultat serveur légèrement tardif
      // doit encore réveiller la fenêtre. Le bouton Réessayer peut désormais
      // rejouer le payload initial avec la même clé d'idempotence.
    } finally {
      _preparedInterestResolutionInFlight.remove(seed.key);
    }
  }

  Stream<List<LiveMessage>> mainMessages() =>
      _mainMessagesStream ??= _cacheFirstPoll(
        cacheLoader: _cachedMainMessages,
        remoteLoader: _loadMainMessages,
        interval: const Duration(seconds: 4),
      );

  Stream<List<LiveConversation>> conversations({bool archived = false}) =>
      _conversationStreams.putIfAbsent(
        archived,
        () => _cacheFirstPoll(
          cacheLoader: () => _cachedConversations(archived),
          remoteLoader: () => _loadConversations(archived),
          interval: const Duration(seconds: 8),
        ),
      );

  Stream<List<LiveMessage>> conversationMessages(String conversationId) =>
      _conversationMessageStreams.putIfAbsent(
        conversationId,
        () => _cacheFirstPoll(
          cacheLoader: () => _cachedConversationMessages(conversationId),
          remoteLoader: () => _loadConversationMessages(conversationId),
          interval: const Duration(seconds: 4),
        ),
      );

  Stream<List<LiveMatch>> matches({bool archived = false}) =>
      _matchStreams.putIfAbsent(
        archived,
        () => _cacheFirstPoll(
          cacheLoader: () => notifications.cachedMatches(
            auth.user?.id,
            archived: archived,
          ),
          remoteLoader: () => notifications.loadMatches(
            auth.user?.id,
            archived: archived,
          ),
          interval: const Duration(seconds: 6),
        ),
      );

  Stream<List<LiveStatus>> statuses({String? type}) =>
      _statusStreams.putIfAbsent(
        type ?? '',
        () => _cacheFirstPoll(
          cacheLoader: () => _cachedStatuses(type),
          remoteLoader: () => _loadStatuses(type),
          interval: const Duration(seconds: 12),
        ),
      );

  Stream<List<LiveNotification>> notificationItems() =>
      _notificationItemsStream ??= _cacheFirstPoll(
        cacheLoader: _cachedNotifications,
        remoteLoader: _loadNotifications,
        interval: const Duration(seconds: 10),
      );

  Future<void> sendMain({
    required String text,
    List<LiveAttachment> attachments = const [],
    Map<String, dynamic> meta = const {},
  }) =>
      _guard(() async {
        final value = text.trim();
        if (value.isEmpty && attachments.isEmpty) return;
        final count = await session.guestMessageCount;
        if (!auth.signedIn && count >= 10) {
          throw StateError(
              'Connectez-vous pour continuer apres 10 messages invites.');
        }
        final locationRelevant = meta['intent'] == 'sell' ||
            meta['intent'] == 'buy' ||
            RegExp(
              r'\b(cherche|recherche|acheter|achète|vends|vendre)\b',
              caseSensitive: false,
            ).hasMatch(value);
        final staleLocation = _positionAt == null ||
            DateTime.now().difference(_positionAt!) >
                const Duration(minutes: 2);
        if (locationRelevant && staleLocation) await useDeviceLocation();
        final payload = await _mainPayload(value, attachments, meta);
        _rememberPreparedInterestPayload(payload);
        if (!isOnline) {
          await _queueMain(payload);
          _completeOfflineInterestedPayload(payload);
          if (!auth.signedIn) await session.incrementGuestMessageCount();
          return;
        }
        try {
          await _sendMainPayload(payload);
        } catch (exception) {
          if (!_isOfflineFailure(exception)) rethrow;
          await _queueMain(payload);
          _completeOfflineInterestedPayload(payload, error: exception);
        }
        if (!auth.signedIn) await session.incrementGuestMessageCount();
      });

  Future<void> sendMatch({
    required LiveMatch match,
    required String text,
    List<LiveAttachment> attachments = const [],
    Map<String, dynamic> meta = const {},
  }) =>
      sendMain(
        text: text,
        attachments: attachments,
        meta: liveCanonicalMatchMeta(
          match: match,
          actionMeta: meta,
        ),
      );

  Future<void> sendConversation(String id, String text) => _guard(() async {
        final value = text.trim();
        if (value.isEmpty) return;
        if (!isOnline) {
          await offline.enqueue(
              'send_conversation', {'conversation_id': id, 'text': value});
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
          await offline.enqueue(
              'send_conversation', {'conversation_id': id, 'text': value});
          await _refreshPendingCount();
        }
      });

  Future<void> archiveConversation(String id) => _guard(() async {
        if (!isOnline) {
          await offline
              .enqueue('archive_conversation', {'conversation_id': id});
          await _refreshPendingCount();
          return;
        }
        try {
          await chat.archiveConversation(id);
        } catch (exception) {
          if (!_isOfflineFailure(exception)) rethrow;
          await offline
              .enqueue('archive_conversation', {'conversation_id': id});
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
  }) =>
      _guard(() async {
        final user = auth.user;
        if (user == null) {
          throw StateError('Connectez-vous pour publier un statut.');
        }
        final idempotencyKey = _waouhUuidV4();
        if (!isOnline) {
          final paths =
              await media.persistFiles(photos, folder: 'statuses/${user.id}');
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
            'author_avatar_url': auth.profile?.avatarUrl ??
                user.userMetadata?['avatar_url']?.toString(),
            'photo_paths': paths,
            'idempotency_key': idempotencyKey,
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
            authorAvatarUrl: auth.profile?.avatarUrl ??
                user.userMetadata?['avatar_url']?.toString(),
            photos: photos,
            idempotencyKey: idempotencyKey,
          );
        } catch (exception) {
          if (!_isOfflineFailure(exception)) rethrow;
          final paths =
              await media.persistFiles(photos, folder: 'statuses/${user.id}');
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
            'author_avatar_url': auth.profile?.avatarUrl ??
                user.userMetadata?['avatar_url']?.toString(),
            'photo_paths': paths,
            'idempotency_key': idempotencyKey,
          });
          await _refreshPendingCount();
        }
      });

  Future<void> openStatusReply(LiveStatus status) async {
    await startNewChat();
    final currentUserId = (auth.user?.id ?? '').trim();
    final authorUserId = (status.authorUserId ?? '').trim();
    final text = status.type == 'sell'
        ? 'Je suis interesse par « ${status.title} ». '
        : status.type == 'buy'
            ? 'Je peux vous proposer « ${status.title} ». '
            : 'Je reponds a votre annonce « ${status.title} ». ';
    final action = switch (status.type) {
      'sell' => 'interested',
      'buy' => 'propose',
      _ => 'reply',
    };
    setComposerSeed(text, meta: {
      'source': 'flutter_status_reply',
      'origin_surface': 'flutter_status',
      'source_id': status.id,
      'auto_send': true,
      'action': action,
      'intent': action,
      'status_id': status.id,
      'status_type': status.type,
      'title': status.title,
      if (status.price != null) 'price': status.price,
      if ((status.location ?? '').trim().isNotEmpty) 'city': status.location,
      if (status.mediaUrls.isNotEmpty) 'photos': status.mediaUrls,
      if (status.articleId != null && status.articleId!.isNotEmpty)
        'article_id': status.articleId,
      if (status.type == 'sell' && currentUserId.isNotEmpty)
        'buyer_user_id': currentUserId,
      if (status.type == 'sell' && authorUserId.isNotEmpty)
        'seller_user_id': authorUserId,
      if (status.type == 'buy' && authorUserId.isNotEmpty)
        'buyer_user_id': authorUserId,
      if (status.type == 'buy' && currentUserId.isNotEmpty)
        'seller_user_id': currentUserId,
      if (authorUserId.isNotEmpty) 'counterpart_user_id': authorUserId,
      'role': status.type == 'buy' ? 'seller' : 'buyer',
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
      'thread_id': item.threadId,
      'article_id': item.articleId,
      'sent_at': item.createdAt.toIso8601String(),
      'opened': item.read,
    };
    return LiveMatch.fromNotification(row);
  }

  Future<List<LiveMessage>> _cachedMainMessages() async {
    final scope = await session.sessionId;
    return _mergeMessages(
      await offline.messages(scope),
      await _pendingMainMessages(),
    );
  }

  Future<List<LiveConversation>> _cachedConversations(bool archived) async {
    final scope =
        '${await session.sessionId}_${archived ? 'archived' : 'active'}';
    return offline.conversations(scope);
  }

  Future<List<LiveMessage>> _cachedConversationMessages(String id) async {
    final scope = 'conversation_${await session.sessionId}_$id';
    return offline.messages(scope);
  }

  Future<List<LiveStatus>> _cachedStatuses(String? type) async {
    final scope = '${await session.sessionId}_$type';
    return offline.statuses(scope);
  }

  Future<List<LiveNotification>> _cachedNotifications() async {
    final scope = await session.sessionId;
    return offline.notifications(scope);
  }

  Future<List<LiveMessage>> _loadMainMessages() async {
    final scope = await session.sessionId;
    try {
      final remote = await chat.loadMainHistory(authUserId: auth.user?.id);
      await offline.cacheMessages(scope, remote);
      return _mergeMessages(remote, await _pendingMainMessages());
    } catch (_) {
      return _mergeMessages(
          await offline.messages(scope), await _pendingMainMessages());
    }
  }

  Future<List<LiveConversation>> _loadConversations(bool archived) async {
    final scope =
        '${await session.sessionId}_${archived ? 'archived' : 'active'}';
    try {
      final remote = await chat.loadConversations(
          authUserId: auth.user?.id, archived: archived);
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
  ) async {
    final canonical = liveCanonicalInterestedMeta(
      text: text,
      meta: <String, dynamic>{
        'idempotency_key': meta['idempotency_key'] ?? _waouhUuidV4(),
        'action': meta['action'] ?? meta['intent'] ?? 'message',
        ...meta,
      },
      authUserId: auth.user?.id,
    );
    return <String, dynamic>{
      'text': text,
      'attachments': attachments.map((item) => item.toJson()).toList(),
      'city': await city,
      'lat': _position.latitude,
      'lng': _position.longitude,
      'meta': canonical,
    };
  }

  void _completeOfflineInterestedPayload(
    Map<String, dynamic> payload, {
    Object? error,
  }) {
    final text = liveText(payload['text']);
    final meta = liveMap(payload['meta']);
    if (!liveIsInterestedMeta(meta, text: text)) return;
    final seed = liveBuildInterestedEntryMatch(
      text: text,
      requestMeta: meta,
    );
    if (!liveIsProvisionalInterestedMatch(seed)) {
      notifications.rememberMatch(seed);
      _completePreparedInterest(seed.key, seed);
      return;
    }
    _completePreparedInterest(
      seed.key,
      null,
      error: error ??
          StateError(
            'Connexion indisponible. L’intérêt est enregistré en attente.',
          ),
    );
  }

  Future<void> _sendMainPayload(Map<String, dynamic> payload) async {
    _rememberPreparedInterestPayload(payload);
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

    final text = liveText(payload['text']);
    var resolutionMeta = liveCanonicalInterestedMeta(
      text: text,
      meta: liveMap(payload['meta']),
      authUserId: auth.user?.id,
    );
    final locallyInterested = liveIsInterestedMeta(
      resolutionMeta,
      text: text,
    );
    LiveMatch? prepared = locallyInterested
        ? liveBuildInterestedEntryMatch(
            text: text,
            requestMeta: resolutionMeta,
          )
        : null;

    if (prepared != null && liveIsProvisionalInterestedMatch(prepared)) {
      // `prepared` est réassigné plus bas par le fallback backend. Dart ne le
      // promeut donc pas durablement dans une closure. Capturer une référence
      // explicitement non nullable garantit le type LiveMatch attendu par la
      // Map<String, LiveMatch> et évite return_of_invalid_type_from_closure.
      final LiveMatch preparedSeed = prepared;
      _preparedInterestRequests[preparedSeed.key] = resolutionMeta;
      _preparedInterestSeeds.putIfAbsent(
        preparedSeed.key,
        () => preparedSeed,
      );
    }

    Map<String, dynamic> response;
    try {
      response = liveNormalizeChannelResponse(
        await chat.sendMainMessage(
          text: liveText(payload['text']),
          attachments: resolved,
          authUserId: auth.user?.id,
          city: liveText(payload['city']),
          latitude: (payload['lat'] as num?)?.toDouble(),
          longitude: (payload['lng'] as num?)?.toDouble(),
          meta: resolutionMeta,
        ),
      );
    } catch (error) {
      if (prepared != null && liveIsProvisionalInterestedMatch(prepared)) {
        _preparedInterestSubmissionAccepted.remove(prepared.key);
        _completePreparedInterest(prepared.key, null, error: error);
      }
      rethrow;
    }

    // Parité avec le Web : la réponse structurée du backend est un second
    // arbitre. Elle rattrape les anciens boutons Flutter, les alias anglais,
    // les payloads Radar/Statut et les fautes de frappe non encore connues.
    if (prepared == null && liveResponseRequestsProductMeet(response)) {
      final normalizedResponse = liveNormalizeChannelResponse(response);
      resolutionMeta = liveCanonicalInterestedMeta(
        text: text,
        meta: <String, dynamic>{
          ...resolutionMeta,
          ...normalizedResponse,
          ...liveMap(normalizedResponse['meta']),
          ...liveMap(normalizedResponse['payload']),
          'action': 'interested',
          'intent': 'interested',
          'origin_surface': resolutionMeta['origin_surface'] ??
              resolutionMeta['source'] ??
              'flutter_backend_fallback',
        },
        authUserId: auth.user?.id,
      );
      prepared = liveBuildInterestedEntryMatch(
        text: text,
        requestMeta: resolutionMeta,
      );
      if (liveIsProvisionalInterestedMatch(prepared)) {
        _preparedInterestRequests[prepared.key] = resolutionMeta;
        _preparedInterestSeeds[prepared.key] = prepared;
        _preparedInterestPayloads[prepared.key] = _clonePreparedInterestPayload(
          <String, dynamic>{...payload, 'meta': resolutionMeta},
        );
        _preparedInterestWaiters.putIfAbsent(
          prepared.key,
          () => Completer<LiveMatch?>(),
        );
      }
    }

    if (prepared == null) return;
    _preparedInterestErrors.remove(prepared.key);
    if (liveIsProvisionalInterestedMatch(prepared)) {
      _preparedInterestSubmissionAccepted.add(prepared.key);
    }

    final match = _pendingInterestedMatch(
      response: response,
      requestPayload: <String, dynamic>{...payload, 'meta': resolutionMeta},
    );
    if (match != null && match.threadId?.trim().isNotEmpty == true) {
      notifications.rememberMatch(match);
      _publishPendingMeetForCaller(match);
      if (liveIsProvisionalInterestedMatch(prepared)) {
        _completePreparedInterest(prepared.key, match);
      }
      notifyListeners();
      return;
    }

    if (!liveIsProvisionalInterestedMatch(prepared)) {
      notifications.rememberMatch(prepared);
      _publishPendingMeetForCaller(prepared);
      notifyListeners();
      return;
    }

    // Le caller peut ouvrir ce seed après la réponse si la détection locale
    // avait échoué. Dans le parcours normal, la page provisoire est déjà ouverte
    // et `_deliver` consomme simplement cette valeur sans créer de doublon.
    notifications.rememberMatch(prepared);
    _publishPendingMeetForCaller(prepared);
    unawaited(
      _ensurePreparedInterestResolution(
        seed: prepared,
        requestMeta: resolutionMeta,
      ),
    );
  }

  LiveMatch? _pendingInterestedMatch({
    required Map<String, dynamic> response,
    required Map<String, dynamic> requestPayload,
  }) {
    final normalized = liveNormalizeChannelResponse(response);
    final threadId = liveThreadIdFromResponse(normalized);
    if (threadId.isEmpty) return null;

    final requestMeta = liveMap(requestPayload['meta']);
    final rawProducts = liveFlowValue(
      normalized,
      const ['products', 'articles', 'items', 'results', 'matches', 'offers'],
    );
    final firstProduct = rawProducts is List && rawProducts.isNotEmpty
        ? liveMap(rawProducts.first)
        : const <String, dynamic>{};

    final responseAttachments = liveAttachments(
      liveFlowValue(normalized, const ['attachments', 'photos', 'images']),
    );
    final productAttachments = liveAttachments(
      firstProduct['photos'] ??
          firstProduct['images'] ??
          firstProduct['attachments'] ??
          firstProduct['image_url'],
    );
    final photoUrls = <String>{
      ...productAttachments.map((item) => item.url),
      ...responseAttachments.map((item) => item.url),
    }.where((url) => url.trim().isNotEmpty).toList();

    final articleId = liveText(
      liveFlowValue(normalized, const ['article_id']) ??
          firstProduct['article_id'] ??
          firstProduct['id'] ??
          requestMeta['article_id'],
    ).trim();
    final rawTitle = liveText(
      liveFlowValue(normalized, const ['title', 'product_title']) ??
          firstProduct['title'] ??
          firstProduct['name'] ??
          firstProduct['nom'] ??
          requestMeta['title'],
      'Discussion produit',
    );
    final priceValue = liveFlowValue(normalized, const ['price', 'amount']) ??
        firstProduct['price'] ??
        firstProduct['prix'] ??
        requestMeta['price'];
    final price = priceValue is num
        ? priceValue
        : num.tryParse(
            '$priceValue'
                .replaceAll(RegExp(r'[^0-9.,-]'), '')
                .replaceAll(',', '.'),
          );
    final cityValue = liveText(
      liveFlowValue(normalized, const ['city', 'ville', 'location']) ??
          firstProduct['city'] ??
          firstProduct['ville'] ??
          requestPayload['city'],
    ).trim();
    final buyerUserId = liveText(
      liveFlowValue(normalized, const ['buyer_user_id']) ??
          firstProduct['buyer_user_id'] ??
          normalized['user_id'] ??
          requestMeta['buyer_user_id'],
    ).trim();
    final sellerUserId = liveText(
      liveFlowValue(normalized, const ['seller_user_id', 'owner_user_id']) ??
          firstProduct['seller_user_id'] ??
          firstProduct['owner_user_id'] ??
          requestMeta['seller_user_id'] ??
          requestMeta['counterpart_user_id'],
    ).trim();

    return LiveMatch(
      key: liveMatchKey(articleId, 'buyer', sellerUserId, threadId),
      articleId: articleId,
      role: 'buyer',
      title: liveVisibleText(rawTitle),
      lastAt: DateTime.now(),
      threadId: threadId,
      threadType: liveText(
        liveFlowValue(normalized, const ['thread_type']) ??
            requestMeta['thread_type'],
        'product_meet',
      ),
      buyerUserId: buyerUserId.isEmpty ? null : buyerUserId,
      sellerUserId: sellerUserId.isEmpty ? null : sellerUserId,
      counterpartUserId: sellerUserId.isEmpty ? null : sellerUserId,
      source: liveText(requestMeta['source'], 'flutter_chat'),
      counterpartLabel: liveText(
        firstProduct['seller_name'] ??
            firstProduct['business_name'] ??
            requestMeta['seller_name'],
      ),
      negotiationId: liveFlowText(
        normalized,
        const ['negotiation_id', 'neg_id'],
      ),
      dealId: liveFlowText(normalized, const ['deal_id']),
      transactionId: liveFlowText(normalized, const ['transaction_id']),
      seedText: liveVisibleText(
        liveFlowValue(normalized, const ['reply', 'message', 'text']),
      ),
      price: price,
      city: cityValue.isEmpty ? null : cityValue,
      photo: photoUrls.isEmpty ? null : photoUrls.first,
      photoUrls: photoUrls,
      unreadCount: 0,
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
          .map((value) =>
              LiveAttachment.fromJson(Map<String, dynamic>.from(value)))
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

  List<LiveMessage> _mergeMessages(
      List<LiveMessage> source, List<LiveMessage> pending) {
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
        final paths = (payload['photo_paths'] as List? ?? const [])
            .map((item) => XFile('$item'))
            .toList();
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
          idempotencyKey: liveText(
            payload['idempotency_key'],
            _waouhUuidV4(),
          ),
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
    if (_isOfflineFailure(error))
      return 'Connexion indisponible. Vos actions restent en attente.';
    return value;
  }

  Stream<T> _cacheFirstPoll<T>({
    required Future<T> Function() cacheLoader,
    required Future<T> Function() remoteLoader,
    required Duration interval,
  }) {
    late StreamController<T> streamController;
    Timer? timer;
    var loading = false;

    Future<void> refresh() async {
      if (loading || streamController.isClosed) return;
      loading = true;
      try {
        streamController.add(await remoteLoader());
      } catch (exception) {
        error = _humanizeError(exception);
        notifyListeners();
      } finally {
        loading = false;
      }
    }

    streamController = StreamController<T>.broadcast(
      onListen: () {
        unawaited(() async {
          try {
            streamController.add(await cacheLoader());
          } catch (_) {}
          await refresh();
          timer ??= Timer.periodic(interval, (_) => unawaited(refresh()));
        }());
      },
      onCancel: () {
        if (!streamController.hasListener) {
          timer?.cancel();
          timer = null;
        }
      },
    );
    return streamController.stream;
  }

  void _resetSharedStreams() {
    _mainMessagesStream = null;
    _notificationItemsStream = null;
    _conversationStreams.clear();
    _conversationMessageStreams.clear();
    _matchStreams.clear();
    _statusStreams.clear();
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
    chat.clearIdentityCache();
    notifications.clearCaches();
    _resetSharedStreams();
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
