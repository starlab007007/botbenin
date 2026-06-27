import 'package:shared_preferences/shared_preferences.dart';

import 'live_chat_service.dart';
import 'live_models.dart';
import 'live_session.dart';

class LiveNotificationService {
  const LiveNotificationService(this.chat, this.session);

  final LiveChatService chat;
  final LiveSessionStore session;

  Future<List<LiveNotification>> load(String? authUserId) async {
    final sid = await session.sessionId;
    final ids = await chat.waouhUserIds(authUserId);
    final filters = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) filters.add('user_id.in.(${ids.join(',')})');

    final rows = await chat.client
        .from('waouh_notifications')
        .select('id,title,content,body,message,notification_type,type,action_url,article_id,conversation_id,payload,metadata,opened,read_at,sent_at,created_at,user_id,web_session_id,photos')
        .or(filters.join(','))
        .order('sent_at', ascending: false)
        .limit(150);
    return (rows as List)
        .map((raw) => LiveNotification.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  Future<void> markRead(String id) => chat.client
      .from('waouh_notifications')
      .update({'opened': true, 'read_at': DateTime.now().toUtc().toIso8601String()})
      .eq('id', id);

  Future<void> markAllRead(String? authUserId) async {
    final sid = await session.sessionId;
    final ids = await chat.waouhUserIds(authUserId);
    final filters = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) filters.add('user_id.in.(${ids.join(',')})');
    await chat.client
        .from('waouh_notifications')
        .update({'opened': true, 'read_at': DateTime.now().toUtc().toIso8601String()})
        .or(filters.join(','));
  }

  Future<List<LiveMatch>> loadMatches(String? authUserId, {bool archived = false}) async {
    final sid = await session.sessionId;
    final ids = await chat.waouhUserIds(authUserId);
    final filters = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) filters.add('user_id.in.(${ids.join(',')})');

    final rows = await chat.client
        .from('waouh_notifications')
        .select('id,notification_type,type,payload,photos,sent_at,created_at,article_id,opened,read_at,user_id,web_session_id')
        .inFilter('notification_type', const ['match', 'match_buyer', 'match_seller', 'new_buyer', 'radar_match'])
        .or(filters.join(','))
        .order('sent_at', ascending: false)
        .limit(200);

    final merged = <String, LiveMatch>{};
    for (final raw in rows as List) {
      final row = Map<String, dynamic>.from(raw as Map);
      final item = LiveMatch.fromNotification(row);
      if (item.articleId.isEmpty) continue;
      merged[item.key] = merged[item.key]?.merge(item) ?? item;
    }

    await _addMessageFallback(merged, sid, ids);

    final archivedKeys = await _archivedKeys(sid);
    final values = merged.values
        .where((item) => archived ? archivedKeys.contains(item.key) : !archivedKeys.contains(item.key))
        .toList();
    values.sort((a, b) => b.lastAt.compareTo(a.lastAt));
    return values;
  }

  Future<void> _addMessageFallback(
    Map<String, LiveMatch> merged,
    String sid,
    List<String> userIds,
  ) async {
    try {
      final since = DateTime.now().subtract(const Duration(days: 30)).toUtc().toIso8601String();
      final rows = <Map<String, dynamic>>[];
      final sessionRows = await chat.client
          .from('waouh_messages')
          .select('article_id,created_at,meta,web_session_id,user_id')
          .eq('web_session_id', sid)
          .not('article_id', 'is', null)
          .gte('created_at', since)
          .order('created_at', ascending: false)
          .limit(300);
      rows.addAll(sessionRows.map((raw) => Map<String, dynamic>.from(raw as Map)));
      if (userIds.isNotEmpty) {
        final siblingRows = await chat.client
            .from('waouh_messages')
            .select('article_id,created_at,meta,web_session_id,user_id')
            .inFilter('user_id', userIds)
            .not('article_id', 'is', null)
            .gte('created_at', since)
            .order('created_at', ascending: false)
            .limit(300);
        rows.addAll(siblingRows.map((raw) => Map<String, dynamic>.from(raw as Map)));
      }

      final stubs = <String, Map<String, dynamic>>{};
      for (final row in rows) {
        final meta = liveMap(row['meta']);
        final articleId = liveText(row['article_id'] ?? meta['article_id']);
        if (articleId.isEmpty) continue;
        final role = meta['role'] == 'seller' ? 'seller' : 'buyer';
        final counterpart = (meta['counterpart_user_id'] ?? meta['buyer_user_id'])?.toString();
        final key = liveMatchKey(articleId, role, role == 'seller' ? counterpart : null);
        if (merged.containsKey(key) || stubs.containsKey(key)) continue;
        stubs[key] = {
          'articleId': articleId,
          'role': role,
          'counterpart': counterpart,
          'createdAt': row['created_at'],
          'buyerProfileId': meta['buyer_profile_id'],
        };
      }
      if (stubs.isEmpty) return;

      final articleIds = stubs.values.map((item) => item['articleId'].toString()).toSet().toList();
      final articleRows = await chat.client
          .from('waouh_articles')
          .select('id,title,price,city,photos')
          .inFilter('id', articleIds);
      final articles = <String, Map<String, dynamic>>{
        for (final raw in articleRows)
          liveText((raw as Map)['id']): Map<String, dynamic>.from(raw),
      };
      for (final entry in stubs.entries) {
        final stub = entry.value;
        final article = articles[liveText(stub['articleId'])] ?? const <String, dynamic>{};
        final photos = liveStringList(article['photos']);
        merged[entry.key] = LiveMatch(
          key: entry.key,
          articleId: liveText(stub['articleId']),
          role: liveText(stub['role']),
          title: liveText(article['title'], 'Annonce'),
          lastAt: liveDate(stub['createdAt']),
          buyerProfileId: stub['buyerProfileId']?.toString(),
          counterpartUserId: stub['counterpart']?.toString(),
          price: article['price'] is num ? article['price'] as num : num.tryParse('${article['price'] ?? ''}'),
          city: article['city']?.toString(),
          photo: photos.isEmpty ? null : photos.first,
        );
      }
    } catch (_) {
      // Notification rows remain primary when current RLS blocks the fallback.
    }
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
    final prefs = await SharedPreferences.getInstance();
    return liveDecodeSet(prefs.getString('waouh_archived_matches_$sid'));
  }

  Future<void> _saveArchivedKeys(String sid, Set<String> values) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('waouh_archived_matches_$sid', liveEncodeSet(values));
  }
}
