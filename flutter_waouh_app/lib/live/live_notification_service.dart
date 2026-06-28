import 'package:shared_preferences/shared_preferences.dart';

import 'live_chat_service.dart';
import 'live_models.dart';
import 'live_session.dart';

class LiveNotificationService {
  const LiveNotificationService(this.chat, this.session);

  final LiveChatService chat;
  final LiveSessionStore session;

  Future<List<LiveNotification>> load(String? authUserId) async {
    final scope = await _notificationScope(authUserId);
    final byId = <String, LiveNotification>{};

    // 1) Legacy/operational notification queue: sale, delivery, payment, etc.
    // This is part of the React bell history and must be displayed beside the
    // unified in-app notification table.
    if (scope.queueOrClause.isNotEmpty) {
      try {
        final queued = await chat.client
            .from('waouh_outbound_queue')
            .select('id,template,payload,created_at,image_url,message_id,transaction_id')
            .or(scope.queueOrClause)
            .order('created_at', ascending: false)
            .limit(100);
        for (final raw in queued as List) {
          final row = Map<String, dynamic>.from(raw as Map);
          final payload = <String, dynamic>{...liveMap(row['payload'])};
          if (row['image_url'] != null) payload['image_url'] = row['image_url'];
          final template = liveText(row['template']);
          final item = LiveNotification(
            id: liveText(row['id']),
            title: _notificationTitle(template),
            body: _notificationBody(template, payload),
            createdAt: liveDate(row['created_at']),
            // Queue entries are historical; React places them in History.
            read: true,
            type: template,
            articleId: payload['article_id']?.toString(),
            conversationId: payload['conversation_id']?.toString(),
            payload: payload,
          );
          if (item.id.isNotEmpty) byId[item.id] = item;
        }
      } catch (_) {
        // Some deployments only use unified waouh_notifications.
      }
    }

    // 2) Unified in-app notifications. Projection matches React exactly; do
    // not request optional columns not present in earlier database schemas.
    if (scope.unifiedOrClause.isNotEmpty) {
      final rows = await chat.client
          .from('waouh_notifications')
          .select('id,notification_type,payload,photos,sent_at,article_id,opened,web_session_id,user_id')
          .or(scope.unifiedOrClause)
          .order('sent_at', ascending: false)
          .limit(150);
      for (final raw in rows as List) {
        final row = Map<String, dynamic>.from(raw as Map);
        final payload = <String, dynamic>{...liveMap(row['payload'])};
        final photos = liveStringList(row['photos']);
        if (photos.isNotEmpty && payload['photos'] == null) payload['photos'] = photos;
        final template = liveText(row['notification_type']);
        final item = LiveNotification(
          id: liveText(row['id']),
          title: _notificationTitle(template),
          body: _notificationBody(template, payload),
          createdAt: liveDate(row['sent_at']),
          read: row['opened'] == true,
          type: template,
          articleId: (row['article_id'] ?? payload['article_id'])?.toString(),
          conversationId: payload['conversation_id']?.toString(),
          payload: payload,
        );
        if (item.id.isNotEmpty) byId[item.id] = item;
      }
    }

    final values = byId.values.toList();
    values.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return values;
  }

  Future<void> markRead(String id) async {
    // Queue entries are historical/read-only. Updating the unified table is a
    // safe best-effort operation; a missing row simply has no effect.
    try {
      await chat.client.from('waouh_notifications').update({'opened': true}).eq('id', id);
    } catch (_) {}
  }

  Future<void> markAllRead(String? authUserId) async {
    final scope = await _notificationScope(authUserId);
    if (scope.unifiedOrClause.isEmpty) return;
    await chat.client
        .from('waouh_notifications')
        .update({'opened': true})
        .or(scope.unifiedOrClause);
  }

  Future<List<LiveMatch>> loadMatches(String? authUserId, {bool archived = false}) async {
    final scope = await _matchScope(authUserId);
    final rows = await chat.client
        .from('waouh_notifications')
        .select('id,notification_type,payload,photos,sent_at,article_id,opened,user_id,web_session_id')
        .or(scope.unifiedOrClause)
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
      final rows = await chat.client
          .from('waouh_messages')
          .select('article_id,created_at,meta,user_id,web_session_id')
          .or('article_id.not.is.null,meta->>article_id.not.is.null')
          .or(scope.unifiedOrClause)
          .gte('created_at', since)
          .order('created_at', ascending: false)
          .limit(500);

      final stubs = <String, Map<String, dynamic>>{};
      for (final raw in rows as List) {
        final row = Map<String, dynamic>.from(raw as Map);
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
      // Unified notifications remain available if an older RLS policy rejects
      // the article-message fallback query.
    }
  }

