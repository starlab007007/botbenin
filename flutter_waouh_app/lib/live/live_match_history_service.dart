import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_models.dart';
import 'live_session.dart';

class LiveMatchHistoryResult {
  const LiveMatchHistoryResult({
    required this.messages,
    required this.ok,
    this.resolvedThreadId,
    this.articleStatus,
  });

  final List<LiveMessage> messages;
  final bool ok;
  final String? resolvedThreadId;
  final String? articleStatus;

  factory LiveMatchHistoryResult.fromResponse(
    dynamic raw, {
    required LiveMatch match,
  }) {
    final data = liveMap(raw);
    if (data['ok'] != true) {
      return const LiveMatchHistoryResult(
        messages: <LiveMessage>[],
        ok: false,
      );
    }

    final resolvedThreadId = liveExtractThreadId(<String, dynamic>{
      'resolved_thread_id': data['resolved_thread_id'],
      'thread_id': data['thread_id'],
      'conversation_scope': data['conversation_scope'],
      'conversationScope': data['conversationScope'],
    });
    final messages = <LiveMessage>[];
    final seen = <String>{};

    void addMessage(Map<String, dynamic> row) {
      final normalized = <String, dynamic>{...row};
      final currentThread = liveExtractThreadId(normalized);
      if (currentThread == null && resolvedThreadId != null) {
        normalized['thread_id'] = resolvedThreadId;
      }
      normalized.putIfAbsent(
        'article_id',
        () => match.isSearch ? null : match.articleId,
      );
      final message = LiveMessage.fromJson(normalized);
      if (!liveMessageBelongsToMatch(
        message,
        match,
        authoritativeThreadId: resolvedThreadId,
      )) {
        return;
      }
      final idempotency = liveText(message.meta['idempotency_key']).trim();
      final event = liveText(
        message.meta['event_id'] ?? message.meta['dedupe_key'],
      ).trim();
      final identity = idempotency.isNotEmpty
          ? 'idem:$idempotency'
          : event.isNotEmpty
              ? 'event:$event'
              : 'id:${message.id}';
      if (seen.add(identity)) messages.add(message);
    }

    final rawMessages = data['messages'];
    if (rawMessages is List) {
      for (final rawMessage in rawMessages.whereType<Map>()) {
        addMessage(Map<String, dynamic>.from(rawMessage));
      }
    }

    if (messages.isEmpty) {
      final seed = liveMap(data['seedNotification']);
      final payload = liveMap(seed['payload']);
      final text = liveVisibleText(
        seed['text'] ?? payload['text'] ?? payload['message'],
      );
      if (text.isNotEmpty) {
        addMessage(<String, dynamic>{
          'id': 'notification-${resolvedThreadId ?? match.key}',
          if (resolvedThreadId != null) 'thread_id': resolvedThreadId,
          'article_id': match.isSearch ? null : match.articleId,
          'direction': 'out',
          'text': text,
          'created_at': seed['sent_at'],
          'attachments': payload['photos'] ?? payload['attachments'],
          'meta': <String, dynamic>{
            ...payload,
            if (resolvedThreadId != null) 'thread_id': resolvedThreadId,
            if (!match.isSearch) 'article_id': match.articleId,
            if (match.counterpartUserId != null)
              'counterpart_user_id': match.counterpartUserId,
          },
        });
      }
    }

    messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return LiveMatchHistoryResult(
      messages: messages,
      ok: true,
      resolvedThreadId: resolvedThreadId,
      articleStatus: liveText(data['articleStatus']).trim().isEmpty
          ? null
          : liveText(data['articleStatus']).trim(),
    );
  }
}

class LiveMatchHistoryService {
  const LiveMatchHistoryService(this.client, this.session);

  final SupabaseClient client;
  final LiveSessionStore session;

  Future<LiveMatchHistoryResult> loadResult({
    required LiveMatch match,
    required String? authUserId,
    int limit = 250,
    String? before,
  }) async {
    final sessionId = await session.sessionId;
    final threadId = match.threadId?.trim() ?? '';

    if (threadId.isNotEmpty) {
      try {
        var directQuery = client
            .from('waouh_messages')
            .select(
              'id,conversation_id,thread_id,article_id,direction,text,'
              'created_at,attachments,meta,user_id,web_session_id',
            )
            .eq('thread_id', threadId);
        if (before != null && before.isNotEmpty) {
          directQuery = directQuery.lt('created_at', before);
        }
        final directRows = await directQuery
            .order('created_at', ascending: false)
            .limit(limit);
        final direct = (directRows as List)
            .whereType<Map>()
            .map((row) => LiveMessage.fromJson(
                  Map<String, dynamic>.from(row),
                ))
            .where((message) => liveMessageBelongsToMatch(
                  message,
                  match,
                  authoritativeThreadId: threadId,
                ))
            .toList()
            .reversed
            .toList(growable: false);
        if (direct.isNotEmpty) {
          return LiveMatchHistoryResult(
            messages: direct,
            ok: true,
            resolvedThreadId: threadId,
          );
        }
      } catch (_) {
        // La fonction Edge autoritaire reste le repli quand la RLS refuse la
        // lecture directe ou lorsque les anciennes lignes n'ont pas thread_id.
      }
    }

    try {
      final response = await client.functions.invoke(
        'waouh-match-history',
        body: <String, dynamic>{
          'threadId': threadId.isEmpty ? null : threadId,
          'matchKey': match.key,
          'articleId': match.articleId,
          'sessionId': sessionId,
          'authUserId': authUserId,
          'role': match.role,
          'notificationId': match.notificationIds.isEmpty
              ? null
              : match.notificationIds.first,
          'counterpartUserId': match.counterpartUserId,
          'buyerUserId': match.buyerUserId,
          'sellerUserId': match.sellerUserId,
          'before': before,
          'limit': limit,
          'includeMeta': true,
        },
      );
      final result = LiveMatchHistoryResult.fromResponse(
        response.data,
        match: match,
      );
      if (result.ok) return result;
    } catch (_) {
      // Le flux conserve le cache local et réessaie par le polling de sûreté.
    }

    return LiveMatchHistoryResult(
      messages: const <LiveMessage>[],
      ok: false,
      resolvedThreadId: threadId.isEmpty ? null : threadId,
    );
  }

  Future<List<LiveMessage>> load({
    required LiveMatch match,
    required String? authUserId,
    int limit = 250,
    String? before,
  }) async {
    final result = await loadResult(
      match: match,
      authUserId: authUserId,
      limit: limit,
      before: before,
    );
    return result.messages;
  }
}
