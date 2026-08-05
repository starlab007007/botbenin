import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';
import 'live_commerce_workflow.dart';
import 'live_controller_extensions.dart';
import 'live_controller_match_actions.dart';
import 'live_models.dart';
import 'live_match_navigation.dart';
import 'live_smart_timeline.dart';
import 'live_thread_flow.dart';
import 'live_widgets.dart';

class LiveMatchChatV2 extends StatefulWidget {
  const LiveMatchChatV2({super.key, required this.matchKey, this.initial});
  final String matchKey;
  final LiveMatch? initial;

  @override
  State<LiveMatchChatV2> createState() => _LiveMatchChatV2State();
}

class _LiveMatchChatV2State extends State<LiveMatchChatV2> {
  final _composer = TextEditingController();
  final _focus = FocusNode();
  final _attachments = <LiveAttachment>[];
  final _optimistic = <LiveMessage>[];
  LiveMatch? _match;
  LiveMatch? _pendingSeed;
  Stream<List<LiveMessage>>? _messageStream;
  Object? _resolveError;
  int _automaticResolveCycles = 0;
  bool _resolving = false;
  Timer? _resolveRetryTimer;
  late final LiveWaouhController _controller;
  bool _promotionScheduled = false;
  String? _promotedThreadId;

  @override
  void initState() {
    super.initState();
    _controller = context.read<LiveWaouhController>();
    _controller.addListener(_onControllerChanged);
    final initial = widget.initial;
    if (initial != null &&
        liveShouldDisplayInterestedWindowImmediately(initial)) {
      _match = initial;
      if (liveIsProvisionalInterestedMatch(initial)) {
        _pendingSeed = initial;
        _messageStream = _controller.matchMessages(initial);
        final seedText = (initial.seedText ?? '').trim();
        if (seedText.isNotEmpty) {
          _optimistic.add(
            LiveMessage(
              id: 'prepared_${DateTime.now().microsecondsSinceEpoch}',
              text: seedText,
              createdAt: initial.lastAt,
              direction: 'in',
              threadId: null,
              articleId: initial.isSearch ? null : initial.articleId,
              meta: <String, dynamic>{
                'delivery_state': 'sent',
                'prepared_interest': true,
                'intent': 'interested',
                'workflow_state': 'summary_only',
                'products': <Map<String, dynamic>>[
                  liveInterestedProductPreview(initial),
                ],
              },
            ),
          );
        }
      } else {
        _messageStream = _controller.matchMessages(initial);
      }
    } else {
      _match = initial;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _resolve());
  }

