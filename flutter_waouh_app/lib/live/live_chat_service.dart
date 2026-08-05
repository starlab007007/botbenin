import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_models.dart';
import 'live_session.dart';
import 'live_thread_flow.dart';

class LiveChatService {
  LiveChatService(this.client, this.session);

  final SupabaseClient client;
  final LiveSessionStore session;

  String? _identityCacheKey;
  DateTime? _identityCacheAt;
  List<String> _identityCache = const <String>[];
  Future<List<String>>? _identityInFlight;
  String? _identityInFlightKey;

  void clearIdentityCache() {
    _identityCacheKey = null;
    _identityCacheAt = null;
    _identityCache = const <String>[];
    _identityInFlight = null;
    _identityInFlightKey = null;
  }

  Future<List<String>> waouhUserIds(
    String? authUserId, {
    bool force = false,
  }) async {
    final sid = await session.sessionId;
    final cacheKey = '$sid|${authUserId ?? ''}';
    final fresh = !force &&
        _identityCacheKey == cacheKey &&
        _identityCacheAt != null &&
        DateTime.now().difference(_identityCacheAt!) <
            const Duration(minutes: 2);
    if (fresh) return List<String>.from(_identityCache);

    if (_identityInFlightKey == cacheKey && _identityInFlight != null) {
      return List<String>.from(await _identityInFlight!);
    }

    final future = _fetchWaouhUserIds(
      sid: sid,
      authUserId: authUserId,
    );
    _identityInFlightKey = cacheKey;
    _identityInFlight = future;
    try {
      final values = await future;
      _identityCacheKey = cacheKey;
      _identityCacheAt = DateTime.now();
      _identityCache = List<String>.from(values);
      return List<String>.from(values);
    } finally {
      if (_identityInFlightKey == cacheKey) {
        _identityInFlightKey = null;
        _identityInFlight = null;
      }
    }
  }

