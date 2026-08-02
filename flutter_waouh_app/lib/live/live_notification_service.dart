import 'package:shared_preferences/shared_preferences.dart';

import 'live_chat_service.dart';
import 'live_models.dart';
import 'live_session.dart';

class LiveNotificationService {
  LiveNotificationService(this.chat, this.session);

  final LiveChatService chat;
  final LiveSessionStore session;
  List<LiveMatch> _cachedMatches = const <LiveMatch>[];
  DateTime? _cachedMatchesAt;
  String? _cachedMatchesScope;
  final Map<String, Future<List<LiveMatch>>> _matchesInFlight = {};

  LiveMatch? cachedMatch(String key) {
    for (final item in _cachedMatches) {
      if (item.key == key) return item;
    }
    return null;
  }

  /// Rend immédiatement disponible un Meet créé par l'action « Intéressé ».
  /// Le prochain chargement distant le fusionnera avec la notification serveur.
  void rememberMatch(LiveMatch match) {
    final byKey = <String, LiveMatch>{
      for (final item in _cachedMatches) item.key: item,
      match.key: match,
    };
    _cachedMatches = byKey.values.toList()
      ..sort((a, b) => b.lastAt.compareTo(a.lastAt));
    _cachedMatchesAt = DateTime.now();
  }

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
            .select(
                'id,template,payload,created_at,image_url,message_id,transaction_id')
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
            threadId: payload['thread_id']?.toString(),
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
          .select(
              'id,thread_id,notification_type,payload,photos,sent_at,article_id,opened,web_session_id,user_id')
          .or(scope.unifiedOrClause)
          .order('sent_at', ascending: false)
          .limit(150);
      for (final raw in rows as List) {
        final row = Map<String, dynamic>.from(raw as Map);
        final payload = <String, dynamic>{...liveMap(row['payload'])};
        final photos = liveStringList(row['photos']);
        if (photos.isNotEmpty && payload['photos'] == null)
          payload['photos'] = photos;
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
          threadId: (row['thread_id'] ?? payload['thread_id'])?.toString(),
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
      await chat.client
          .from('waouh_notifications')
          .update({'opened': true}).eq('id', id);
    } catch (_) {}
  }

  Future<void> markAllRead(String? authUserId) async {
    final scope = await _notificationScope(authUserId);
    if (scope.unifiedOrClause.isEmpty) return;
    await chat.client
        .from('waouh_notifications')
        .update({'opened': true}).or(scope.unifiedOrClause);
  }

  Future<List<LiveMatch>> loadMatches(String? authUserId,
      {bool archived = false, bool force = false}) async {
    final scope = await _matchScope(authUserId);
    final cacheKey = '${scope.storageKey}:${authUserId ?? ''}';
    final cacheFresh = !force &&
        _cachedMatchesScope == cacheKey &&
        _cachedMatchesAt != null &&
        DateTime.now().difference(_cachedMatchesAt!) <
            const Duration(milliseconds: 900);
    List<LiveMatch> all;
    if (cacheFresh) {
      all = _cachedMatches;
    } else {
      final inFlight = _matchesInFlight.putIfAbsent(
          cacheKey,
          () => _fetchMatches(scope).then((values) {
                _cachedMatches = values;
                _cachedMatchesAt = DateTime.now();
                _cachedMatchesScope = cacheKey;
                return values;
              }).whenComplete(() => _matchesInFlight.remove(cacheKey)));
      all = await inFlight;
    }
    final archivedKeys = await _archivedKeys(scope.storageKey);
    return all
        .where((item) => archived
            ? archivedKeys.contains(item.key)
            : !archivedKeys.contains(item.key))
        .toList(growable: false);
  }

  Future<List<LiveMatch>> _fetchMatches(_ViewerScope scope) async {
    final rows = await chat.client
        .from('waouh_notifications')
        .select(
            'id,thread_id,notification_type,payload,photos,sent_at,article_id,opened,user_id,web_session_id')
        .or(scope.unifiedOrClause)
        .order('sent_at', ascending: false)
        .limit(300);

    const matchTypes = {
      'match',
      'match_buyer',
      'match_seller',
      'new_buyer',
      'radar_match',
      'negotiation_open',
      'deal_created',
      'deal_accepted',
      'deal_seller',
      'deal_buyer',
      'deal_assigned',
      'deal_eta_updated',
      'deal_picked_up',
      'deal_delivered',
      'deal_payment_request',
      'deal_paid',
      'deal_cancelled',
      'payment_link',
      'contact_exchange',
      'search_thread',
    };
    final merged = <String, LiveMatch>{};
    for (final raw in rows as List) {
      final row = Map<String, dynamic>.from(raw as Map);
      final payload = liveMap(row['payload']);
      final type = liveText(row['notification_type']).toLowerCase();
      final articleId = liveText(row['article_id'] ?? payload['article_id']);
      final threadId = liveText(row['thread_id'] ?? payload['thread_id']);
      if (threadId.isNotEmpty && payload['thread_id'] == null) {
        row['payload'] = <String, dynamic>{...payload, 'thread_id': threadId};
      }
      final isSearch = payload['thread_type'] == 'search' &&
          liveText(payload['search_request_id']).isNotEmpty;
      if ((!isSearch && articleId.isEmpty) ||
          (!matchTypes.contains(type) && threadId.isEmpty)) {
        continue;
      }
      row['article_id'] =
          isSearch ? liveText(payload['search_request_id']) : articleId;
      final item = LiveMatch.fromNotification(row);
      merged[item.key] = merged[item.key]?.merge(item) ?? item;
    }

    // Les notifications V18 portent déjà l'identité complète du Meet. Le
    // fallback historique exige deux requêtes supplémentaires et n'est utile
    // que sur une ancienne base ne possédant encore aucune notification Meet.
    if (merged.isEmpty) await _addMessageFallback(merged, scope);

    final values = merged.values.toList();
    values.sort((a, b) => b.lastAt.compareTo(a.lastAt));
    return values;
  }

  Future<void> _addMessageFallback(
    Map<String, LiveMatch> merged,
    _ViewerScope scope,
  ) async {
    try {
      final since = DateTime.now()
          .subtract(const Duration(days: 30))
          .toUtc()
          .toIso8601String();
      final rows = await chat.client
          .from('waouh_messages')
          .select('thread_id,article_id,created_at,meta,user_id,web_session_id')
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
        final threadId = (row['thread_id'] ?? meta['thread_id'])?.toString();
        final buyerUserId = meta['buyer_user_id']?.toString();
        final sellerUserId = meta['seller_user_id']?.toString();
        final counterpart = role == 'seller'
            ? (buyerUserId ?? meta['counterpart_user_id'])?.toString()
            : (sellerUserId ?? meta['counterpart_user_id'])?.toString();
        // Une ligne ancienne sans thread ni contrepartie n'est pas assez
        // précise pour fabriquer une fenêtre sans risque de mélange.
        if ((threadId == null || threadId.isEmpty) &&
            (counterpart == null || counterpart.isEmpty)) {
          continue;
        }
        final key = liveMatchKey(articleId, role, counterpart, threadId);
        if (merged.containsKey(key) || stubs.containsKey(key)) continue;
        stubs[key] = {
          'articleId': articleId,
          'role': role,
          'counterpart': counterpart,
          'threadId': threadId,
          'buyerUserId': buyerUserId,
          'sellerUserId': sellerUserId,
          'source': meta['source'],
          'counterpartLabel': meta['counterpart_name'],
          'negotiationId': meta['negotiation_id'] ?? meta['neg_id'],
          'dealId': meta['deal_id'],
          'transactionId': meta['transaction_id'],
          'createdAt': row['created_at'],
          'buyerProfileId': meta['buyer_profile_id'],
        };
      }
      if (stubs.isEmpty) return;

      final articleIds = stubs.values
          .map((item) => item['articleId'].toString())
          .toSet()
          .toList();
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
        final article =
            articles[liveText(stub['articleId'])] ?? const <String, dynamic>{};
        final photos = liveStringList(article['photos']);
        merged[entry.key] = LiveMatch(
          key: entry.key,
          articleId: liveText(stub['articleId']),
          role: liveText(stub['role']),
          title: liveText(article['title'], 'Annonce'),
          lastAt: liveDate(stub['createdAt']),
          buyerProfileId: stub['buyerProfileId']?.toString(),
          counterpartUserId: stub['counterpart']?.toString(),
          threadId: stub['threadId']?.toString(),
          buyerUserId: stub['buyerUserId']?.toString(),
          sellerUserId: stub['sellerUserId']?.toString(),
          source: stub['source']?.toString(),
          counterpartLabel: stub['counterpartLabel']?.toString(),
          negotiationId: stub['negotiationId']?.toString(),
          dealId: stub['dealId']?.toString(),
          transactionId: stub['transactionId']?.toString(),
          price: article['price'] is num
              ? article['price'] as num
              : num.tryParse('${article['price'] ?? ''}'),
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
    final scope = await _matchScope(chat.client.auth.currentUser?.id);
    final values = await _archivedKeys(scope.storageKey);
    if (archived) {
      values.add(item.key);
    } else {
      values.remove(item.key);
    }
    await _saveArchivedKeys(scope.storageKey, values);
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
      return _ViewerScope(
          unifiedOrClause: clause,
          queueOrClause: queue,
          storageKey: 'auth_$authUserId');
    }

    final ids = await chat.waouhUserIds(null);
    final unified = <String>['web_session_id.eq.$sid'];
    final queue = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) {
      unified.add('user_id.in.(${ids.join(',')})');
      queue.add('to_user_id.in.(${ids.join(',')})');
    }
    return _ViewerScope(
        unifiedOrClause: unified.join(','),
        queueOrClause: queue.join(','),
        storageKey: sid);
  }

  Future<_ViewerScope> _matchScope(String? authUserId) async {
    final sid = await session.sessionId;
    final ids = await chat.waouhUserIds(authUserId);
    if (authUserId != null && authUserId.isNotEmpty) {
      final clause = ids.isEmpty
          ? 'user_id.eq.00000000-0000-0000-0000-000000000000'
          : 'user_id.in.(${ids.join(',')})';
      return _ViewerScope(
        unifiedOrClause: clause,
        queueOrClause: '',
        storageKey: 'auth_$authUserId',
      );
    }
    final clauses = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) clauses.add('user_id.in.(${ids.join(',')})');
    return _ViewerScope(
        unifiedOrClause: clauses.join(','), queueOrClause: '', storageKey: sid);
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
  const _ViewerScope(
      {required this.unifiedOrClause,
      required this.queueOrClause,
      required this.storageKey});
  final String unifiedOrClause;
  final String queueOrClause;
  final String storageKey;
}

String _notificationTitle(String template) => switch (template) {
      'match_seller' => '📩 Nouvel acheteur intéressé !',
      'match_buyer' => '🎯 Annonce trouvée pour vous',
      'negotiation_open' => '🤝 Nouvelle offre reçue',
      'contact_exchange' =>
        '🎉 Accord conclu — livraison en cours d’organisation',
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
    'match_seller' ||
    'new_buyer' =>
      'Un acheteur cherche : ${liveText(payload['title'], 'votre produit')}${payload['price'] == null ? '' : ' — ${amount(payload['price'])}'}',
    'match_buyer' ||
    'match' ||
    'radar_match' =>
      '${liveText(payload['title'], 'Annonce')} — ${amount(payload['price'])}${payload['city'] == null ? '' : ' (${payload['city']})'}',
    'negotiation_open' =>
      'Offre : ${amount(payload['offer'] ?? payload['price'])}',
    'payment_link' => 'Montant : ${amount(payload['amount'])}',
    _ => liveText(payload['text'] ?? payload['message'], 'Mise à jour WAOUH'),
  };
}
