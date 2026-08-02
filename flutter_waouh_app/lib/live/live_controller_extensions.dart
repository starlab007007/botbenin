import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_controller.dart';
import 'live_match_history_service.dart';
import 'live_models.dart';

final Map<String, List<LiveMessage>> _waouhThreadMessageCache =
    <String, List<LiveMessage>>{};

List<LiveMessage> _isolatedMessages(
  List<LiveMessage> values,
  String threadId,
) {
  final byIdentity = <String, LiveMessage>{};
  for (final item in values) {
    if (item.threadId != threadId) continue;
    final idempotency = '${item.meta['idempotency_key'] ?? ''}'.trim();
    final event =
        '${item.meta['event_id'] ?? item.meta['dedupe_key'] ?? ''}'.trim();
    final identity = idempotency.isNotEmpty
        ? 'idem:$idempotency'
        : event.isNotEmpty
            ? 'event:$event'
            : 'id:${item.id}';
    byIdentity[identity] = item;
  }
  final result = byIdentity.values.toList()
    ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  return result;
}

extension LiveWaouhControllerMatches on LiveWaouhController {
  Future<LiveMatch?> resolveMatch(
    String key, {
    LiveMatch? seed,
  }) async {
    final cached = notifications.cachedMatch(key);
    if (cached != null) return cached;

    final active = await notifications.loadMatches(
      auth.user?.id,
      force: true,
    );
    final activeMatch = _findMatch(active, key, seed);
    if (activeMatch != null) return activeMatch;

    final archived = await notifications.loadMatches(
      auth.user?.id,
      archived: true,
    );
    return _findMatch(archived, key, seed);
  }

  Stream<List<LiveMessage>> matchMessages(LiveMatch match) {
    final threadId = match.threadId;
    if (threadId == null || threadId.isEmpty) {
      return Stream<List<LiveMessage>>.value(const <LiveMessage>[]);
    }
    late final StreamController<List<LiveMessage>> controller;
    final history = LiveMatchHistoryService(chat.client, session);
    Timer? safetyPoll;
    RealtimeChannel? realtime;
    var loading = false;
    var closed = false;

    Future<void> refresh() async {
      if (loading || closed) return;
      loading = true;
      try {
        final loaded = await history.load(
          match: match,
          authUserId: auth.user?.id,
        );
        final isolated = _isolatedMessages(loaded, threadId);
        _waouhThreadMessageCache[threadId] = isolated;
        if (!closed) controller.add(isolated);
      } catch (error, stackTrace) {
        if (!closed) controller.addError(error, stackTrace);
      } finally {
        loading = false;
      }
    }

    controller = StreamController<List<LiveMessage>>(
      onListen: () {
        final cached = _waouhThreadMessageCache[threadId];
        if (cached != null) controller.add(cached);
        unawaited(refresh());
        realtime = chat.client
            .channel('waouh_chat_meet_$threadId')
            .onPostgresChanges(
              event: PostgresChangeEvent.all,
              schema: 'public',
              table: 'waouh_messages',
              callback: (payload) {
                final currentThread = payload.newRecord['thread_id'] ??
                    payload.oldRecord['thread_id'];
                if ('$currentThread' == threadId) unawaited(refresh());
              },
            )
            .subscribe();
        safetyPoll = Timer.periodic(
          const Duration(seconds: 4),
          (_) => unawaited(refresh()),
        );
      },
      onCancel: () async {
        closed = true;
        safetyPoll?.cancel();
        if (realtime != null) await chat.client.removeChannel(realtime!);
      },
    );
    return controller.stream;
  }
}

LiveMatch? _findMatch(
  List<LiveMatch> values,
  String key,
  LiveMatch? seed,
) {
  for (final item in values) {
    if (item.key == key) return item;
  }
  if (seed == null) return null;

  final seedArticle = seed.articleId.trim();
  final seedCounterpart = seed.counterpartUserId?.trim() ?? '';
  final seedSearch = seed.searchRequestId?.trim() ?? '';
  final seedThread = seed.threadId?.trim() ?? '';

  for (final item in values) {
    final sameThread =
        seedThread.isNotEmpty && item.threadId?.trim() == seedThread;
    final sameSearch =
        seedSearch.isNotEmpty && item.searchRequestId?.trim() == seedSearch;
    final articleIsUsable =
        seedArticle.isNotEmpty && !seedArticle.startsWith('pending_');
    final sameArticle = articleIsUsable &&
        item.articleId == seedArticle &&
        item.role == seed.role;
    final sameCounterpart = seedCounterpart.isEmpty ||
        item.counterpartUserId?.trim() == seedCounterpart;
    if (sameThread || sameSearch || (sameArticle && sameCounterpart)) {
      return item;
    }
  }
  return null;
}
