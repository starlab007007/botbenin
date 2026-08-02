import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';
import 'live_controller_extensions.dart';
import 'live_controller_match_actions.dart';
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
  Object? _resolveError;

  @override
  void initState() {
    super.initState();
    _match = widget.initial;
    if (_match != null) {
      _messageStream =
          context.read<LiveWaouhController>().matchMessages(_match!);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) => _resolve());
  }

  Future<void> _resolve() async {
    final controller = context.read<LiveWaouhController>();
    try {
      final found = _match ?? await controller.resolveMatch(widget.matchKey);
      if (found == null) {
        throw StateError('Discussion introuvable');
      }
      unawaited(controller.markMatchRead(found));
      if (!mounted) return;
      setState(() {
        _resolveError = null;
        _match = found;
        _messageStream = controller.matchMessages(found);
      });
    } catch (error) {
      if (mounted) setState(() => _resolveError = error);
    }
  }

  @override
  void dispose() {
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
    final command = payload.trim().toLowerCase();
    if (command == 'proposer' ||
        command.startsWith('proposer:') ||
        command == 'contre-proposition' ||
        command.startsWith('contre-proposition:') ||
        command.startsWith('counter:')) {
      final suggested = command.startsWith('proposer:')
          ? command.substring('proposer:'.length).replaceAll(RegExp(r'\D'), '')
          : '';
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
    try {
      final meta = Map<String, dynamic>.from(local.meta)
        ..remove('delivery_state');
      await context.read<LiveWaouhController>().sendMatch(
          match: match,
          text: local.text,
          attachments: local.attachments,
          meta: meta);
      _setDelivery(local.id,
          context.read<LiveWaouhController>().isOnline ? 'sent' : 'queued');
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
                      onPressed: _resolve,
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
    return Scaffold(
      appBar: LiveHeader(
        title: match.title,
        subtitle:
            '${match.role == 'seller' ? 'Acheteur intéressé' : 'Discussion produit'}${match.city == null ? '' : ' · ${match.city}'}',
        back: true,
        actions: [
          IconButton(
            tooltip: 'Archiver',
            onPressed: () async {
              await controller.archiveMatch(match, true);
              if (mounted) Navigator.of(context).pop();
            },
            icon: const Icon(Icons.archive_outlined),
          ),
        ],
      ),
      body: Column(children: [
        Expanded(
          child: StreamBuilder<List<LiveMessage>>(
            stream: _messageStream,
            builder: (_, snapshot) => LiveSmartTimeline(
              messages: _merge(snapshot.data ?? const <LiveMessage>[]),
              onPayload: _handlePayload,
              showAssistantHint: _optimistic
                  .any((item) => item.meta['delivery_state'] == 'sending'),
              emptyMessage: match.isSearch
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
