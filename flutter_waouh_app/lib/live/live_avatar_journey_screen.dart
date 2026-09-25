import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_commerce_workflow.dart';
import 'live_controller.dart';
import 'live_match_navigation.dart';
import 'live_models.dart';
import 'live_smart_timeline.dart';
import 'live_theme.dart';
import 'live_thread_flow.dart';
import 'live_widgets.dart';

enum LiveAvatarJourneyMode { buy, sell, ask }

extension LiveAvatarJourneyModeX on LiveAvatarJourneyMode {
  static LiveAvatarJourneyMode parse(String? value) => switch (value) {
        'sell' => LiveAvatarJourneyMode.sell,
        'ask' => LiveAvatarJourneyMode.ask,
        _ => LiveAvatarJourneyMode.buy,
      };

  String get route => switch (this) {
        LiveAvatarJourneyMode.buy => 'buy',
        LiveAvatarJourneyMode.sell => 'sell',
        LiveAvatarJourneyMode.ask => 'ask',
      };

  String get title => switch (this) {
        LiveAvatarJourneyMode.buy => 'Acheter avec mon Avatar',
        LiveAvatarJourneyMode.sell => 'Vendre avec mon Avatar',
        LiveAvatarJourneyMode.ask => 'Demander à mon Avatar',
      };

  String get subtitle => switch (this) {
        LiveAvatarJourneyMode.buy => 'Chercher · comparer · négocier · conclure',
        LiveAvatarJourneyMode.sell => 'Structurer · trouver des acheteurs · conclure',
        LiveAvatarJourneyMode.ask => 'Comprendre · explorer · proposer · agir',
      };

  String get hint => switch (this) {
        LiveAvatarJourneyMode.buy =>
          'Ex. Je cherche une moto Bajaj en bon état à Cotonou, budget 450 000 FCFA',
        LiveAvatarJourneyMode.sell =>
          'Ex. Je vends un Samsung S25 256 Go neuf à Cotonou',
        LiveAvatarJourneyMode.ask =>
          'Décrivez simplement ce que vous voulez obtenir',
      };

  String get intent => switch (this) {
        LiveAvatarJourneyMode.buy => 'buy',
        LiveAvatarJourneyMode.sell => 'sell',
        LiveAvatarJourneyMode.ask => 'assistant',
      };

  IconData get icon => switch (this) {
        LiveAvatarJourneyMode.buy => Icons.shopping_bag_outlined,
        LiveAvatarJourneyMode.sell => Icons.sell_outlined,
        LiveAvatarJourneyMode.ask => Icons.chat_bubble_outline_rounded,
      };

  Color get accent => switch (this) {
        LiveAvatarJourneyMode.buy => WaouhPalette.blue,
        LiveAvatarJourneyMode.sell => const Color(0xFFE18A27),
        LiveAvatarJourneyMode.ask => const Color(0xFF8B7CFF),
      };
}

class LiveAvatarJourneyScreen extends StatefulWidget {
  const LiveAvatarJourneyScreen({
    super.key,
    required this.mode,
  });

  final LiveAvatarJourneyMode mode;

  @override
  State<LiveAvatarJourneyScreen> createState() =>
      _LiveAvatarJourneyScreenState();
}

class _LiveAvatarJourneyScreenState extends State<LiveAvatarJourneyScreen> {
  final composer = TextEditingController();
  final focus = FocusNode();
  final optimistic = <LiveMessage>[];
  late DateTime startedAt;
  bool started = false;
  bool interestInFlight = false;

  LiveWaouhController get controller => context.read<LiveWaouhController>();

  @override
  void initState() {
    super.initState();
    startedAt = DateTime.now();
  }

  @override
  void dispose() {
    composer.dispose();
    focus.dispose();
    super.dispose();
  }

