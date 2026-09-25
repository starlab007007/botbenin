import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_commerce_workflow.dart';
import 'live_controller.dart';
import 'live_guest_action_gate.dart';
import 'live_models.dart';
import 'live_theme.dart';
import 'live_widgets.dart';

class LiveAvatarCommerceScreen extends StatefulWidget {
  const LiveAvatarCommerceScreen({
    super.key,
    required this.intent,
  });

  final String intent;

  @override
  State<LiveAvatarCommerceScreen> createState() =>
      _LiveAvatarCommerceScreenState();
}

class _LiveAvatarCommerceScreenState extends State<LiveAvatarCommerceScreen> {
  final _composer = TextEditingController();
  final _focus = FocusNode();
  final _responses = <LiveMessage>[];
  final _scope = <String, dynamic>{};

  bool _sending = false;
  String? _objective;
  String? _error;
  int _stage = 0;

  String get _normalizedIntent {
    final value = widget.intent.toLowerCase().trim();
    if (value == 'sell') return 'sell';
    if (value == 'ask') return 'assistant';
    return 'buy';
  }

  String get _title => switch (_normalizedIntent) {
        'sell' => 'Vendre avec votre Avatar',
        'assistant' => 'Demander à votre Avatar',
        _ => 'Acheter avec votre Avatar',
      };

  String get _question => switch (_normalizedIntent) {
        'sell' => 'Que voulez-vous vendre ?',
        'assistant' => 'Que souhaitez-vous accomplir ?',
        _ => 'Que cherchez-vous ?',
      };

  String get _hint => switch (_normalizedIntent) {
        'sell' => 'Ex. Je vends 20 sacs de soja à Parakou…',
        'assistant' => 'Décrivez simplement votre besoin…',
        _ => 'Ex. Je cherche un téléphone fiable à Cotonou…',
      };

  List<String> get _suggestions => switch (_normalizedIntent) {
        'sell' => const [
            'Trouver des acheteurs sérieux',
            'Comparer la demande du marché',
            'M’aider à fixer mon prix',
          ],
        'assistant' => const [
            'Trouver une opportunité',
            'Comparer avant de décider',
            'Organiser une prestation',
          ],
        _ => const [
            'Trouver le meilleur prix',
            'Comparer près de moi',
            'Chercher une offre fiable',
          ],
      };

  @override
  void dispose() {
    _composer.dispose();
    _focus.dispose();
    super.dispose();
  }

  LiveAvatarPresenceState get _avatarState {
    if (_sending) {
      if (_stage >= 2) return LiveAvatarPresenceState.negotiating;
      return LiveAvatarPresenceState.searching;
    }
    return switch (_stage) {
      1 => LiveAvatarPresenceState.comparing,
      2 => LiveAvatarPresenceState.negotiating,
      3 => LiveAvatarPresenceState.watching,
      4 => LiveAvatarPresenceState.done,
      _ => LiveAvatarPresenceState.listening,
    };
  }

  int _stageFrom(Map<String, dynamic> response) {
    final workflow =
        '${response['workflow_state'] ?? response['intent'] ?? ''}'
            .toLowerCase();
    final hasResults = (response['results'] is List &&
            (response['results'] as List).isNotEmpty) ||
        (response['products'] is List &&
            (response['products'] as List).isNotEmpty);
    final dealId = '${response['deal_id'] ?? ''}'.trim();
    final negotiationId = '${response['negotiation_id'] ?? ''}'.trim();
    final threadId = '${response['thread_id'] ?? ''}'.trim();

    if (workflow.contains('completed') ||
        workflow.contains('deal_completed') ||
        workflow.contains('settled')) {
      return 4;
    }
    if (workflow.contains('delivered') ||
        workflow.contains('picked_up') ||
        workflow.contains('pending_assignment') ||
        workflow.contains('assigned') ||
        workflow.contains('awaiting_confirmation') ||
        dealId.isNotEmpty) {
      return 3;
    }
    if (workflow.contains('negotiat') ||
        workflow.contains('counter') ||
        workflow.contains('offer') ||
        negotiationId.isNotEmpty ||
        threadId.isNotEmpty) {
      return 2;
    }
    if (hasResults) return 1;
    return _objective == null ? 0 : _stage;
  }

