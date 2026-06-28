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
    int limit = 80,
    String? before,
  }) async {
    final sessionId = await session.sessionId;
    try {
      final response = await client.functions.invoke('waouh-match-history', body: {
        'articleId': match.articleId,
        'sessionId': sessionId,
        'authUserId': authUserId,
        'role': match.role,
        'notificationId': match.notificationIds.isEmpty ? null : match.notificationIds.first,
        'counterpartUserId': match.role == 'seller' ? match.counterpartUserId : null,
        'before': before,
        'limit': limit,
        'includeMeta': true,
      });
      final data = response.data;
      if (data is Map && data['ok'] == true && data['messages'] is List) {
        return (data['messages'] as List)
            .whereType<Map>()
            .map((raw) => LiveMessage.fromJson(Map<String, dynamic>.from(raw)))
            .toList();
      }
    } catch (_) {
      // Read-only fallback for older deployments without the history function.
    }

    final rows = await client
        .from('waouh_messages')
        .select('id,conversation_id,article_id,direction,text,created_at,attachments,meta')
        .eq('article_id', match.articleId)
        .order('created_at', ascending: true)
        .limit(limit);
    return (rows as List)
        .map((raw) => LiveMessage.fromJson(Map<String, dynamic>.from(raw as Map)))
        .where((message) {
          if (match.role != 'seller' || match.counterpartUserId == null) return true;
          final counterpart = message.meta['counterpart_user_id'] ?? message.meta['buyer_user_id'];
          return counterpart == null || '$counterpart' == match.counterpartUserId;
        })
        .toList();
  }
}
