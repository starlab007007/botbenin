import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/local_identity.dart';
import '../domain/chat_models.dart';

class ChatReader {
  ChatReader(this.client, this.identity);
  final SupabaseClient client;
  final LocalIdentity identity;

  Future<List<ChatMessage>> load({int limit = 30}) async {
    final result = await client.functions.invoke('waouh-history', body: {
      'sessionId': identity.sessionId,
      'authUserId': client.auth.currentUser?.id,
      'limit': limit,
      if (identity.threadCutoff != null) 'since': identity.threadCutoff,
    });
    final data = result.data;
    if (data is Map && data['messages'] is List) {
      return (data['messages'] as List)
          .whereType<Map>()
          .map((row) => ChatMessage.fromJson(Map<String, dynamic>.from(row)))
          .toList();
    }
    return const [];
  }

  Stream<List<ChatMessage>> stream() => client
      .from('waouh_messages')
      .stream(primaryKey: ['id'])
      .eq('web_session_id', identity.sessionId)
      .order('created_at')
      .map((rows) => rows
          .map((row) => ChatMessage.fromJson(Map<String, dynamic>.from(row)))
          .toList());
}
