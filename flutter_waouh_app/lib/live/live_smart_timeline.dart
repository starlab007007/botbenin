import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';

import 'live_commerce_workflow.dart';
import 'live_models.dart';
import 'live_widgets.dart';

/// Timeline unique du Chat Meet.
///
/// Une seule étape commerciale est active à la fois : les boutons d'une
/// ancienne offre disparaissent dès qu'une réponse est envoyée ou qu'un état
/// terminal est reçu. Cela évite les doubles acceptations et les payloads
/// obsolètes après une contre-offre.
class LiveSmartTimeline extends StatefulWidget {
  const LiveSmartTimeline({
    super.key,
    required this.messages,
    this.onPayload,
    this.emptyMessage = 'Aucun message pour le moment.',
    this.padding = const EdgeInsets.fromLTRB(12, 10, 12, 12),
    this.showAssistantHint = false,
  });

  final List<LiveMessage> messages;
  final ValueChanged<String>? onPayload;
  final String emptyMessage;
  final EdgeInsets padding;
  final bool showAssistantHint;

  @override
  State<LiveSmartTimeline> createState() => _LiveSmartTimelineState();
}

class _LiveSmartTimelineState extends State<LiveSmartTimeline> {
  final ScrollController _scrollController = ScrollController();
  bool _followTail = true;
  int _unseen = 0;
  String? _lastMessageId;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_observePosition);
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom(false));
  }

  @override
  void didUpdateWidget(covariant LiveSmartTimeline oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.messages.isEmpty) return;
    final newest = widget.messages.last;
    if (newest.id == _lastMessageId) return;
    _lastMessageId = newest.id;
    if (_followTail || newest.outgoing) {
      WidgetsBinding.instance
          .addPostFrameCallback((_) => _scrollToBottom(true));
    } else {
      setState(() => _unseen += 1);
    }
  }

  void _observePosition() {
    if (!_scrollController.hasClients) return;
    final next = _scrollController.position.extentAfter < 96;
    if (next == _followTail) return;
    setState(() {
      _followTail = next;
      if (next) _unseen = 0;
    });
  }

  Future<void> _scrollToBottom(bool animated) async {
    if (!_scrollController.hasClients) return;
    final target = _scrollController.position.maxScrollExtent;
    if (animated) {
      await _scrollController.animateTo(
        target,
        duration: const Duration(milliseconds: 320),
        curve: Curves.easeOutCubic,
      );
    } else {
      _scrollController.jumpTo(target);
    }
    if (!mounted) return;
    setState(() {
      _followTail = true;
      _unseen = 0;
    });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_observePosition);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.messages.isEmpty && !widget.showAssistantHint) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(30),
          child: Text(
            widget.emptyMessage,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, color: Color(0xFF60746E)),
          ),
        ),
      );
    }

    final latestActionIndex = liveLatestActionableMessageIndex(widget.messages);
    return Stack(
      children: [
        ListView.builder(
          controller: _scrollController,
          padding: widget.padding,
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          itemCount:
              widget.messages.length + (widget.showAssistantHint ? 1 : 0),
          itemBuilder: (_, index) {
            if (index == widget.messages.length) {
              return _AssistantHint(
                  searching: _isSearchRequest(widget.messages));
            }
            final message = widget.messages[index];
            final standaloneProductInterest =
                liveMessageHasStandaloneProductInterestActions(message);
            final enabled =
                index == latestActionIndex || standaloneProductInterest;
            return LiveMessageBubble(
              message: message,
              actionsEnabled: enabled,
              onPayload: enabled ? widget.onPayload : null,
            );
          },
        ),
        if (_unseen > 0)
          Positioned(
            right: 16,
            bottom: 16,
            child: FilledButton.icon(
              onPressed: () => _scrollToBottom(true),
              icon: const Icon(Icons.arrow_downward_rounded, size: 18),
              label: Text(
                _unseen == 1 ? 'Nouveau message' : '$_unseen nouveaux messages',
              ),
              style: FilledButton.styleFrom(
                minimumSize: const Size(0, 44),
                padding: const EdgeInsets.symmetric(horizontal: 14),
              ),
            ),
          ),
      ],
    );
  }
}

class _AssistantHint extends StatelessWidget {
  const _AssistantHint({required this.searching});
  final bool searching;

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    return Padding(
      padding: const EdgeInsets.only(top: 4, bottom: 12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF4F8FF),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFDCE7F8)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            LiveAvatarVisual(
              preset: avatar.profile.preset,
              state: searching
                  ? LiveAvatarPresenceState.searching
                  : LiveAvatarPresenceState.typing,
              size: 34,
              showStatusBadge: false,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                searching
                    ? '${avatar.name} cherche et compare avec NEXUS…'
                    : '${avatar.name} prépare sa réponse…',
                style: const TextStyle(
                  color: Color(0xFF315BD8),
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

bool _isSearchRequest(List<LiveMessage> messages) {
  for (final message in messages.reversed) {
    if (!message.outgoing) continue;
    final value = message.text.toLowerCase();
    return value.contains('cherche') ||
        value.contains('trouve') ||
        value.contains('acheter') ||
        value.contains('où') ||
        value.contains('ou ');
  }
  return false;
}
