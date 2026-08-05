import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_controller.dart';
import 'live_match_history_service.dart';
import 'live_thread_flow.dart';
import 'live_models.dart';

final Map<String, List<LiveMessage>> _waouhScopeMessageCache =
    <String, List<LiveMessage>>{};

List<LiveMessage> _isolatedMessages(
  List<LiveMessage> values,
  LiveMatch match, {
  String? authoritativeThreadId,
}) {
  final byIdentity = <String, LiveMessage>{};
  for (final item in values) {
    if (!liveMessageBelongsToMatch(
      item,
      match,
      authoritativeThreadId: authoritativeThreadId,
    )) {
      continue;
    }
    final idempotency = liveText(item.meta['idempotency_key']).trim();
    final event = liveText(
      item.meta['event_id'] ?? item.meta['dedupe_key'],
    ).trim();
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
  Future<LiveMatch?> resolveMatch(String key) async {
    final cached = notifications.cachedMatch(key);
    if (cached != null) return cached;

    // Compatibilité avec les anciens favoris/routes `meet_<thread_id>`.
    // Les nouvelles fenêtres utilisent la clé Web article × rôle × interlocuteur.
    final legacyThreadId =
        key.startsWith('meet_') && key.length > 5 ? key.substring(5) : '';

    bool matches(LiveMatch item) =>
        item.key == key ||
        (legacyThreadId.isNotEmpty && item.threadId?.trim() == legacyThreadId);

    final active = await notifications.loadMatches(
      auth.user?.id,
      force: true,
    );
    for (final item in active) {
      if (matches(item)) return item;
    }
    final archived =
        await notifications.loadMatches(auth.user?.id, archived: true);
    for (final item in archived) {
      if (matches(item)) return item;
    }
    return null;
  }

  Stream<List<LiveMessage>> matchMessages(LiveMatch initialMatch) {
    late final StreamController<List<LiveMessage>> controller;
    final history = LiveMatchHistoryService(chat.client, session);
    final cacheKey = liveMatchMessageCacheKey(
      match: initialMatch,
      authUserId: auth.user?.id,
      controllerIdentity: identityHashCode(this),
    );
    Timer? safetyPoll;
    RealtimeChannel? realtime;
    var effectiveMatch = initialMatch;
    var loading = false;
    var closed = false;

    Future<void> refresh() async {
      if (loading || closed) return;
      loading = true;
      try {
        final result = await history.loadResult(
          match: effectiveMatch,
          authUserId: auth.user?.id,
        );
        final resolvedThread = result.resolvedThreadId?.trim() ?? '';
        if (resolvedThread.isNotEmpty &&
            effectiveMatch.threadId?.trim() != resolvedThread) {
          effectiveMatch = reconcileAuthoritativeMatchThread(
            effectiveMatch,
            resolvedThread,
          );
        }
        final isolated = _isolatedMessages(
          result.messages,
          effectiveMatch,
          authoritativeThreadId:
              resolvedThread.isEmpty ? effectiveMatch.threadId : resolvedThread,
        );
        if (isolated.isNotEmpty || result.ok) {
          _waouhScopeMessageCache[cacheKey] = isolated;
          if (!closed) controller.add(isolated);
        }
      } catch (error, stackTrace) {
        final cached = _waouhScopeMessageCache[cacheKey];
        if (!closed && (cached == null || cached.isEmpty)) {
          controller.addError(error, stackTrace);
        }
      } finally {
        loading = false;
      }
    }

    bool recordBelongsToScope(Map<String, dynamic> record) {
      if (record.isEmpty) return false;
      final message = LiveMessage.fromJson(record);
      return liveMessageBelongsToMatch(
        message,
        effectiveMatch,
        authoritativeThreadId: effectiveMatch.threadId,
      );
    }

    controller = StreamController<List<LiveMessage>>(
      onListen: () {
        final cached = _waouhScopeMessageCache[cacheKey];
        if (cached != null) controller.add(cached);
        unawaited(refresh());

        // Le canal démarre immédiatement, même sans thread_id. La RLS limite
        // les lignes visibles et le filtre local impose article + interlocuteur.
        // Une récupération Edge toutes les quatre secondes couvre aussi les
        // anciennes lignes où article_id ou thread_id n'est présent que dans meta.
        realtime = chat.client
            .channel(
                'waouh_chat_scope_${cacheKey}_${DateTime.now().microsecondsSinceEpoch}')
            .onPostgresChanges(
              event: PostgresChangeEvent.all,
              schema: 'public',
              table: 'waouh_messages',
              callback: (payload) {
                final current = payload.newRecord.isNotEmpty
                    ? payload.newRecord
                    : payload.oldRecord;
                if (recordBelongsToScope(current)) unawaited(refresh());
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
