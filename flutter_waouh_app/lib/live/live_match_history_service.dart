import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_models.dart';
import 'live_session.dart';

class LiveMatchHistoryService {
  const LiveMatchHistoryService(this.client, this.session);

  final SupabaseClient client;
  final LiveSessionStore session;

  Future<List<LiveMessage>> load({
    required LiveMatch match,
    required String? authUserId,
    int limit = 250,
    String? before,
  }) async {
    final sessionId = await session.sessionId;
    if (match.threadId != null && match.threadId!.isNotEmpty) {
      try {
        var directQuery = client
            .from('waouh_messages')
            .select(
                'id,conversation_id,thread_id,article_id,direction,text,created_at,attachments,meta')
            .eq('thread_id', match.threadId!);
        if (before != null && before.isNotEmpty) {
          directQuery = directQuery.lt('created_at', before);
        }
        final directRows = await directQuery
            .order('created_at', ascending: false)
            .limit(limit);
        final direct = (directRows as List)
            .map((raw) => LiveMessage.fromJson(
                Map<String, dynamic>.from(raw as Map)))
            .where((message) => message.threadId == match.threadId)
            .toList()
            .reversed
            .toList(growable: false);
        if (direct.isNotEmpty) return direct;
      } catch (_) {
        // La fonction sécurisée ci-dessous reste le repli si la RLS refuse
        // exceptionnellement la lecture directe.
      }
    }
    try {
      final response = await client.functions.invoke('waouh-match-history', body: {
        'threadId': match.threadId,
        'matchKey': match.key,
        'articleId': match.articleId,
        'sessionId': sessionId,
        'authUserId': authUserId,
        'role': match.role,
        'notificationId': match.notificationIds.isEmpty ? null : match.notificationIds.first,
        'counterpartUserId': match.counterpartUserId,
        'buyerUserId': match.buyerUserId,
        'sellerUserId': match.sellerUserId,
        'before': before,
        'limit': limit,
        'includeMeta': true,
      });
      final data = response.data;
      if (data is Map && data['ok'] == true && data['messages'] is List) {
        final messages = (data['messages'] as List)
            .whereType<Map>()
            .map((raw) => LiveMessage.fromJson(Map<String, dynamic>.from(raw)))
            .where((message) => message.threadId == match.threadId)
            .toList();
        if (messages.isNotEmpty) return messages;
        final seed = data['seedNotification'];
        if (seed is Map) {
          final payload = liveMap(seed['payload']);
          final text = liveVisibleText(payload['text'] ?? payload['message']);
          if (text.isNotEmpty) {
            return <LiveMessage>[
              LiveMessage.fromJson(<String, dynamic>{
                'id': 'notification-${match.threadId}',
                'thread_id': match.threadId,
                'article_id': match.isSearch ? null : match.articleId,
                'direction': 'out',
                'text': text,
                'created_at': seed['sent_at'],
                'attachments': payload['photos'],
                'meta': <String, dynamic>{
                  ...payload,
                  'thread_id': match.threadId,
                },
              }),
            ];
          }
        }
        return const <LiveMessage>[];
      }
    } catch (_) {
      // Read-only fallback for older deployments without the history function.
    }

    if (match.threadId == null || match.threadId!.isEmpty) {
      // Ne jamais retomber sur tous les messages d'un article : en cas de
      // backend ancien/indisponible, une fenêtre vide est préférable à un
      // mélange entre plusieurs acheteurs ou produits.
      return const <LiveMessage>[];
    }
    return const <LiveMessage>[];
  }
}
