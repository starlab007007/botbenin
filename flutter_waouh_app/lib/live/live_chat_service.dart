import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_models.dart';
import 'live_session.dart';

class LiveChatService {
  const LiveChatService(this.client, this.session);

  final SupabaseClient client;
  final LiveSessionStore session;

  Future<List<String>> waouhUserIds(String? authUserId) async {
    final sid = await session.sessionId;
    final clauses = <String>['web_session_id.eq.$sid'];
    if (authUserId != null && authUserId.isNotEmpty) {
      clauses.add('auth_user_id.eq.$authUserId');
    }
    final rows = await client
        .from('waouh_users')
        .select('id,auth_user_id,web_session_id')
        .or(clauses.join(','))
        .limit(100);

    // React useWaouhIdentity performs this best-effort link after sign-in.
    // Without it, a WAOUH identity made before login remains detached and its
    // message, match and notification history is invisible on Android.
    if (authUserId != null && authUserId.isNotEmpty) {
      for (final raw in rows as List) {
        final row = Map<String, dynamic>.from(raw as Map);
        final id = liveText(row['id']);
        final rowSession = liveText(row['web_session_id']);
        final rowAuth = liveText(row['auth_user_id']);
        if (id.isNotEmpty && rowSession == sid && rowAuth.isEmpty) {
          try {
            await client.from('waouh_users').update({'auth_user_id': authUserId}).eq('id', id);
          } catch (_) {
            // Keep read access working when an old RLS policy rejects linking.
          }
        }
      }
    }

    return (rows as List)
        .map((row) => liveText((row as Map)['id']))
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList();
  }

  Future<List<LiveMessage>> loadMainHistory({
    required String? authUserId,
    int limit = 150,
  }) async {
    final sid = await session.sessionId;
    final cutoff = await session.threadCutoff;
    final byId = <String, LiveMessage>{};
    try {
      final response = await client.functions.invoke('waouh-history', body: {
        'sessionId': sid,
        'authUserId': authUserId,
        'limit': limit,
        if (cutoff != null) 'since': cutoff,
        'includeMeta': true,
      });
      final data = response.data;
      if (data is Map && data['ok'] == true && data['messages'] is List) {
        for (final raw in data['messages'] as List) {
          if (raw is Map) {
            final message = LiveMessage.fromJson(Map<String, dynamic>.from(raw));
            byId[message.id] = message;
          }
        }
      }
    } catch (_) {
      // A deployed waouh-history function is preferred, but an older backend
      // remains readable through the scoped queries below.
    }

    if (byId.isEmpty) {
      final ownRows = await client
          .from('waouh_messages')
          .select('id,conversation_id,thread_id,user_id,article_id,direction,text,created_at,web_session_id,attachments,meta')
          .isFilter('thread_id', null)
          .eq('web_session_id', sid)
          .order('created_at', ascending: true)
          .limit(limit);
      for (final raw in ownRows as List) {
        final item = LiveMessage.fromJson(Map<String, dynamic>.from(raw as Map));
        byId[item.id] = item;
      }
      final ids = await waouhUserIds(authUserId);
      if (ids.isNotEmpty) {
        final siblingRows = await client
            .from('waouh_messages')
            .select('id,conversation_id,thread_id,user_id,article_id,direction,text,created_at,web_session_id,attachments,meta')
            .isFilter('thread_id', null)
            .inFilter('user_id', ids)
            .order('created_at', ascending: true)
            .limit(limit);
        for (final raw in siblingRows as List) {
          final item = LiveMessage.fromJson(Map<String, dynamic>.from(raw as Map));
          byId[item.id] = item;
        }
      }
    }

    final cutoffDate = cutoff == null ? null : DateTime.tryParse(cutoff);
    final values = byId.values
        .where((message) => cutoffDate == null || !message.createdAt.isBefore(cutoffDate))
        .toList();
    values.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return values;
  }

  Future<Map<String, dynamic>> sendMainMessage({
    required String text,
    required List<LiveAttachment> attachments,
    required String? authUserId,
    required String city,
    double? latitude,
    double? longitude,
    Map<String, dynamic> meta = const {},
  }) async {
    final sid = await session.sessionId;
    await waouhUserIds(authUserId);
    final response = await client.functions.invoke('waouh-channel-in', body: {
      'channel': 'web',
      'sessionId': sid,
      'text': text.trim(),
      'attachments': attachments.map((item) => item.toJson()).toList(),
      'lat': latitude,
      'lng': longitude,
      'city': city.trim(),
      'authUserId': authUserId,
      'meta': {'source': 'flutter_native', ...meta},
    });
    final data = response.data;
    if (data is Map && data['ok'] == false) {
      throw StateError(liveText(data['error'], 'Envoi WAOUH impossible'));
    }
    if (data is! Map) {
      throw StateError('Réponse WAOUH invalide');
    }
    return Map<String, dynamic>.from(data);
  }

  Future<List<LiveConversation>> loadConversations({
    required String? authUserId,
    required bool archived,
  }) async {
    if (archived) return const [];

    final sid = await session.sessionId;
    final ids = await waouhUserIds(authUserId);
    const fields = 'id,phone_number,channel,last_message,updated_at,user_id';
    final byId = <String, LiveConversation>{};

    if (ids.isNotEmpty) {
      final rows = await client
          .from('waouh_conversations')
          .select(fields)
          .inFilter('user_id', ids)
          .order('updated_at', ascending: false)
          .limit(200);
      for (final raw in rows as List) {
        final item = LiveConversation.fromJson(Map<String, dynamic>.from(raw as Map));
        if (item.id.isNotEmpty) byId[item.id] = item;
      }
    }

    // Exact ChatListScreen.tsx session fallback.
    final messageRows = await client
        .from('waouh_messages')
        .select('conversation_id')
        .eq('web_session_id', sid)
        .not('conversation_id', 'is', null)
        .order('created_at', ascending: false)
        .limit(500);
    final referenced = (messageRows as List)
        .map((raw) => liveText((raw as Map)['conversation_id']))
        .where((id) => id.isNotEmpty && !byId.containsKey(id))
        .toSet()
        .toList();
    if (referenced.isNotEmpty) {
      final extra = await client
          .from('waouh_conversations')
          .select(fields)
          .inFilter('id', referenced)
          .limit(200);
      for (final raw in extra as List) {
        final item = LiveConversation.fromJson(Map<String, dynamic>.from(raw as Map));
        if (item.id.isNotEmpty) byId[item.id] = item;
      }
    }

    final values = byId.values.toList();
    values.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return values;
  }

  Future<void> archiveConversation(String id) async {
    try {
      await client.from('waouh_conversations').update({'state': 'archived'}).eq('id', id);
    } catch (_) {
      await client.from('waouh_conversations').update({'archived': true}).eq('id', id);
    }
  }

  Future<List<LiveMessage>> loadConversationMessages(String id) async {
    final rows = await client
        .from('waouh_messages')
        .select('id,conversation_id,article_id,direction,text,created_at,attachments,meta')
        .eq('conversation_id', id)
        .order('created_at', ascending: true)
        .limit(300);
    return (rows as List)
        .map((raw) => LiveMessage.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  Future<void> sendConversationMessage({
    required String conversationId,
    required String text,
    required String? authUserId,
  }) async {
    final response = await client.functions.invoke('waouh-operator-send', body: {
      'conversation_id': conversationId,
      'message': text.trim(),
      'auth_user_id': authUserId,
      'source': 'flutter_native',
    });
    final data = response.data;
    if (data is Map && data['ok'] == false) {
      throw StateError(liveText(data['error'], 'Réponse impossible'));
    }
  }
}
