import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import 'live_commerce_action_client.dart';
import 'live_controller.dart';
import 'live_commerce_agent_ui.dart';
import 'live_chat_web_parity.dart';
import 'live_commerce_workflow.dart';
import 'live_controller_extensions.dart';
import 'live_controller_match_actions.dart';
import 'live_deal_journey.dart';
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
  // Reprises silencieuses tant que l'écran est ouvert (plafond 30 s entre
  // deux essais) ; chaque message envoyé relance aussi la confirmation.
  static const int _maxSilentResolveCycles = 40;
  // Parcours v3 : « Poser une question » → le prochain message part au vendeur.
  bool _askMode = false;
  // Un seul appel serveur à la fois (double tap = une seule action).
  bool _actionInFlight = false;
  List<LiveMessage> _lastMerged = const <LiveMessage>[];

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
      // Parcours v3 : plus de bandeau « Mode provisoire ». La confirmation du
      // fil se poursuit en silence (3 s, 6 s, 12 s, 24 s, puis 30 s) ; le
      // serveur renvoie désormais thread_id dès l'ouverture, ces reprises ne
      // servent qu'en cas de réseau lent. Les messages restent envoyables.
      if (seed != null && _automaticResolveCycles < _maxSilentResolveCycles) {
        final repairSubmission = _automaticResolveCycles.isEven;
        final backoff = 3 << _automaticResolveCycles;
        final delaySeconds = backoff > 30 ? 30 : backoff;
        _automaticResolveCycles += 1;
        _resolveRetryTimer?.cancel();
        _resolveRetryTimer = Timer(Duration(seconds: delaySeconds), () {
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

  Map<String, dynamic>? _latestPendingOffer() {
    for (final message in _lastMerged.reversed) {
      final pending = liveMap(message.meta['pending']);
      if (pending['action'] == 'offer') return pending;
    }
    return null;
  }

  Future<void> _confirmPendingOffer(Map<String, dynamic> pending) async {
    if (_actionInFlight) return;
    _actionInFlight = true;
    try {
      final response = await _controller.sendCommerceAction(<String, dynamic>{
        ...pending,
        'source': 'flutter_deal_room',
      });
      if (!mounted) return;
      if (response == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Confirmation indisponible. Réessayez.')),
        );
      } else if (response['ok'] == false) {
        final reply = liveMap(response['reply']);
        final title = liveText(reply['title'], 'Action indisponible');
        final detail = liveText(reply['detail']);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(detail.isEmpty ? title : '$title · $detail')),
        );
      }
    } finally {
      _actionInFlight = false;
    }
  }

  Future<void> _sendTypedOfferV3(LiveMatch match, String text) async {
    if (_actionInFlight) return;
    _actionInFlight = true;
    Map<String, dynamic>? response;
    try {
      response = await _controller.sendCommerceAction(<String, dynamic>{
        'action': 'text',
        'text': text,
        'article_id': match.articleId,
        if (match.threadId?.trim().isNotEmpty == true) 'thread_id': match.threadId,
        if (match.negotiationId?.trim().isNotEmpty == true)
          'negotiation_id': match.negotiationId,
        'source': 'flutter_deal_room',
      });
    } catch (_) {
      response = null;
    } finally {
      _actionInFlight = false;
    }
    if (!mounted) return;
    if (response == null) {
      // V3 coupé / indisponible : comportement historique inchangé.
      _send(null, true);
      return;
    }

    setState(() => _composer.clear());
    _focus.requestFocus();
    final pending = liveMap(response['pending']);
    if (pending['action'] != 'offer') {
      if (response['ok'] == false) {
        final reply = liveMap(response['reply']);
        final title = liveText(reply['title'], 'Action indisponible');
        final detail = liveText(reply['detail']);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(detail.isEmpty ? title : '$title · $detail')),
        );
      }
      return;
    }

    final reply = liveMap(response['reply']);
    final title = liveText(reply['title'], 'Confirmer l’offre');
    final detail = liveText(reply['detail']);
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(title),
        content: Text(detail.isEmpty ? text : detail),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Modifier'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
    if (!mounted) return;
    if (confirm == true) {
      await _confirmPendingOffer(pending);
    } else {
      final amount = int.tryParse('${pending['amount'] ?? ''}');
      setState(() {
        _composer.text = amount != null && amount > 0
            ? 'Je propose ${liveFormatFcfa(amount)}'
            : text;
        _composer.selection =
            TextSelection.collapsed(offset: _composer.text.length);
      });
      _focus.requestFocus();
    }
  }

  void _handlePayload(String payload) {
    if (payload == 'confirm' || payload == 'dismiss') {
      final pending = _latestPendingOffer();
      if (pending != null) {
        if (payload == 'confirm') {
          unawaited(_confirmPendingOffer(pending));
        } else {
          final amount = int.tryParse('${pending['amount'] ?? ''}');
          _composer.text = amount != null && amount > 0
              ? 'Je propose ${liveFormatFcfa(amount)}'
              : 'Je propose ';
          _composer.selection =
              TextSelection.collapsed(offset: _composer.text.length);
          _focus.requestFocus();
        }
        return;
      }
    }
    final kind = liveCommerceActionKind(payload);
    final articleScope = liveArticleScopeKind(payload);
    if (kind == LiveCommerceActionKind.counter || articleScope == 'proposer-prix') {
      // Composeur pré-rempli : prix suggéré du bouton, sinon calculé
      // (milieu des offres / 90 % de l'offre en cours, arrondi à 25 FCFA).
      final explicit = (liveCommerceQuery(payload)['suggested_price'] ?? '')
          .replaceAll(RegExp(r'\D'), '');
      final computed = liveSuggestedCounterPrice(
        currentOffer: liveLatestOffer(_lastMerged),
        listPrice: _match?.price,
      );
      final amount = explicit.isNotEmpty ? int.tryParse(explicit) : computed;
      _composer.text = amount == null
          ? 'Je propose  FCFA'
          : 'Je propose ${liveFormatFcfa(amount)}';
      _composer.selection = TextSelection.collapsed(
        offset: amount == null ? 'Je propose '.length : _composer.text.length,
      );
      _focus.requestFocus();
      return;
    }
    if (articleScope == 'poser-question') {
      setState(() => _askMode = true);
      _focus.requestFocus();
      return;
    }
    if (_actionInFlight) return;
    unawaited(_runServerAction(payload));
  }

  /// Parcours v3 : bouton serveur → contrat d'action unique. Repli sur
  /// l'envoi historique si l'interrupteur est coupé ou hors ligne.
  Future<void> _runServerAction(String payload) async {
    final request = liveCommerceRequestFromPayload(
      payload,
      threadId: _match?.threadId,
    );
    if (request == null) {
      _send(payload);
      return;
    }
    Map<String, dynamic>? response;
    _actionInFlight = true;
    try {
      response = await _controller.sendCommerceAction(request);
    } catch (_) {
      response = null;
    } finally {
      _actionInFlight = false;
    }
    if (!mounted) return;
    if (response == null) {
      _send(payload);
      return;
    }
    // Le fil serveur (bulle de l'utilisateur + réponse courte) arrive par le
    // flux habituel ; seul un refus est signalé tout de suite.
    if (response['ok'] == false) {
      final reply = liveMap(response['reply']);
      final title = liveText(reply['title'], 'Action indisponible');
      final detail = liveText(reply['detail']);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(detail.isEmpty ? title : '$title · $detail')),
      );
    }
  }

  void _send([String? payload, bool bypassCommerceOffer = false]) {
    final match = _match;
    final text = payload == null
        ? _composer.text.trim()
        : liveCommercePayloadText(payload);
    final media = List<LiveAttachment>.from(_attachments);
    final actionMeta = payload == null
        ? <String, dynamic>{}
        : liveCommercePayloadMeta(payload);
    final askingQuestion = payload == null && _askMode;
    if (askingQuestion) {
      actionMeta['commerce_action'] = 'ask';
      setState(() => _askMode = false);
    }

    final typedOffer = payload == null &&
        !askingQuestion &&
        !bypassCommerceOffer &&
        media.isEmpty &&
        RegExp(r'^\s*(je\s+)?(propose|contre[-\s]?propose)\b',
                caseSensitive: false)
            .hasMatch(text);
    if (match != null && typedOffer) {
      unawaited(_sendTypedOfferV3(match, text));
      return;
    }

    // Une question commençant par « Oui… » ou « Non… » reste une question.
    if (payload == null && !askingQuestion) {
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
        backgroundColor: const Color(0xFFF7FAF8),
        appBar: const LiveWebParityChatHeader(
          back: true,
          subtitle: 'Synchronisation du thread canonique…',
          phase: LiveMusePhase.searching,
        ),
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const LiveMuseAvatar(
                    phase: LiveMusePhase.searching,
                    size: 62,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    _resolveError == null
                        ? 'Préparation du chat…'
                        : 'La discussion met plus de temps que prévu.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF15372F),
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
    final mode =
        match.role == 'seller' ? LiveMuseMode.seller : LiveMuseMode.buyer;

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAF8),
      appBar: LiveWebParityChatHeader(
        back: true,
        mode: mode,
        phase:
            pendingThread ? LiveMusePhase.searching : LiveMusePhase.negotiating,
        subtitle:
            'Deal Room · ${match.title}${match.city == null ? '' : ' · ${match.city}'}',
        trailing: pendingThread
            ? const <Widget>[]
            : [
                IconButton(
                  tooltip: 'Archiver',
                  onPressed: () async {
                    await controller.archiveMatch(match, true);
                    if (!mounted) return;
                    context.go('/app/chat');
                  },
                  icon: const Icon(Icons.archive_outlined, size: 20),
                ),
              ],
      ),
      body: Column(
        children: [
          LiveWebParityChatTabs(activeKey: match.key),
          if (pendingThread) const LinearProgressIndicator(minHeight: 2),
          Expanded(
            child: StreamBuilder<List<LiveMessage>>(
              stream: _messageStream,
              builder: (_, snapshot) {
                final merged = _merge(snapshot.data ?? const <LiveMessage>[]);
                _lastMerged = merged;
                final waiting = _optimistic
                    .any((item) => item.meta['delivery_state'] == 'sending');

                void openIntelligence() => showLiveUnifiedIntelligenceSheet(
                      context,
                      messages: merged,
                      busy: waiting,
                      match: match,
                    );

                return Column(
                  children: [
                    LiveDealStepper(
                      stage: liveLatestStage(merged) ??
                          (match.negotiationId != null ? 'negotiation' : null),
                    ),
                    LiveDealRoomBanner(
                      match: match,
                      messages: merged,
                      pending: pendingThread,
                      onIntelligence: openIntelligence,
                    ),
                    Expanded(
                      child: LiveSmartTimeline(
                        messages: merged,
                        onPayload: _handlePayload,
                        showAssistantHint: waiting,
                        emptyMessage: pendingThread
                            ? 'Deal Room ouverte. Votre offre part au vendeur.'
                            : match.isSearch
                                ? 'Poursuivez cette recherche avec votre Avatar.'
                                : 'Commencez la discussion sur ce produit.',
                        padding: const EdgeInsets.fromLTRB(8, 8, 8, 10),
                      ),
                    ),
                    LiveAttachmentStrip(
                      items: _attachments,
                      onRemove: (item) =>
                          setState(() => _attachments.remove(item)),
                    ),
                    LiveSmartComposerBar(
                      messages: merged,
                      busy: waiting,
                      onPrompt: (value) {
                        _composer.text = value;
                        _composer.selection = TextSelection.collapsed(
                          offset: _composer.text.length,
                        );
                        _focus.requestFocus();
                      },
                      onSell: () {
                        _composer.text = 'Je propose ';
                        _composer.selection = TextSelection.collapsed(
                          offset: _composer.text.length,
                        );
                        _focus.requestFocus();
                      },
                      onMuse: openIntelligence,
                    ),
                    LiveWebParityComposerFrame(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          PopupMenuButton<ImageSource>(
                            tooltip: 'Ajouter',
                            icon: const Icon(
                              Icons.add_circle_rounded,
                              color: Color(0xFF08745D),
                            ),
                            onSelected: _pick,
                            itemBuilder: (_) => const [
                              PopupMenuItem(
                                value: ImageSource.camera,
                                child: ListTile(
                                  dense: true,
                                  leading: Icon(Icons.camera_alt_outlined),
                                  title: Text('Photo'),
                                ),
                              ),
                              PopupMenuItem(
                                value: ImageSource.gallery,
                                child: ListTile(
                                  dense: true,
                                  leading: Icon(Icons.photo_library_outlined),
                                  title: Text('Galerie'),
                                ),
                              ),
                            ],
                          ),
                          Expanded(
                            child: TextField(
                              controller: _composer,
                              focusNode: _focus,
                              minLines: 1,
                              maxLines: 4,
                              textInputAction: TextInputAction.send,
                              onSubmitted: (_) => _send(),
                              decoration: InputDecoration(
                                hintText: _askMode
                                    ? (match.role == 'seller'
                                        ? 'Votre question à l’acheteur…'
                                        : 'Votre question au vendeur…')
                                    : match.role == 'seller'
                                        ? 'Répondre à l’acheteur…'
                                        : 'Répondre au vendeur…',
                                filled: false,
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 12,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 5),
                          FilledButton(
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(44, 44),
                              maximumSize: const Size(44, 44),
                              padding: EdgeInsets.zero,
                              backgroundColor: const Color(0xFF08745D),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(15),
                              ),
                            ),
                            onPressed: waiting ? null : _send,
                            child: waiting
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.arrow_upward_rounded,
                                    size: 20,
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
