import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'live_avatar_guide.dart';

/// Notification de l'avatar dans l'application (source : `waouh_notifications`, type `avatar_point`).
/// Le Web reçoit la même ligne en même temps : les deux clients ouverts sont prévenus, sans doublon de bulle de chat.
class LiveAvatarNotice {
  const LiveAvatarNotice(
      {required this.id,
      required this.title,
      required this.text,
      this.actions = const []});
  final String id;
  final String title;
  final String text;
  final List<String> actions;
}

/// Lecture défensive d'une ligne `waouh_notifications` : autre type ou texte vide → null.
LiveAvatarNotice? liveParseAvatarNotice(Map<String, dynamic> row) {
  if ('${row['notification_type'] ?? ''}' != 'avatar_point') return null;
  final payload = row['payload'];
  if (payload is! Map) return null;
  final text = '${payload['text'] ?? ''}'.trim();
  if (text.isEmpty) return null;
  final title = '${payload['title'] ?? ''}'.trim();
  final actions = payload['actions'] is List
      ? (payload['actions'] as List)
          .whereType<Map>()
          .map((a) => '${a['label'] ?? ''}'.trim())
          .where((l) => l.isNotEmpty)
          .take(3)
          .toList()
      : <String>[];
  return LiveAvatarNotice(
      id: '${row['id'] ?? text.hashCode}',
      title: title.isEmpty ? 'Votre avatar' : title,
      text: text,
      actions: actions);
}

Stream<LiveAvatarNotice>? _feed;

/// Flux temps réel des notifications de l'avatar (une seule souscription pour toute l'application).
/// La RLS ne livre que les lignes de l'utilisateur connecté ; hors connexion, rien n'arrive.
Stream<LiveAvatarNotice> liveAvatarNoticeFeed(SupabaseClient client) {
  return _feed ??= () {
    late final StreamController<LiveAvatarNotice> controller;
    RealtimeChannel? channel;
    controller = StreamController<LiveAvatarNotice>.broadcast(
      onListen: () {
        channel = client
            .channel(
                'waouh_avatar_notices_${DateTime.now().microsecondsSinceEpoch}')
            .onPostgresChanges(
              event: PostgresChangeEvent.insert,
              schema: 'public',
              table: 'waouh_notifications',
              callback: (payload) {
                final notice = liveParseAvatarNotice(
                    Map<String, dynamic>.from(payload.newRecord));
                if (notice != null && !controller.isClosed)
                  controller.add(notice);
              },
            )
            .subscribe();
      },
      onCancel: () async {
        final c = channel;
        channel = null;
        if (c != null) await client.removeChannel(c);
        _feed = null;
      },
    );
    return controller.stream;
  }();
}

/// Bannière premium (haut de l'écran) : apparaît, reste 7 s, disparaît ; un tap ouvre le chat de l'avatar.
/// `events` est injectable pour les tests ; sinon la fonction `subscribe` fournit le temps réel.
class LiveAvatarBannerHost extends StatefulWidget {
  const LiveAvatarBannerHost(
      {super.key,
      required this.child,
      required this.events,
      required this.onOpen,
      this.enabled = true});
  final Widget child;
  final Stream<LiveAvatarNotice> events;
  final VoidCallback onOpen;

  /// Faux sur l'écran du chat de l'avatar : les bulles y sont déjà visibles.
  final bool enabled;
  @override
  State<LiveAvatarBannerHost> createState() => _LiveAvatarBannerHostState();
}

class _LiveAvatarBannerHostState extends State<LiveAvatarBannerHost> {
  StreamSubscription<LiveAvatarNotice>? _sub;
  Timer? _hide;
  LiveAvatarNotice? _current;
  final _seen = <String>{};

  @override
  void initState() {
    super.initState();
    _sub = widget.events.listen(_show);
  }

  void _show(LiveAvatarNotice n) {
    if (!mounted || !widget.enabled || !_seen.add(n.id)) return;
    _hide?.cancel();
    setState(() => _current = n);
    _hide = Timer(const Duration(seconds: 7), () {
      if (mounted) setState(() => _current = null);
    });
  }

  @override
  void dispose() {
    _hide?.cancel();
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final n = widget.enabled ? _current : null;
    return Stack(children: [
      widget.child,
      Positioned(
        top: 8,
        left: 12,
        right: 12,
        child: SafeArea(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 260),
            transitionBuilder: (c, a) => FadeTransition(
                opacity: a,
                child: SlideTransition(
                    position:
                        Tween(begin: const Offset(0, -.4), end: Offset.zero)
                            .animate(a),
                    child: c)),
            child: n == null
                ? const SizedBox.shrink(key: ValueKey('avatar-banner-none'))
                : Material(
                    key: ValueKey('avatar-banner-${n.id}'),
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(20),
                      onTap: () {
                        _hide?.cancel();
                        setState(() => _current = null);
                        widget.onOpen();
                      },
                      child: Container(
                        padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                              colors: [Color(0xFFECFDF5), Colors.white]),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF6EE7B7)),
                          boxShadow: [
                            BoxShadow(
                                color: const Color(0xFF059669)
                                    .withValues(alpha: .18),
                                blurRadius: 22,
                                offset: const Offset(0, 8))
                          ],
                        ),
                        child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const LiveAvatarOrb(size: 26),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(n.title,
                                          style: const TextStyle(
                                              fontSize: 12.5,
                                              fontWeight: FontWeight.w900,
                                              color: Color(0xFF064E3B))),
                                      const SizedBox(height: 2),
                                      Text(n.text,
                                          maxLines: 3,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                              fontSize: 12.5,
                                              height: 1.3,
                                              color: Color(0xFF0F172A))),
                                      if (n.actions.isNotEmpty) ...[
                                        const SizedBox(height: 6),
                                        Wrap(spacing: 6, children: [
                                          for (final a in n.actions)
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 9,
                                                      vertical: 3),
                                              decoration: BoxDecoration(
                                                  color:
                                                      const Color(0xFFD1FAE5),
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          99)),
                                              child: Text(a,
                                                  style: const TextStyle(
                                                      fontSize: 11,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                      color:
                                                          Color(0xFF065F46))),
                                            ),
                                        ]),
                                      ],
                                    ]),
                              ),
                              IconButton(
                                tooltip: 'Fermer',
                                visualDensity: VisualDensity.compact,
                                onPressed: () {
                                  _hide?.cancel();
                                  setState(() => _current = null);
                                },
                                icon: const Icon(Icons.close_rounded,
                                    size: 18, color: Color(0xFF64748B)),
                              ),
                            ]),
                      ),
                    ),
                  ),
          ),
        ),
      ),
    ]);
  }
}
