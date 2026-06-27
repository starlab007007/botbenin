import 'package:shared_preferences/shared_preferences.dart';

import 'live_chat_service.dart';
import 'live_models.dart';
import 'live_session.dart';

class LiveNotificationService {
  const LiveNotificationService(this.chat, this.session);

  final LiveChatService chat;
  final LiveSessionStore session;

  Future<List<LiveNotification>> load(String? authUserId) async {
    final scope = await _scope(authUserId);
    final rows = await chat.client
        .from('waouh_notifications')
        // Keep this projection aligned with the React contract. Older Supabase
        // deployments do not expose title/body/type/action_url columns here.
        .select('id,notification_type,payload,photos,sent_at,article_id,opened,user_id,web_session_id')
        .or(scope.orClause)
        .order('sent_at', ascending: false)
        .limit(250);
    return (rows as List)
        .map((raw) => LiveNotification.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  Future<void> markRead(String id) => chat.client
      .from('waouh_notifications')
      .update({'opened': true})
      .eq('id', id);

  Future<void> markAllRead(String? authUserId) async {
    final scope = await _scope(authUserId);
    await chat.client
        .from('waouh_notifications')
        .update({'opened': true})
        .or(scope.orClause);
  }

  Future<List<LiveMatch>> loadMatches(String? authUserId, {bool archived = false}) async {
    final scope = await _scope(authUserId);
    final rows = await chat.client
        .from('waouh_notifications')
        .select('id,notification_type,payload,photos,sent_at,article_id,opened,user_id,web_session_id')
        .or(scope.orClause)
        .order('sent_at', ascending: false)
        .limit(300);

    const matchTypes = {'match', 'match_buyer', 'match_seller', 'new_buyer', 'radar_match'};
    final merged = <String, LiveMatch>{};
    for (final raw in rows as List) {
      final row = Map<String, dynamic>.from(raw as Map);
      final payload = liveMap(row['payload']);
      final type = liveText(row['notification_type']).toLowerCase();
      final articleId = liveText(row['article_id'] ?? payload['article_id']);
      if (!matchTypes.contains(type) || articleId.isEmpty) continue;
      // Backfill article_id when an older notification stores it only in payload.
      row['article_id'] = articleId;
      final item = LiveMatch.fromNotification(row);
      merged[item.key] = merged[item.key]?.merge(item) ?? item;
    }

    await _addMessageFallback(merged, scope);

    final archivedKeys = await _archivedKeys(scope.storageKey);
    final values = merged.values
        .where((item) => archived ? archivedKeys.contains(item.key) : !archivedKeys.contains(item.key))
        .toList();
    values.sort((a, b) => b.lastAt.compareTo(a.lastAt));
    return values;
  }

  Future<void> _addMessageFallback(
    Map<String, LiveMatch> merged,
    _ViewerScope scope,
  ) async {
    try {
      final since = DateTime.now().subtract(const Duration(days: 30)).toUtc().toIso8601String();
      final rows = <Map<String, dynamic>>[];

      // Exact React fallback: it accepts both physical article_id and legacy
      // meta.article_id rows. Flutter previously lost the latter entirely.
      final ownRows = await chat.client
          .from('waouh_messages')
          .select('article_id,created_at,meta,user_id,web_session_id')
          .or('article_id.not.is.null,meta->>article_id.not.is.null')
          .or(scope.orClause)
          .gte('created_at', since)
          .order('created_at', ascending: false)
          .limit(500);
      rows.addAll(ownRows.map((raw) => Map<String, dynamic>.from(raw as Map)));

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
      // Notification data remains the source of truth when a legacy RLS policy
      // rejects the message fallback query.
    }
  }

  Future<void> setMatchArchived(LiveMatch item, bool archived) async {
    final scope = await _scope(null);
    final values = await _archivedKeys(scope.storageKey);
    if (archived) {
      values.add(item.key);
    } else {
      values.remove(item.key);
    }
    await _saveArchivedKeys(scope.storageKey, values);
  }

  Future<_ViewerScope> _scope(String? authUserId) async {
    final sid = await session.sessionId;
    final ids = await chat.waouhUserIds(authUserId);
    final clauses = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) clauses.add('user_id.in.(${ids.join(',')})');
    final key = authUserId == null || authUserId.isEmpty ? sid : 'auth_$authUserId';
    return _ViewerScope(orClause: clauses.join(','), storageKey: key);
  }

  Future<Set<String>> _archivedKeys(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return liveDecodeSet(prefs.getString('waouh_archived_matches_$key'));
  }

  Future<void> _saveArchivedKeys(String key, Set<String> values) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('waouh_archived_matches_$key', liveEncodeSet(values));
  }
}

class _ViewerScope {
  const _ViewerScope({required this.orClause, required this.storageKey});
  final String orClause;
  final String storageKey;
}
