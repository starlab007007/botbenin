import 'package:flutter/material.dart';

import 'live_models.dart';
import 'live_widgets.dart';

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
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom(true));
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
      await _scrollController.animateTo(target, duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic);
    } else {
      _scrollController.jumpTo(target);
    }
    if (mounted) setState(() { _followTail = true; _unseen = 0; });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_observePosition);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.messages.isEmpty) {
      return Center(child: Padding(padding: const EdgeInsets.all(30), child: Text(widget.emptyMessage, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, color: Color(0xFF60746E)))));
    }
    return Stack(children: [
      ListView.builder(
        controller: _scrollController,
        padding: widget.padding,
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        itemCount: widget.messages.length + (widget.showAssistantHint ? 1 : 0),
        itemBuilder: (_, index) {
          if (index == widget.messages.length) return const _AssistantHint();
          return LiveMessageBubble(message: widget.messages[index], onPayload: widget.onPayload);
        },
      ),
      if (_unseen > 0)
        Positioned(
          right: 16,
          bottom: 16,
          child: FilledButton.icon(
            onPressed: () => _scrollToBottom(true),
            icon: const Icon(Icons.arrow_downward_rounded, size: 18),
            label: Text(_unseen == 1 ? 'Nouveau message' : '$_unseen nouveaux messages'),
            style: FilledButton.styleFrom(minimumSize: const Size(0, 44), padding: const EdgeInsets.symmetric(horizontal: 14)),
          ),
        ),
    ]);
  }
}

class _AssistantHint extends StatelessWidget {
  const _AssistantHint();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.only(top: 4, bottom: 12),
    child: Row(children: [
      Icon(Icons.auto_awesome_outlined, size: 15, color: Color(0xFF60746E)),
      SizedBox(width: 6),
      Text('WAOUH prepare la reponse...', style: TextStyle(color: Color(0xFF60746E), fontSize: 12.5, fontWeight: FontWeight.w600)),
    ]),
  );
}