  void _mergeScope(Map<String, dynamic> response) {
    for (final key in const [
      'thread_id',
      'article_id',
      'negotiation_id',
      'deal_id',
      'transaction_id',
      'counterpart_user_id',
      'buyer_user_id',
      'seller_user_id',
      'role',
      'search_request_id',
      'search_thread_id',
    ]) {
      final value = response[key] ?? (response['meta'] is Map
          ? (response['meta'] as Map)[key]
          : null);
      if (value != null && value.toString().trim().isNotEmpty) {
        _scope[key] = value;
      }
    }
  }

  LiveMessage _responseMessage(Map<String, dynamic> response) {
    final meta = <String, dynamic>{
      ...response,
      if (response['meta'] is Map)
        ...Map<String, dynamic>.from(response['meta'] as Map),
    };
    return LiveMessage.fromJson({
      'id': response['outbound_message_id'] ??
          'avatar_${DateTime.now().microsecondsSinceEpoch}',
      'direction': 'out',
      'text': response['reply'] ?? response['text'] ?? '',
      'created_at': DateTime.now().toIso8601String(),
      'thread_id': response['thread_id'],
      'article_id': response['article_id'],
      'attachments': response['attachments'] ?? const [],
      'meta': meta,
    });
  }

  Future<void> _send([String? payload]) async {
    if (_sending) return;

    final next = '/app/avatar/commerce/${widget.intent}';
    if (!await requireLiveAuthentication(
      context,
      next: next,
      actionLabel: 'continuer avec votre Avatar',
    )) {
      return;
    }
    if (!mounted) return;

    if (payload != null) {
      final kind = liveCommerceActionKind(payload);
      if (kind == LiveCommerceActionKind.counter) {
        final suggested = liveCommerceQuery(payload)['suggested_price'];
        _composer.text = suggested == null || suggested.isEmpty
            ? 'Je propose  FCFA'
            : 'Je propose $suggested FCFA';
        _composer.selection =
            TextSelection.collapsed(offset: _composer.text.length);
        _focus.requestFocus();
        return;
      }
    }

    final text =
        payload == null ? _composer.text.trim() : liveCommercePayloadText(payload);
    if (text.isEmpty) return;

    final meta = <String, dynamic>{
      ..._scope,
      'avatar_journey': true,
      'avatar_intent': _normalizedIntent,
      if (payload != null) ...liveCommercePayloadMeta(payload),
    };

    setState(() {
      _sending = true;
      _error = null;
      _objective ??= text;
      if (payload == null) _composer.clear();
    });

    final avatar = context.read<LiveAvatarController>();
    avatar.setPersistentState(_stage >= 2
        ? LiveAvatarPresenceState.negotiating
        : LiveAvatarPresenceState.searching);

    try {
      final response =
          await context.read<LiveWaouhController>().runAvatarCommerceStep(
                text: text,
                intent: _normalizedIntent,
                meta: meta,
              );
      if (!mounted) return;
      _mergeScope(response);
      final nextStage = _stageFrom(response);
      final suppress = response['suppress_direct_reply'] == true;
      setState(() {
        _stage = nextStage > _stage ? nextStage : _stage;
        if (!suppress) _responses.add(_responseMessage(response));
      });
      avatar.showState(
        _stage >= 4
            ? LiveAvatarPresenceState.done
            : _stage >= 2
                ? LiveAvatarPresenceState.negotiating
                : LiveAvatarPresenceState.found,
      );
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
      avatar.showState(LiveAvatarPresenceState.waiting);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: LiveHeader(
        title: avatar.name,
        subtitle: _title,
        back: true,
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: Column(
          children: [
            _JourneyHeader(
              avatar: avatar,
              state: _avatarState,
              stage: _stage,
              intent: _normalizedIntent,
            ),
            Expanded(
              child: _objective == null
                  ? _ObjectiveCanvas(
                      avatarName: avatar.name,
                      question: _question,
                      suggestions: _suggestions,
                      onSuggestion: (value) {
                        _composer.text = value;
                        _composer.selection =
                            TextSelection.collapsed(offset: value.length);
                        _focus.requestFocus();
                      },
                    )
                  : ListView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                      children: [
                        _ObjectiveSummary(
                          avatarName: avatar.name,
                          objective: _objective!,
                          stage: _stage,
                        ),
                        const SizedBox(height: 10),
                        for (final message in _responses) ...[
                          _AvatarResultFrame(
                            avatarName: avatar.name,
                            child: LiveMessageBubble(
                              message: message,
                              onPayload: _send,
                            ),
                          ),
                          const SizedBox(height: 10),
                        ],
                        if (_sending)
                          _WorkingCard(
                            avatar: avatar,
                            stage: _stage,
                          ),
                        if (_error != null) ...[
                          const SizedBox(height: 8),
                          _ErrorCard(
                            text: _error!,
                            onRetry: () => _focus.requestFocus(),
                          ),
                        ],
                      ],
                    ),
            ),
            _JourneyComposer(
              controller: _composer,
              focusNode: _focus,
              hint: _objective == null ? _hint : 'Répondez à votre Avatar…',
              sending: _sending,
              onSend: _send,
            ),
          ],
        ),
      ),
    );
  }
}