  Future<List<String>> _fetchWaouhUserIds({
    required String sid,
    required String? authUserId,
  }) async {
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
            await client
                .from('waouh_users')
                .update({'auth_user_id': authUserId}).eq('id', id);
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
    bool includeThreaded = false,
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
            final message =
                LiveMessage.fromJson(Map<String, dynamic>.from(raw));
            byId[message.id] = message;
          }
        }
      }
    } catch (_) {
      // A deployed waouh-history function is preferred, but an older backend
      // remains readable through the scoped queries below.
    }

    if (byId.isEmpty || includeThreaded) {
      final ownRows = includeThreaded
          ? await client
              .from('waouh_messages')
              .select(
                  'id,conversation_id,thread_id,user_id,article_id,direction,text,created_at,web_session_id,attachments,meta')
              .eq('web_session_id', sid)
              .order('created_at', ascending: false)
              .limit(limit)
          : await client
              .from('waouh_messages')
              .select(
                  'id,conversation_id,thread_id,user_id,article_id,direction,text,created_at,web_session_id,attachments,meta')
              .isFilter('thread_id', null)
              .eq('web_session_id', sid)
              .order('created_at', ascending: true)
              .limit(limit);
      for (final raw in ownRows as List) {
        final item =
            LiveMessage.fromJson(Map<String, dynamic>.from(raw as Map));
        byId[item.id] = item;
      }
      final ids = await waouhUserIds(authUserId);
      if (ids.isNotEmpty) {
        final siblingRows = includeThreaded
            ? await client
                .from('waouh_messages')
                .select(
                    'id,conversation_id,thread_id,user_id,article_id,direction,text,created_at,web_session_id,attachments,meta')
                .inFilter('user_id', ids)
                .order('created_at', ascending: false)
                .limit(limit)
            : await client
                .from('waouh_messages')
                .select(
                    'id,conversation_id,thread_id,user_id,article_id,direction,text,created_at,web_session_id,attachments,meta')
                .isFilter('thread_id', null)
                .inFilter('user_id', ids)
                .order('created_at', ascending: true)
                .limit(limit);
        for (final raw in siblingRows as List) {
          final item =
              LiveMessage.fromJson(Map<String, dynamic>.from(raw as Map));
          byId[item.id] = item;
        }
      }
    }

    final cutoffDate = cutoff == null ? null : DateTime.tryParse(cutoff);
    final values = byId.values
        .where((message) =>
            cutoffDate == null || !message.createdAt.isBefore(cutoffDate))
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
    return liveNormalizeChannelResponse(data);
  }

  Future<LiveMatch?> resolveInterestedMatchByCorrelation({
    required String? authUserId,
    required Map<String, dynamic> requestMeta,
    required DateTime notBefore,
    String requestText = '',
  }) async {
    final correlation = liveInterestCorrelationKey(requestMeta);
    if (correlation.isEmpty) return null;

    final sid = await session.sessionId;
    final ids = await waouhUserIds(authUserId);
    final scope = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) scope.add('user_id.in.(${ids.join(',')})');
    final cutoff = notBefore
        .subtract(const Duration(minutes: 2))
        .toUtc()
        .toIso8601String();

    try {
      final rows = await client
          .from('waouh_messages')
          .select(
            'id,thread_id,article_id,direction,text,created_at,web_session_id,user_id,attachments,meta',
          )
          .eq('meta->>idempotency_key', correlation)
          .or(scope.join(','))
          .gte('created_at', cutoff)
          .order('created_at', ascending: false)
          .limit(20);
      for (final raw in rows as List) {
        final match = liveInterestedMatchFromCorrelatedRecord(
          record: Map<String, dynamic>.from(raw as Map),
          requestMeta: requestMeta,
        );
        if (match != null) return match;
      }
    } catch (_) {
      // Les anciennes politiques RLS ou versions PostgREST peuvent refuser
      // un filtre JSON. Le fallback waouh-history ci-dessous reste strictement
      // corrélé et ne sélectionne jamais un message d'un autre intérêt.
    }

    try {
      final history = await loadMainHistory(
        authUserId: authUserId,
        limit: 300,
        includeThreaded: true,
      );
      final candidates = history.where((message) {
        if (message.createdAt.isBefore(notBefore.subtract(
          const Duration(minutes: 2),
        ))) {
          return false;
        }
        return liveInterestCorrelationKey(message.meta) == correlation &&
            (message.threadId?.trim().isNotEmpty ?? false);
      }).toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      for (final message in candidates) {
        final match = liveInterestedMatchFromCorrelatedRecord(
          record: <String, dynamic>{
            'id': message.id,
            'thread_id': message.threadId,
            'article_id': message.articleId,
            'created_at': message.createdAt.toUtc().toIso8601String(),
            'text': message.text,
            'attachments': message.attachments
                .map((attachment) => attachment.toJson())
                .toList(),
            'meta': message.meta,
          },
          requestMeta: requestMeta,
        );
        if (match != null) return match;
      }
    } catch (_) {
      // La résolution par notification conserve la priorité suivante.
    }

    // Compatibilité avec une ancienne fonction distante qui aurait supprimé
    // idempotency_key du meta. Le texte doit correspondre exactement et tous
    // les enregistrements récents compatibles doivent désigner un seul thread.
    final exactText = liveVisibleText(requestText).trim();
    if (exactText.isNotEmpty) {
      try {
        final rows = await client
            .from('waouh_messages')
            .select(
              'id,thread_id,article_id,direction,text,created_at,web_session_id,user_id,attachments,meta',
            )
            .eq('text', exactText)
            .or(scope.join(','))
            .gte('created_at', cutoff)
            .order('created_at', ascending: false)
            .limit(30);
        final records = (rows as List)
            .map((raw) => Map<String, dynamic>.from(raw as Map))
            .toList();
        final threadIds = records
            .map(liveThreadIdFromResponse)
            .map((value) => value.trim())
            .where((value) => value.isNotEmpty)
            .toSet();
        if (threadIds.length == 1) {
          for (final record in records) {
            final match = liveInterestedMatchFromUniqueTextRecord(
              record: record,
              requestMeta: requestMeta,
              requestText: exactText,
            );
            if (match != null) return match;
          }
        }
      } catch (_) {
        // Le fallback historique ci-dessous applique la même règle d'unicité.
      }

      try {
        final history = await loadMainHistory(
          authUserId: authUserId,
          limit: 300,
          includeThreaded: true,
        );
        final records = history
            .where((message) =>
                !message.createdAt.isBefore(notBefore.subtract(
                  const Duration(minutes: 2),
                )) &&
                liveVisibleText(message.text).trim() == exactText &&
                (message.threadId?.trim().isNotEmpty ?? false))
            .map((message) => <String, dynamic>{
                  'id': message.id,
                  'thread_id': message.threadId,
                  'article_id': message.articleId,
                  'created_at': message.createdAt.toUtc().toIso8601String(),
                  'text': message.text,
                  'attachments': message.attachments
                      .map((attachment) => attachment.toJson())
                      .toList(),
                  'meta': message.meta,
                })
            .toList();
        final threadIds = records
            .map(liveThreadIdFromResponse)
            .map((value) => value.trim())
            .where((value) => value.isNotEmpty)
            .toSet();
        if (threadIds.length == 1) {
          for (final record in records) {
            final match = liveInterestedMatchFromUniqueTextRecord(
              record: record,
              requestMeta: requestMeta,
              requestText: exactText,
            );
            if (match != null) return match;
          }
        }
      } catch (_) {
        // Aucune correspondance unique : ne jamais deviner un thread.
      }
    }
    return null;
  }

  /// Dernier recours sûr lorsque le backend a créé le thread mais n'a recopié
  /// ni l'idempotency_key ni le texte exact dans les tables lisibles. La
  /// requête reste limitée à la session et aux identités WAOUH de l'utilisateur
  /// courant. Un résultat n'est accepté que si l'identité produit correspond
  /// exactement ou si un seul thread distinct a été créé autour du clic.
  Future<LiveMatch?> resolveUniqueRecentInterestedMatch({
    required String? authUserId,
    required Map<String, dynamic> requestMeta,
    required DateTime notBefore,
  }) async {
    final sid = await session.sessionId;
    final ids = await waouhUserIds(authUserId);
    final scope = <String>['web_session_id.eq.$sid'];
    if (ids.isNotEmpty) scope.add('user_id.in.(${ids.join(',')})');
    final cutoff = notBefore
        .subtract(const Duration(seconds: 12))
        .toUtc()
        .toIso8601String();

    try {
      final rows = await client
          .from('waouh_messages')
          .select(
            'id,thread_id,article_id,direction,text,created_at,web_session_id,user_id,attachments,meta',
          )
          .or(scope.join(','))
          .gte('created_at', cutoff)
          .order('created_at', ascending: false)
          .limit(100);
      final matches = <LiveMatch>[];
      for (final raw in rows as List) {
        final match = liveInterestedMatchFromScopedRecentRecord(
          record: Map<String, dynamic>.from(raw as Map),
          requestMeta: requestMeta,
        );
        if (match != null) matches.add(match);
      }
      if (matches.isEmpty) return null;

      final exact = liveSelectInterestedMatch(
        matches: matches,
        requestMeta: requestMeta,
      );
      if (exact != null) return exact;

      return liveSelectUniqueRecentInterestedMatch(
        matches: matches,
        notBefore: notBefore,
      );
    } catch (_) {
      return null;
    }
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

    final userConversationsFuture = ids.isEmpty
        ? Future<List<dynamic>>.value(const <dynamic>[])
        : client
            .from('waouh_conversations')
            .select(fields)
            .inFilter('user_id', ids)
            .order('updated_at', ascending: false)
            .limit(200)
            .then((value) => List<dynamic>.from(value as List));

    final sessionMessageRefsFuture = client
        .from('waouh_messages')
        .select('conversation_id')
        .eq('web_session_id', sid)
        .not('conversation_id', 'is', null)
        .order('created_at', ascending: false)
        .limit(300)
        .then((value) => List<dynamic>.from(value as List));

    final discovered = await Future.wait<List<dynamic>>([
      userConversationsFuture,
      sessionMessageRefsFuture,
    ]);
    final rows = discovered[0];
    final messageRows = discovered[1];

    for (final raw in rows) {
      final item =
          LiveConversation.fromJson(Map<String, dynamic>.from(raw as Map));
      if (item.id.isNotEmpty) byId[item.id] = item;
    }

    // Exact ChatListScreen.tsx session fallback.
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
        final item =
            LiveConversation.fromJson(Map<String, dynamic>.from(raw as Map));
        if (item.id.isNotEmpty) byId[item.id] = item;
      }
    }

    final values = byId.values.toList();
    values.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return values;
  }

  Future<void> archiveConversation(String id) async {
    try {
      await client
          .from('waouh_conversations')
          .update({'state': 'archived'}).eq('id', id);
    } catch (_) {
      await client
          .from('waouh_conversations')
          .update({'archived': true}).eq('id', id);
    }
  }

  Future<List<LiveMessage>> loadConversationMessages(String id) async {
    final rows = await client
        .from('waouh_messages')
        .select(
            'id,conversation_id,article_id,direction,text,created_at,attachments,meta')
        .eq('conversation_id', id)
        .order('created_at', ascending: true)
        .limit(300);
    return (rows as List)
        .map((raw) =>
            LiveMessage.fromJson(Map<String, dynamic>.from(raw as Map)))
        .toList();
  }

  Future<void> sendConversationMessage({
    required String conversationId,
    required String text,
    required String? authUserId,
  }) async {
    final response =
        await client.functions.invoke('waouh-operator-send', body: {
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
