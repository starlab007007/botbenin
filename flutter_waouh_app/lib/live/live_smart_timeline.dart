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
    this.leading,
  });

  final List<LiveMessage> messages;
  final ValueChanged<String>? onPayload;
  final String emptyMessage;
  final EdgeInsets padding;
  final bool showAssistantHint;
  /// Début de conversation intégré à la liste, sans réduire sa hauteur visible.
  final Widget? leading;

  @override
  State<LiveSmartTimeline> createState() => _LiveSmartTimelineState();
}

class _LiveSmartTimelineState extends State<LiveSmartTimeline> {
  final ScrollController _scrollController = ScrollController();
  bool _followTail = true;
  bool _userDragging = false;
  int _unseen = 0;
  String? _lastMessageId;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_observePosition);
    // A new conversation must start at the beginning of its welcome
    // prompts, not at the bottom of a long introduction.
    if (widget.messages.isEmpty && widget.leading != null) _followTail = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.messages.isNotEmpty) _scrollToBottom(false);
    });
  }

  @override
  void didUpdateWidget(covariant LiveSmartTimeline oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Do not steal touch/drag gestures when new messages, images, or typing
    // indicators alter the height of the conversation.
    if (widget.showAssistantHint && !oldWidget.showAssistantHint && _followTail && !_userDragging) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _followTail && !_userDragging) _scrollToBottom(true);
      });
    }
    if (widget.messages.isEmpty) {
      _lastMessageId = null;
      return;
    }
    final newest = widget.messages.last;
    if (newest.id == _lastMessageId) return;
    _lastMessageId = newest.id;
    // Evaluate the *real* viewport, not only the cached tail flag:
    // a layout or keyboard resize can leave that flag momentarily stale.
    final atTail = !_userDragging && _scrollController.hasClients &&
        _scrollController.position.extentAfter < 96;
    if (atTail && _followTail) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _followTail && !_userDragging) _scrollToBottom(true);
      });
    } else if (!newest.outgoing) {
      setState(() {
        _followTail = false;
        _unseen += 1;
      });
    }
  }

  void _observePosition() {
    if (!_scrollController.hasClients) return;
    if (_userDragging) return;
    final next = _scrollController.position.extentAfter < 96;
    if (next == _followTail) return;
    setState(() {
      _followTail = next;
      if (next) _unseen = 0;
    });
  }

  Future<void> _scrollToBottom(bool animated) async {
    if (!mounted || !_scrollController.hasClients || _userDragging) return;
    final target = _scrollController.position.maxScrollExtent;
    // Changing size while dragging must never enqueue a new scroll animation.
    if (animated) {
      await _scrollController.animateTo(
        target,
        duration: const Duration(milliseconds: 240),
        curve: Curves.easeOutCubic,
      );
    } else {
      _scrollController.jumpTo(target);
    }
    if (!mounted || _userDragging) return;
    if (!_followTail || _unseen != 0) {
      setState(() {
        _followTail = true;
        _unseen = 0;
      });
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_observePosition);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.messages.isEmpty && !widget.showAssistantHint && widget.leading == null) {
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
    var lastResultsIndex = -1;
    for (var i = widget.messages.length - 1; i >= 0; i--) {
      if (liveMessageHasResults(widget.messages[i])) {
        lastResultsIndex = i;
        break;
      }
    }
    return Stack(
      children: [
        NotificationListener<ScrollNotification>(
          onNotification: (notification) {
            if (notification is ScrollStartNotification && notification.dragDetails != null) {
              _userDragging = true;
              if (_followTail) setState(() => _followTail = false);
            }
            if (notification is ScrollEndNotification) {
              _userDragging = false;
              _observePosition();
            }
            return false;
          },
          child: NotificationListener<ScrollMetricsNotification>(
            onNotification: (notification) {
              // Automatic follow is permitted only while the user is at
              // the bottom, and never in the middle of a manual gesture.
              if (_followTail && !_userDragging && notification.metrics.extentAfter > 2) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (mounted && _scrollController.hasClients && _followTail && !_userDragging) {
                    _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
                  }
                });
              }
              return false;
            },
            child: ListView.builder(
          controller: _scrollController,
          primary: false,
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          padding: widget.padding,
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          itemCount: widget.messages.length + (widget.showAssistantHint ? 1 : 0) + (widget.leading == null ? 0 : 1),
          itemBuilder: (_, rawIndex) {
            if (widget.leading != null && rawIndex == 0) {
              return widget.leading!;
            }
            final index = rawIndex - (widget.leading == null ? 0 : 1);
            if (index == widget.messages.length) {
              return _AssistantHint(searching: _isSearchRequest(widget.messages));
            }
            final message = widget.messages[index];
            final standaloneProductInterest =
                liveMessageHasStandaloneProductInterestActions(message);
            final enabled =
                index == latestActionIndex || standaloneProductInterest;
            return _EnterAnimation(
              key: ValueKey('enter-${message.id}'),
              animate:
                  DateTime.now().difference(message.createdAt).inSeconds.abs() <
                      8,
              child: LiveMessageBubble(
                message: message,
                actionsEnabled: enabled,
                collapseOldResults: index < lastResultsIndex,
                onPayload: enabled ? widget.onPayload : null,
              ),
            );
          },
        ),
          ),
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

/// Apparition douce (fondu + glissement) pour un message récent.
class _EnterAnimation extends StatelessWidget {
  const _EnterAnimation({super.key, required this.child, required this.animate});
  final Widget child;
  final bool animate;
  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
        tween: Tween(begin: animate ? 0 : 1, end: 1),
        duration: Duration(milliseconds: animate ? 260 : 0),
        curve: Curves.easeOutCubic,
        builder: (_, v, c) => Opacity(
          opacity: v,
          child: Transform.translate(offset: Offset(0, (1 - v) * 10), child: c),
        ),
        child: child,
      );
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