class _JourneyHeader extends StatelessWidget {
  const _JourneyHeader({
    required this.avatar,
    required this.state,
    required this.stage,
    required this.intent,
  });

  final LiveAvatarController avatar;
  final LiveAvatarPresenceState state;
  final int stage;
  final String intent;

  @override
  Widget build(BuildContext context) {
    const labels = ['Objectif', 'Marché', 'Négociation', 'Livraison', 'Terminé'];
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 10, 12, 6),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .90),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: WaouhPalette.line),
        boxShadow: WaouhShadows.card,
      ),
      child: Column(
        children: [
          Row(
            children: [
              LiveAvatarVisual(
                preset: avatar.profile.preset,
                state: state,
                size: 54,
              ),
              const SizedBox(width: 9),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      avatar.name,
                      style: const TextStyle(
                        color: WaouhPalette.ink,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      stage >= 3
                          ? 'Je sécurise la suite du deal.'
                          : stage >= 2
                              ? 'Je conduis la négociation avec vous.'
                              : stage >= 1
                                  ? 'Je compare les opportunités réelles.'
                                  : intent == 'sell'
                                      ? 'Je vais trouver les bons acheteurs.'
                                      : 'Je vais explorer le marché pour vous.',
                      style: const TextStyle(
                        color: WaouhPalette.muted,
                        fontSize: 10.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F5FF),
                  borderRadius: BorderRadius.circular(99),
                ),
                child: const Text(
                  'CONTACT PROTÉGÉ',
                  style: TextStyle(
                    color: WaouhPalette.blue,
                    fontSize: 8,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              for (var i = 0; i < labels.length; i++) ...[
                Expanded(
                  child: Column(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        height: 4,
                        decoration: BoxDecoration(
                          color: i <= stage
                              ? WaouhPalette.blue
                              : const Color(0xFFE4EAF4),
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        labels[i],
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: i <= stage
                              ? WaouhPalette.ink
                              : WaouhPalette.muted,
                          fontSize: 7.8,
                          fontWeight:
                              i == stage ? FontWeight.w800 : FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                if (i != labels.length - 1) const SizedBox(width: 4),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _ObjectiveCanvas extends StatelessWidget {
  const _ObjectiveCanvas({
    required this.avatarName,
    required this.question,
    required this.suggestions,
    required this.onSuggestion,
  });

  final String avatarName;
  final String question;
  final List<String> suggestions;
  final ValueChanged<String> onSuggestion;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(22, 30, 22, 24),
        children: [
          const Icon(
            Icons.auto_awesome_rounded,
            size: 34,
            color: WaouhPalette.blue,
          ),
          const SizedBox(height: 14),
          Text(
            question,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 7),
          Text(
            '$avatarName explore NEXUS, Radar, Partenaires et Signal Fabric. '
            'Vous gardez la décision finale.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: WaouhPalette.muted,
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 22),
          for (final suggestion in suggestions)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: OutlinedButton.icon(
                onPressed: () => onSuggestion(suggestion),
                icon: const Icon(Icons.arrow_outward_rounded, size: 17),
                label: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(suggestion),
                ),
              ),
            ),
        ],
      );
}

class _ObjectiveSummary extends StatelessWidget {
  const _ObjectiveSummary({
    required this.avatarName,
    required this.objective,
    required this.stage,
  });

  final String avatarName;
  final String objective;
  final int stage;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          gradient: WaouhGradients.airHero,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFDDE7F7)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.track_changes_rounded,
                color: WaouhPalette.blue, size: 20),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Votre objectif',
                    style: TextStyle(
                      color: WaouhPalette.blue,
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    objective,
                    style: const TextStyle(
                      color: WaouhPalette.ink,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      height: 1.3,
                    ),
                  ),
                  if (stage > 0) ...[
                    const SizedBox(height: 5),
                    Text(
                      '$avatarName poursuit cet objectif en arrière-plan.',
                      style: const TextStyle(
                        color: WaouhPalette.muted,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
}

class _AvatarResultFrame extends StatelessWidget {
  const _AvatarResultFrame({
    required this.avatarName,
    required this.child,
  });

  final String avatarName;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 5, bottom: 4),
            child: Text(
              '$avatarName a trouvé',
              style: const TextStyle(
                color: WaouhPalette.muted,
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          child,
        ],
      );
}

class _WorkingCard extends StatelessWidget {
  const _WorkingCard({
    required this.avatar,
    required this.stage,
  });

  final LiveAvatarController avatar;
  final int stage;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF2F7FF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFDCE7F8)),
        ),
        child: Row(
          children: [
            LiveAvatarVisual(
              preset: avatar.profile.preset,
              state: stage >= 2
                  ? LiveAvatarPresenceState.negotiating
                  : LiveAvatarPresenceState.searching,
              size: 42,
              showStatusBadge: false,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                stage >= 2
                    ? '${avatar.name} sécurise la prochaine étape…'
                    : '${avatar.name} interroge le marché réel…',
                style: const TextStyle(
                  color: WaouhPalette.ink,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox.square(
              dimension: 17,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          ],
        ),
      );
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({
    required this.text,
    required this.onRetry,
  });

  final String text;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF3F3),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFFF4D1D4)),
        ),
        child: Row(
          children: [
            const Icon(Icons.info_outline_rounded,
                color: Color(0xFFB43B45), size: 19),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text.replaceFirst('Bad state: ', ''),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xFF7A343A),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            TextButton(onPressed: onRetry, child: const Text('Réessayer')),
          ],
        ),
      );
}