  void _onControllerChanged() {
    final seed = _pendingSeed;
    if (!mounted || seed == null || _promotionScheduled) return;
    final resolved = _controller.preparedInterestedResolution(seed);
    if (!liveCanPromoteInterestedMatch(seed: seed, resolved: resolved)) return;
    _promotionScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _promotionScheduled = false;
      if (!mounted || resolved == null) return;
      _applyResolvedMatch(resolved);
    });
  }

  void _applyResolvedMatch(LiveMatch found) {
    if (found.threadId?.trim().isNotEmpty != true) return;
    final replacePendingRoute = liveShouldReplaceLegacyMatchRoute(
          currentRouteKey: widget.matchKey,
          resolved: found,
        ) &&
        _promotedThreadId != found.threadId;
    _promotedThreadId = found.threadId;
    _resolveRetryTimer?.cancel();
    unawaited(_controller.markMatchRead(found));
    setState(() {
      _resolving = false;
      _resolveError = null;
      _automaticResolveCycles = 0;
      _pendingSeed = null;
      _match = found;
      _messageStream = _controller.matchMessages(found);
    });

    if (replacePendingRoute) {
      final router = GoRouter.of(context);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        unawaited(
          router.replace(
            liveMatchChatLocation(found),
            extra: found,
          ),
        );
      });
    }
  }

  Future<void> _resolve({
    bool repairSubmission = false,
    bool replayAcceptedSubmission = false,
  }) async {
    if (_resolving) return;
    final controller = _controller;
    final seed = _pendingSeed;
    final current = _match;
    if (seed == null && current?.threadId?.trim().isNotEmpty == true) return;

    if (mounted) {
      setState(() {
        _resolving = true;
        _resolveError = null;
      });
    }

    try {
      final found = seed != null
          ? repairSubmission
              ? await controller.repairPreparedInterestedMeet(
                  seed,
                  replayAcceptedSubmission: replayAcceptedSubmission,
                )
              : await controller.resolvePreparedInterestedMeet(seed)
          : (current ?? await controller.resolveMatch(widget.matchKey));
      if (found == null || found.threadId?.trim().isNotEmpty != true) {
        throw StateError('Le fil produit est encore en cours de création.');
      }

      if (!mounted) return;
      _applyResolvedMatch(found);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _resolving = false;
        _resolveError = error;
      });
      if (seed != null && _automaticResolveCycles < 2) {
        final repairSubmission = _automaticResolveCycles == 0;
        _automaticResolveCycles += 1;
        _resolveRetryTimer?.cancel();
        _resolveRetryTimer = Timer(const Duration(seconds: 3), () {
          if (mounted) {
            unawaited(_resolve(repairSubmission: repairSubmission));
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _resolveRetryTimer?.cancel();
    _controller.removeListener(_onControllerChanged);
    _composer.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _pick(ImageSource source) async {
    final file =
        await ImagePicker().pickImage(source: source, imageQuality: 82);
    if (file == null || !mounted) return;
    try {
      final attachment =
          await context.read<LiveWaouhController>().uploadChatImage(file);
      if (mounted) setState(() => _attachments.add(attachment));
    } catch (error) {
      if (mounted)
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  void _handlePayload(String payload) {
    final kind = liveCommerceActionKind(payload);
    if (kind == LiveCommerceActionKind.counter) {
      final suggestedRaw = liveCommerceQuery(payload)['suggested_price'] ??
          liveCommerceLegacyReference(payload) ??
          '';
      final suggested = suggestedRaw.replaceAll(RegExp(r'\D'), '');
      _composer.text =
          suggested.isEmpty ? 'Je propose  FCFA' : 'Je propose $suggested FCFA';
      _composer.selection = TextSelection.collapsed(
        offset:
            suggested.isEmpty ? 'Je propose '.length : _composer.text.length,
      );
      _focus.requestFocus();
      return;
    }
    _send(payload);
  }

  void _send([String? payload]) {
    final match = _match;
    final text = payload == null
        ? _composer.text.trim()
        : liveCommercePayloadText(payload);
    final media = List<LiveAttachment>.from(_attachments);
    final actionMeta = payload == null
        ? <String, dynamic>{}
        : liveCommercePayloadMeta(payload);
    if (payload == null) {
      final normalized = text.trim().toLowerCase();
      if (RegExp(r'^\s*(je\s+)?propose\b', caseSensitive: false)
          .hasMatch(text)) {
        actionMeta['action'] = 'counter';
        actionMeta['intent'] = 'negotiation_counter';
        actionMeta['commerce_action'] = 'counter_offer';
      } else if (RegExp(
        r"^(oui|ok|d[’']?accord|j[’']?accepte|accepte|yes)\b",
        caseSensitive: false,
      ).hasMatch(normalized)) {
        actionMeta['action'] = 'accept';
        actionMeta['intent'] = 'negotiation_accept';
        actionMeta['commerce_action'] = 'accept_offer';
      } else if (RegExp(
        r'^(non|no|je refuse|refuse)\b',
        caseSensitive: false,
      ).hasMatch(normalized)) {
        actionMeta['action'] = 'reject';
        actionMeta['intent'] = 'negotiation_reject';
        actionMeta['commerce_action'] = 'reject_offer';
      }
    }
    actionMeta.putIfAbsent(
      'idempotency_key',
      context.read<LiveWaouhController>().newIdempotencyKey,
    );
    if (match == null || (text.isEmpty && media.isEmpty)) return;
    final local = LiveMessage(
      id: 'client_${DateTime.now().microsecondsSinceEpoch}',
      text: text,
      createdAt: DateTime.now(),
      direction: 'in',
      threadId: match.threadId,
      articleId: match.isSearch ? null : match.articleId,
      attachments: media,
      meta: {
        ...actionMeta,
        'delivery_state':
            context.read<LiveWaouhController>().isOnline ? 'sending' : 'queued'
      },
    );
    setState(() {
      _optimistic.add(local);
      _composer.clear();
      _attachments.clear();
    });
    _focus.requestFocus();
    unawaited(_deliver(match, local));
  }

  Future<void> _deliver(LiveMatch match, LiveMessage local) async {
    final controller = _controller;
    try {
      final meta = Map<String, dynamic>.from(local.meta)
        ..remove('delivery_state');
      await controller.sendMatch(
          match: match,
          text: local.text,
          attachments: local.attachments,
          meta: meta);
      _setDelivery(local.id, controller.isOnline ? 'sent' : 'queued');
      if (_pendingSeed != null) unawaited(_resolve());
    } catch (_) {
      _setDelivery(local.id, 'failed');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('Message non envoyé.'),
          action: SnackBarAction(
              label: 'Réessayer', onPressed: () => _deliver(match, local)),
        ));
      }
    }
  }

  void _setDelivery(String id, String state) {
    if (!mounted) return;
    final index = _optimistic.indexWhere((item) => item.id == id);
    if (index < 0) return;
    final item = _optimistic[index];
    setState(() {
      _optimistic[index] = LiveMessage(
        id: item.id,
        text: item.text,
        createdAt: item.createdAt,
        direction: item.direction,
        conversationId: item.conversationId,
        threadId: item.threadId,
        articleId: item.articleId,
        attachments: item.attachments,
        meta: {...item.meta, 'delivery_state': state},
      );
    });
  }

  List<LiveMessage> _merge(List<LiveMessage> remote) {
    final extra = _optimistic.where((local) => !remote.any((item) =>
        item.outgoing &&
        item.text.trim() == local.text.trim() &&
        item.attachments.length == local.attachments.length &&
        item.createdAt.difference(local.createdAt).inSeconds.abs() < 120));
    return [...remote, ...extra]
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final match = _match;
    if (match == null) {
      return Scaffold(
        appBar: const LiveHeader(
          title: 'Discussion produit',
          subtitle: 'Ouverture de la conversation…',
          back: true,
        ),
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE7F6F0),
                      borderRadius: BorderRadius.circular(22),
                    ),
                    child: const Center(
                      child: CircularProgressIndicator(strokeWidth: 3),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    _resolveError == null
                        ? 'Préparation du chat…'
                        : 'La discussion met plus de temps que prévu.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 7),
                  const Text(
                    'WAOUH récupère le fil exact sans créer de doublon.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Color(0xFF667A73),
                      height: 1.35,
                    ),
                  ),
                  if (_resolveError != null) ...[
                    const SizedBox(height: 14),
                    FilledButton.icon(
                      onPressed: () => _resolve(
                        repairSubmission: true,
                        replayAcceptedSubmission: true,
                      ),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Réessayer'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      );
    }
    final pendingThread =
        _pendingSeed != null && liveIsProvisionalInterestedMatch(_pendingSeed!);
    return Scaffold(
      appBar: LiveHeader(
        title: match.title,
        subtitle: pendingThread
            ? 'Discussion ouverte · synchronisation…'
            : '${match.role == 'seller' ? 'Acheteur intéressé' : 'Discussion produit'}${match.city == null ? '' : ' · ${match.city}'}',
        back: true,
        actions: pendingThread
            ? const <Widget>[]
            : [
                IconButton(
                  tooltip: 'Archiver',
                  onPressed: () async {
                    await controller.archiveMatch(match, true);
                    if (!mounted) return;
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(Icons.archive_outlined),
                ),
              ],
      ),
      body: Column(children: [
        if (pendingThread && _resolving)
          const LinearProgressIndicator(minHeight: 2),
        if (pendingThread)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(14, 9, 10, 9),
            color: const Color(0xFFE7F6F0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _resolving
                        ? 'Envoi de votre intérêt et synchronisation du fil exact…'
                        : _resolveError == null
                            ? 'Discussion synchronisée.'
                            : 'Mode provisoire actif : historique et messages restent disponibles pendant la confirmation du fil exact.',
                    style: const TextStyle(
                      color: Color(0xFF315E50),
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (_resolveError != null)
                  TextButton(
                    onPressed: _resolving
                        ? null
                        : () => _resolve(
                              repairSubmission: true,
                              replayAcceptedSubmission: true,
                            ),
                    child: const Text('Réessayer'),
                  ),
              ],
            ),
          ),
        Expanded(
          child: StreamBuilder<List<LiveMessage>>(
            stream: _messageStream,
            builder: (_, snapshot) => LiveSmartTimeline(
              messages: _merge(snapshot.data ?? const <LiveMessage>[]),
              onPayload: _handlePayload,
              showAssistantHint: _optimistic
                  .any((item) => item.meta['delivery_state'] == 'sending'),
              emptyMessage: pendingThread
                  ? 'La discussion est ouverte. L’historique se charge par article et interlocuteur pendant la confirmation du fil.'
                  : match.isSearch
                      ? 'Commencez ou poursuivez cette recherche avec WAOUH.'
                      : 'Commencez la discussion sur ce produit.',
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
            ),
          ),
        ),
        LiveAttachmentStrip(
            items: _attachments,
            onRemove: (item) => setState(() => _attachments.remove(item))),
        SafeArea(
          top: false,
          child: Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(6, 5, 8, 8),
            child: Row(children: [
              IconButton(
                  tooltip: 'Prendre une photo',
                  onPressed: () => _pick(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt_outlined)),
              IconButton(
                  tooltip: 'Joindre une image',
                  onPressed: () => _pick(ImageSource.gallery),
                  icon: const Icon(Icons.attach_file_rounded)),
              Expanded(
                  child: TextField(
                      controller: _composer,
                      focusNode: _focus,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(
                          hintText: 'Message sur ce produit...'))),
              IconButton(
                  tooltip: 'Envoyer',
                  onPressed: _send,
                  icon: const Icon(Icons.send_rounded)),
            ]),
          ),
        ),
      ]),
    );
  }
}
