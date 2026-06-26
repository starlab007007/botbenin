import 'live_chat_service.dart';
import 'live_models.dart';
import 'live_session.dart';

class LiveNotificationService {
  const LiveNotificationService(this.chat, this.session);

  final LiveChatService chat;
  final LiveSessionStore session;

  Future<List<LiveNotification>> load(String? authUserId) async {
    final ids = await chat.waouhUserIds(authUserId);
    if (ids.isEmpty) return const [];
    final rows = await chat.client
        .from('waouh_notifications')
        .select('id,title,content,body,message,notification_type,type,action_url,article_id,conversation_id,payload,metadata,opened,read_at,sent_at,created_at,user_id')
        .inFilter('user_id', ids)
        .order('sent_at', ascending: false)
        .limit(100);
    return (rows as List)
        .map((raw) => LiveNotification.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  Future<void> markRead(String id) => chat.client
      .from('waouh_notifications')
      .update({'opened': true, 'read_at': DateTime.now().toUtc().toIso8601String()})
      .eq('id', id);

  Future<void> markAllRead(String? authUserId) async {
    final ids = await chat.waouhUserIds(authUserId);
    if (ids.isEmpty) return;
    await chat.client
        .from('waouh_notifications')
        .update({'opened': true, 'read_at': DateTime.now().toUtc().toIso8601String()})
        .inFilter('user_id', ids);
  }

  Future<List<LiveMatch>> loadMatches(String? authUserId, {bool archived = false}) async {
    final sid = await session.sessionId;
    final ids = await chat.waouhUserIds(authUserId);
    final rows = await chat.client
        .from('waouh_notifications')
        .select('id,notification_type,payload,photos,sent_at,created_at,article_id,opened,read_at,user_id,web_session_id')
        .inFilter('notification_type', const ['match', 'match_buyer', 'match_seller', 'new_buyer', 'radar_match'])
        .order('sent_at', ascending: false)
        .limit(200);
    final merged = <String, LiveMatch>{};
    for (final raw in rows as List) {
      final row = Map<String, dynamic>.from(raw as Map);
      if (row['web_session_id'] != sid && !ids.contains('${row['user_id']}')) continue;
      final item = LiveMatch.fromNotification(row);
      if (item.articleId.isEmpty) continue;
      merged[item.key] = merged[item.key]?.merge(item) ?? item;
    }
    final archivedKeys = await _archivedKeys(sid);
    final values = merged.values
        .where((item) => archived ? archivedKeys.contains(item.key) : !archivedKeys.contains(item.key))
        .toList();
    values.sort((a, b) => b.lastAt.compareTo(a.lastAt));
    return values;
  }

  Future<void> setMatchArchived(LiveMatch item, bool archived) async {
    final sid = await session.sessionId;
    final values = await _archivedKeys(sid);
    if (archived) {
      values.add(item.key);
    } else {
      values.remove(item.key);
    }
    await _saveArchivedKeys(sid, values);
  }

  Future<Set<String>> _archivedKeys(String sid) async {
    final prefs = await _preferences();
    return liveDecodeSet(prefs.getString('waouh_archived_matches_$sid'));
  }

  Future<void> _saveArchivedKeys(String sid, Set<String> values) async {
    final prefs = await _preferences();
    await prefs.setString('waouh_archived_matches_$sid', liveEncodeSet(values));
  }

  Future<dynamic> _preferences() async {
    // SharedPreferences is kept behind the same session store so all mobile
    // match archive keys are isolated per WAOUH web session.
    await session.initialize();
    return await _sharedPreferences();
  }
}