class _JourneyComposer extends StatelessWidget {
  const _JourneyComposer({
    required this.controller,
    required this.focusNode,
    required this.hint,
    required this.sending,
    required this.onSend,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final String hint;
  final bool sending;
  final VoidCallback onSend;

  @override
  Widget build(BuildContext context) => SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(10, 4, 10, 10),
        child: Container(
          padding: const EdgeInsets.fromLTRB(10, 4, 5, 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: WaouhPalette.line),
            boxShadow: WaouhShadows.card,
          ),
          child: Row(
            children: [
              const Icon(Icons.auto_awesome_rounded,
                  color: WaouhPalette.blue, size: 19),
              const SizedBox(width: 7),
              Expanded(
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  minLines: 1,
                  maxLines: 4,
                  onSubmitted: (_) => onSend(),
                  decoration: InputDecoration(
                    hintText: hint,
                    filled: false,
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding:
                        const EdgeInsets.symmetric(vertical: 11),
                  ),
                ),
              ),
              FilledButton(
                onPressed: sending ? null : onSend,
                style: FilledButton.styleFrom(
                  minimumSize: const Size(44, 44),
                  maximumSize: const Size(44, 44),
                  padding: EdgeInsets.zero,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(15),
                  ),
                ),
                child: sending
                    ? const SizedBox.square(
                        dimension: 17,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.arrow_upward_rounded, size: 20),
              ),
            ],
          ),
        ),
      );
}