  Future<void> setMatchArchived(LiveMatch item, bool archived) async {
    // React persists match archives per device session, including for logged-in
    // users. The same key keeps React and Flutter archive behaviour aligned.
    final sid = await session.sessionId;
    final values = await _archivedKeys(sid);
    if (archived) {
      values.add(item.key);
    } else {
      values.remove(item.key);
    }
    await _saveArchivedKeys(sid, values);
  }

  Future<_ViewerScope> _notificationScope(String? authUserId) async {
    final sid = await session.sessionId;
    if (authUserId != null && authUserId.isNotEmpty) {
      final rows = await chat.client
          .from('waouh_users')
          .select('id')
          .eq('auth_user_id', authUserId)
          .limit(50);
      final ids = (rows as List)
          .map((raw) => liveText((raw as Map)['id']))
          .where((id) => id.isNotEmpty)
          .toList();
      final clause = ids.isEmpty ? '' : 'user_id.in.(${ids.join(',')})';
      final queue = ids.isEmpty ? '' : 'to_user_id.in.(${ids.join(',')})';
      return _ViewerScope(unifiedOrClause: clause, queueOrClause: queue, storageKey: sid);
    }

    final ids = await chat.waouhUserIds(null);
    final unified = <String>['web_session_id.eq.$sid'];
    final queue = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) {
      unified.add('user_id.in.(${ids.join(',')})');
      queue.add('to_user_id.in.(${ids.join(',')})');
    }
    return _ViewerScope(unifiedOrClause: unified.join(','), queueOrClause: queue.join(','), storageKey: sid);
  }

  Future<_ViewerScope> _matchScope(String? authUserId) async {
    final sid = await session.sessionId;
    final ids = await chat.waouhUserIds(authUserId);
    final clauses = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) clauses.add('user_id.in.(${ids.join(',')})');
    return _ViewerScope(unifiedOrClause: clauses.join(','), queueOrClause: '', storageKey: sid);
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
  const _ViewerScope({required this.unifiedOrClause, required this.queueOrClause, required this.storageKey});
  final String unifiedOrClause;
  final String queueOrClause;
  final String storageKey;
}

String _notificationTitle(String template) => switch (template) {
  'match_seller' => '📩 Nouvel acheteur intéressé !',
  'match_buyer' => '🎯 Annonce trouvée pour vous',
  'negotiation_open' => '🤝 Nouvelle offre reçue',
  'contact_exchange' => '🎉 Accord conclu — livraison en cours d’organisation',
  'deal_created' => '🛵 Accord conclu — livraison en préparation',
  'deal_seller' => '🛵 Vente conclue — un livreur va vous contacter',
  'deal_buyer' => '🛵 Achat confirmé — livraison en préparation',
  'deal_ops' => '📦 Nouveau deal à orchestrer',
  'deal_assigned' => '🛵 Livreur assigné — ETA en cours',
  'deal_eta_updated' => '⏱️ ETA mise à jour',
  'deal_picked_up' => '📦 Colis collecté',
  'deal_delivered' => '📬 Colis livré',
  'deal_payment_request' => '💵 Confirmez le paiement',
  'deal_paid' => '✅ Paiement confirmé',
  'deal_cancelled' => '⚠️ Livraison annulée',
  'sale_published' => '✅ Annonce publiée',
  'new_buyer' => '🛒 Nouvel acheteur intéressé',
  'match' || 'radar_match' => '🎯 Annonce trouvée pour vous',
  _ => 'WAOUH',
};

String _notificationBody(String template, Map<String, dynamic> payload) {
  String amount(dynamic value) {
    final parsed = value is num ? value : num.tryParse('${value ?? ''}');
    return parsed == null ? '' : '${parsed.toStringAsFixed(0)} FCFA';
  }
  return switch (template) {
    'match_seller' || 'new_buyer' => 'Un acheteur cherche : ${liveText(payload['title'], 'votre produit')}${payload['price'] == null ? '' : ' — ${amount(payload['price'])}'}',
    'match_buyer' || 'match' || 'radar_match' => '${liveText(payload['title'], 'Annonce')} — ${amount(payload['price'])}${payload['city'] == null ? '' : ' (${payload['city']})'}',
    'negotiation_open' => 'Offre : ${amount(payload['offer'] ?? payload['price'])}',
    'payment_link' => 'Montant : ${amount(payload['amount'])}',
    _ => liveText(payload['text'] ?? payload['message'], 'Mise à jour WAOUH'),
  };
}