  String _normalizeGoal(String raw) {
    final value = raw.trim();
    return switch (widget.mode) {
      LiveAvatarJourneyMode.buy =>
        'Je veux acheter : $value. Mon Avatar doit préciser le besoin si nécessaire, utiliser NEXUS pour chercher le marché réel, comparer les offres et préparer la meilleure mise en relation.',
      LiveAvatarJourneyMode.sell =>
        'Je veux vendre : $value. Mon Avatar doit structurer l’offre, utiliser NEXUS pour trouver des acheteurs pertinents, comparer les demandes et préparer la meilleure mise en relation.',
      LiveAvatarJourneyMode.ask =>
        '$value. Mon Avatar doit comprendre l’objectif, explorer les sources WAOUH utiles et me proposer la prochaine action la plus pertinente.',
    };
  }

  Future<void> _sendGoal() async {
    final raw = composer.text.trim();
    if (raw.isEmpty || controller.busy) return;
    final text = started ? raw : _normalizeGoal(raw);
    final avatar = context.read<LiveAvatarController>();
    avatar.showState(
      widget.mode == LiveAvatarJourneyMode.ask
          ? LiveAvatarPresenceState.thinking
          : LiveAvatarPresenceState.searching,
      duration: const Duration(seconds: 5),
    );
    final meta = <String, dynamic>{
      'source': 'avatar_journey',
      'origin_surface': 'avatar_journey',
      'avatar_journey': true,
      'avatar_journey_mode': widget.mode.route,
      'intent': widget.mode.intent,
      'action': widget.mode.intent,
      'result_limit': 10,
      'max_results': 10,
      'avatar_name': avatar.name,
      'idempotency_key': controller.newIdempotencyKey(),
    };
    final local = LiveMessage(
      id: 'avatar_journey_${DateTime.now().microsecondsSinceEpoch}',
      text: text,
      createdAt: DateTime.now(),
      direction: 'in',
      meta: {...meta, 'delivery_state': controller.isOnline ? 'sending' : 'queued'},
    );
    setState(() {
      optimistic.add(local);
      composer.clear();
      started = true;
    });
    try {
      await controller.sendMain(text: text, meta: meta);
      _mark(local.id, controller.isOnline ? 'sent' : 'queued');
      final meet = controller.takePendingMeet();
      if (meet != null && mounted) {
        await livePushMatchChat<void>(context, meet);
      }
    } catch (error) {
      _mark(local.id, 'failed');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Action non finalisée : $error')),
      );
    }
  }

  Future<void> _handlePayload(String payload) async {
    if (payload.trim().isEmpty || interestInFlight) return;
    final text = liveCommercePayloadText(payload);
    var meta = <String, dynamic>{
      'source': 'avatar_journey',
      'origin_surface': 'avatar_journey',
      'avatar_journey': true,
      'avatar_journey_mode': widget.mode.route,
      'intent': 'workflow',
      'action': 'workflow',
      ...liveCommercePayloadMeta(payload),
    };
    meta.putIfAbsent('idempotency_key', controller.newIdempotencyKey);
    meta = liveCanonicalInterestedMeta(
      text: text,
      meta: meta,
      authUserId: controller.auth.user?.id,
    );
    final interested = liveIsInterestedMeta(meta, text: text);
    LiveMatch? prepared;
    if (interested) {
      interestInFlight = true;
      prepared = controller.prepareInterestedMeet(text: text, meta: meta);
      if (mounted) unawaited(livePushMatchChat<void>(context, prepared));
    }
    try {
      await controller.sendMain(text: text, meta: meta);
      final resolved = controller.takePendingMeet();
      if (resolved != null && mounted && !interested) {
        await livePushMatchChat<void>(context, resolved);
      }
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Action impossible : $error')),
      );
    } finally {
      if (interested) interestInFlight = false;
    }
  }

  void _mark(String id, String state) {
    if (!mounted) return;
    final index = optimistic.indexWhere((item) => item.id == id);
    if (index < 0) return;
    final item = optimistic[index];
    setState(() {
      optimistic[index] = LiveMessage(
        id: item.id,
        text: item.text,
        createdAt: item.createdAt,
        direction: item.direction,
        conversationId: item.conversationId,
        threadId: item.threadId,
        threadType: item.threadType,
        searchRequestId: item.searchRequestId,
        articleId: item.articleId,
        attachments: item.attachments,
        meta: {...item.meta, 'delivery_state': state},
      );
    });
  }

  List<LiveMessage> _visible(List<LiveMessage> remote) {
    final scoped = remote
        .where((item) =>
            item.createdAt.isAfter(startedAt.subtract(const Duration(seconds: 2))) ||
            item.meta['origin_surface'] == 'avatar_journey' ||
            item.meta['source'] == 'avatar_journey')
        .toList();
    final localOnly = optimistic.where((local) {
      return !scoped.any((server) =>
          server.outgoing &&
          server.text.trim() == local.text.trim() &&
          server.createdAt.difference(local.createdAt).inSeconds.abs() < 120);
    });
    return [...scoped, ...localOnly]
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  int _phase(List<LiveMessage> messages) {
    if (!started) return 0;
    if (controller.busy) return 1;
    final hasDeal = messages.any((m) =>
        m.meta['deal_id'] != null ||
        m.meta['negotiation_id'] != null ||
        m.meta['thread_id'] != null);
    if (hasDeal) return 3;
    final hasResults = messages.any((m) {
      for (final key in const ['products', 'results', 'articles', 'matches', 'offers']) {
        final value = m.meta[key];
        if (value is List && value.isNotEmpty) return true;
      }
      return false;
    });
    return hasResults ? 2 : 1;
  }

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    final watched = context.watch<LiveWaouhController>();
    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: LiveHeader(
        title: avatar.name,
        subtitle: widget.mode.title,
        back: true,
      ),
      body: StreamBuilder<List<LiveMessage>>(
        stream: watched.mainMessages(),
        builder: (context, snapshot) {
          final messages = _visible(snapshot.data ?? const <LiveMessage>[]);
          final phase = _phase(messages);
          return DecoratedBox(
            decoration: const BoxDecoration(gradient: WaouhGradients.air),
            child: Column(
              children: [
                _JourneyHero(
                  avatar: avatar,
                  mode: widget.mode,
                  phase: phase,
                  busy: watched.busy,
                ),
                if (!started)
                  Expanded(
                    child: _JourneyStart(
                      mode: widget.mode,
                      composer: composer,
                      focus: focus,
                      onStart: _sendGoal,
                    ),
                  )
                else
                  Expanded(
                    child: LiveSmartTimeline(
                      messages: messages,
                      onPayload: _handlePayload,
                      showAssistantHint: watched.busy,
                      emptyMessage: 'Votre Avatar prépare le parcours.',
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                    ),
                  ),
                SafeArea(
                  top: false,
                  minimum: const EdgeInsets.fromLTRB(10, 0, 10, 8),
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(8, 6, 7, 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: WaouhPalette.line),
                      boxShadow: WaouhShadows.card,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: composer,
                            focusNode: focus,
                            minLines: 1,
                            maxLines: 4,
                            onSubmitted: (_) => _sendGoal(),
                            decoration: InputDecoration(
                              hintText: started
                                  ? 'Continuez avec ${avatar.name}…'
                                  : widget.mode.hint,
                              filled: false,
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        FilledButton(
                          onPressed: watched.busy ? null : _sendGoal,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(44, 44),
                            maximumSize: const Size(44, 44),
                            padding: EdgeInsets.zero,
                            backgroundColor: widget.mode.accent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(15),
                            ),
                          ),
                          child: watched.busy
                              ? const SizedBox.square(
                                  dimension: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.arrow_upward_rounded),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _JourneyHero extends StatelessWidget {
  const _JourneyHero({
    required this.avatar,
    required this.mode,
    required this.phase,
    required this.busy,
  });

  final LiveAvatarController avatar;
  final LiveAvatarJourneyMode mode;
  final int phase;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    const labels = ['Comprendre', 'Explorer', 'Comparer', 'Deal'];
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 4),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 11),
      decoration: BoxDecoration(
        gradient: WaouhGradients.airHero,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFDDE7F7)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              LiveAvatarVisual(
                preset: avatar.profile.preset,
                state: busy
                    ? LiveAvatarPresenceState.searching
                    : phase >= 2
                        ? LiveAvatarPresenceState.comparing
                        : LiveAvatarPresenceState.listening,
                size: 54,
                showStatusBadge: true,
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      mode.title,
                      style: const TextStyle(
                        color: WaouhPalette.ink,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      mode.subtitle,
                      style: const TextStyle(
                        color: WaouhPalette.muted,
                        fontSize: 9.8,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: mode.accent.withValues(alpha: .09),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(mode.icon, color: mode.accent, size: 19),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: List.generate(labels.length, (index) {
              final active = index <= phase;
              return Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 20,
                      height: 20,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: active ? mode.accent : const Color(0xFFE8EDF6),
                        shape: BoxShape.circle,
                      ),
                      child: active
                          ? const Icon(Icons.check_rounded,
                              size: 12, color: Colors.white)
                          : Text(
                              '${index + 1}',
                              style: const TextStyle(
                                color: WaouhPalette.muted,
                                fontSize: 8.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        labels[index],
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: active ? WaouhPalette.ink : WaouhPalette.muted,
                          fontSize: 8.8,
                          fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                        ),
                      ),
                    ),
                    if (index != labels.length - 1)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 3),
                        child: Icon(Icons.chevron_right_rounded,
                            size: 13, color: Color(0xFFA6B2C5)),
                      ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

class _JourneyStart extends StatelessWidget {
  const _JourneyStart({
    required this.mode,
    required this.composer,
    required this.focus,
    required this.onStart,
  });

  final LiveAvatarJourneyMode mode;
  final TextEditingController composer;
  final FocusNode focus;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 100),
        children: [
          Text(
            switch (mode) {
              LiveAvatarJourneyMode.buy => 'Décrivez votre achat',
              LiveAvatarJourneyMode.sell => 'Décrivez ce que vous vendez',
              LiveAvatarJourneyMode.ask => 'Dites votre objectif',
            },
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          Text(
            switch (mode) {
              LiveAvatarJourneyMode.buy =>
                'Votre Avatar va cadrer le besoin, explorer NEXUS, comparer le marché et ouvrir un Deal Room seulement lorsque vous êtes intéressé.',
              LiveAvatarJourneyMode.sell =>
                'Votre Avatar va structurer l’offre, trouver plusieurs acheteurs potentiels et isoler chaque négociation dans son propre Deal Room.',
              LiveAvatarJourneyMode.ask =>
                'Votre Avatar choisit les moteurs WAOUH utiles et vous conduit vers la meilleure prochaine action.',
            },
            style: const TextStyle(
              color: WaouhPalette.muted,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: composer,
            focusNode: focus,
            minLines: 4,
            maxLines: 7,
            autofocus: true,
            decoration: InputDecoration(
              hintText: mode.hint,
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: onStart,
            icon: const Icon(Icons.auto_awesome_rounded),
            label: const Text('Laisser mon Avatar commencer'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(50),
              backgroundColor: mode.accent,
            ),
          ),
          const SizedBox(height: 10),
          const Row(
            children: [
              Icon(Icons.shield_outlined, size: 17, color: WaouhPalette.blue),
              SizedBox(width: 7),
              Expanded(
                child: Text(
                  'Les coordonnées privées restent protégées. L’accord, la livraison et le paiement suivent le Deal Graph WAOUH.',
                  style: TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 9.8,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      );
}
