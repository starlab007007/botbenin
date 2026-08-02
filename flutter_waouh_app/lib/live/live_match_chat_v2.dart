import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';
import 'live_controller_extensions.dart';
import 'live_controller_match_actions.dart';
import 'live_controller_v2.dart';
import 'live_models.dart';
import 'live_smart_timeline.dart';
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
  Stream<List<LiveMessage>>? _messageStream;
  bool _resolving = true;
  String? _loadingError;

  bool get _ready =>
      _match?.threadId?.isNotEmpty == true && _messageStream != null;

  @override
  void initState() {
    super.initState();
    _match = widget.initial;
    if (_match?.threadId?.isNotEmpty == true) {
      _messageStream =
          context.read<LiveWaouhController>().matchMessages(_match!);
      _resolving = false;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_ready) {
        unawaited(
          context.read<LiveWaouhController>().markMatchRead(_match!),
        );
      } else {
        unawaited(_hydrateMatch());
      }
    });
  }

  @override
  void dispose() {
    _composer.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _hydrateMatch() async {
    if (!mounted) return;
    setState(() {
      _resolving = true;
      _loadingError = null;
    });

    final controller = context.read<LiveWaouhController>();
    var lookupKey = widget.matchKey;
    var seed = _match;
    const delays = <Duration>[
      Duration.zero,
      Duration(milliseconds: 160),
      Duration(milliseconds: 320),
      Duration(milliseconds: 600),
      Duration(milliseconds: 950),
      Duration(milliseconds: 1500),
      Duration(milliseconds: 2200),
    ];

    for (final delay in delays) {
      if (delay != Duration.zero) await Future<void>.delayed(delay);
      if (!mounted) return;

      final resolvedKey = controller is LiveWaouhControllerV2
          ? controller.takeResolvedMeetKey()
          : controller.takePendingMeetKey();
      if (resolvedKey != null && resolvedKey.isNotEmpty) {
        lookupKey = resolvedKey;
        if (resolvedKey.startsWith('meet_') && seed != null) {
          final immediate = _withResolvedThread(seed, resolvedKey);
          _activateMatch(immediate);
          unawaited(_refreshResolvedMetadata(resolvedKey, immediate));
          return;
        }
      }

      try {
        final found = await controller.resolveMatch(
          lookupKey,
          seed: seed,
        );
        if (found != null && found.threadId?.isNotEmpty == true) {
          _activateMatch(found);
          return;
        }
        seed = found ?? seed;
      } catch (_) {
        // Le squelette reste affiché pendant les nouvelles tentatives.
      }
    }

    if (!mounted) return;
    setState(() {
      _resolving = false;
      _loadingError =
          'La connexion prend plus de temps que prévu. Touchez Réessayer.';
    });
  }

  Future<void> _refreshResolvedMetadata(
    String key,
    LiveMatch immediate,
  ) async {
    final controller = context.read<LiveWaouhController>();
    try {
      final found = await controller.resolveMatch(key, seed: immediate);
      if (!mounted || found == null || found.threadId?.isNotEmpty != true) {
        return;
      }
      _activateMatch(found);
    } catch (_) {}
  }

  LiveMatch _withResolvedThread(LiveMatch source, String key) {
    final threadId =
        key.startsWith('meet_') ? key.substring(5) : source.threadId;
    return LiveMatch(
      key: key,
      articleId: source.articleId,
      role: source.role,
      title: source.title,
      lastAt: DateTime.now(),
      notificationIds: source.notificationIds,
      buyerProfileId: source.buyerProfileId,
      counterpartUserId: source.counterpartUserId,
      threadId: threadId,
      threadType: source.threadType,
      searchRequestId: source.searchRequestId,
      buyerUserId: source.buyerUserId,
      sellerUserId: source.sellerUserId,
      source: source.source,
      counterpartLabel: source.counterpartLabel,
      negotiationId: source.negotiationId,
      dealId: source.dealId,
      transactionId: source.transactionId,
      seedText: source.seedText,
      price: source.price,
      city: source.city,
      photo: source.photo,
      photoUrls: source.photoUrls,
      unreadCount: source.unreadCount,
    );
  }

  void _activateMatch(LiveMatch match) {
    if (!mounted) return;
    final controller = context.read<LiveWaouhController>();
    setState(() {
      _match = match;
      _messageStream = controller.matchMessages(match);
      _resolving = false;
      _loadingError = null;
    });
    unawaited(controller.markMatchRead(match));
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
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  void _handlePayload(String payload) {
    final command = payload.trim().toLowerCase();
    if (command == 'proposer' ||
        command.startsWith('proposer:') ||
        command == 'contre-proposition' ||
        command.startsWith('contre-proposition:') ||
        command.startsWith('counter:')) {
      final suggested = command.startsWith('proposer:')
          ? command
              .substring('proposer:'.length)
              .replaceAll(RegExp(r'\D'), '')
          : '';
      _composer.text = suggested.isEmpty
          ? 'Je propose  FCFA'
          : 'Je propose $suggested FCFA';
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
    actionMeta.putIfAbsent(
      'idempotency_key',
      context.read<LiveWaouhController>().newIdempotencyKey,
    );
    if (!_ready || match == null || (text.isEmpty && media.isEmpty)) return;
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
    try {
      final meta = Map<String, dynamic>.from(local.meta)
        ..remove('delivery_state');
      await context.read<LiveWaouhController>().sendMatch(
          match: match,
          text: local.text,
          attachments: local.attachments,
          meta: meta);
      _setDelivery(
        local.id,
        context.read<LiveWaouhController>().isOnline ? 'sent' : 'queued',
      );
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
    final title = (match?.title.trim().isNotEmpty ?? false)
        ? match!.title
        : 'Discussion WAOUH';
    final subtitle = _ready
        ? '${match!.role == 'seller' ? 'Acheteur intéressé' : 'Discussion produit'}${match.city == null ? '' : ' · ${match.city}'}'
        : _resolving
            ? 'Ouverture de la discussion…'
            : 'Discussion en attente';

    return Scaffold(
      backgroundColor: const Color(0xFFF5FAF7),
      appBar: LiveHeader(
        title: title,
        subtitle: subtitle,
        back: true,
        actions: [
          if (_ready)
            IconButton(
              tooltip: 'Archiver',
              onPressed: () async {
                await controller.archiveMatch(match!, true);
                if (mounted) Navigator.of(context).pop();
              },
              icon: const Icon(Icons.archive_outlined),
            ),
        ],
      ),
      body: _ready
          ? Column(children: [
              Expanded(
                child: StreamBuilder<List<LiveMessage>>(
                  stream: _messageStream,
                  builder: (_, snapshot) => LiveSmartTimeline(
                    messages: _merge(snapshot.data ?? const <LiveMessage>[]),
                    onPayload: _handlePayload,
                    showAssistantHint: _optimistic.any(
                      (item) => item.meta['delivery_state'] == 'sending',
                    ),
                    emptyMessage: match!.isSearch
                        ? 'Commencez ou poursuivez cette recherche avec WAOUH.'
                        : 'Commencez la discussion sur ce produit.',
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
                  ),
                ),
              ),
              LiveAttachmentStrip(
                items: _attachments,
                onRemove: (item) =>
                    setState(() => _attachments.remove(item)),
              ),
              _composerBar(),
            ])
          : _MatchOpeningSkeleton(
              title: title,
              loading: _resolving,
              error: _loadingError,
              onRetry: _hydrateMatch,
            ),
    );
  }

  Widget _composerBar() => SafeArea(
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
      );
}

class _MatchOpeningSkeleton extends StatelessWidget {
  const _MatchOpeningSkeleton({
    required this.title,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final String title;
  final bool loading;
  final String? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => ListView(
        padding: const EdgeInsets.fromLTRB(14, 18, 14, 24),
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFD7E9E1)),
            ),
            child: Row(children: [
              Container(
                width: 58,
                height: 58,
                decoration: BoxDecoration(
                  color: const Color(0xFFE6F4EE),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.shopping_bag_outlined,
                  color: Color(0xFF7D9C90),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _skeletonLine(double.infinity),
                    const SizedBox(height: 7),
                    _skeletonLine(128),
                  ],
                ),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              width: MediaQuery.sizeOf(context).width * .72,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE0ECE7)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _skeletonLine(double.infinity),
                  const SizedBox(height: 9),
                  _skeletonLine(double.infinity),
                  const SizedBox(height: 9),
                  _skeletonLine(150),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
          if (loading) ...[
            const LinearProgressIndicator(minHeight: 3),
            const SizedBox(height: 10),
            const Text(
              'Connexion au vendeur et chargement de la conversation…',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF667A73),
                fontWeight: FontWeight.w700,
              ),
            ),
          ] else ...[
            Text(
              error ?? 'Discussion momentanément indisponible.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF667A73),
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            Center(
              child: FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Réessayer'),
              ),
            ),
          ],
        ],
      );

  static Widget _skeletonLine(double width) => Container(
        width: width,
        height: 11,
        decoration: BoxDecoration(
          color: const Color(0xFFE5EFEB),
          borderRadius: BorderRadius.circular(99),
        ),
      );
}
