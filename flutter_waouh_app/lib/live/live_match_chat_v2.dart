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

  @override
  void initState() {
    super.initState();
    _match = widget.initial;
    if (_match != null) {
      _messageStream = context.read<LiveWaouhController>().matchMessages(_match!);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final controller = context.read<LiveWaouhController>();
      final found = _match ?? await controller.resolveMatch(widget.matchKey);
      if (found != null) {
        await controller.markMatchRead(found);
      }
      if (mounted) {
        setState(() {
          _match = found;
          if (found != null) _messageStream = controller.matchMessages(found);
        });
      }
    });
  }

  @override
  void dispose() {
    _composer.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _pick(ImageSource source) async {
    final file = await ImagePicker().pickImage(source: source, imageQuality: 82);
    if (file == null || !mounted) return;
    try {
      final attachment = await context.read<LiveWaouhController>().uploadChatImage(file);
      if (mounted) setState(() => _attachments.add(attachment));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
    }
  }

  void _send([String? payload]) {
    final match = _match;
    final text = (payload ?? _composer.text).trim();
    final media = List<LiveAttachment>.from(_attachments);
    if (match == null || (text.isEmpty && media.isEmpty)) return;
    final local = LiveMessage(
      id: 'client_${DateTime.now().microsecondsSinceEpoch}',
      text: text,
      createdAt: DateTime.now(),
      direction: 'in',
      articleId: match.articleId,
      attachments: media,
      meta: {'delivery_state': context.read<LiveWaouhController>().isOnline ? 'sending' : 'queued'},
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
      await context.read<LiveWaouhController>().sendMatch(match: match, text: local.text, attachments: local.attachments);
      _setDelivery(local.id, context.read<LiveWaouhController>().isOnline ? 'sent' : 'queued');
    } catch (_) {
      _setDelivery(local.id, 'failed');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: const Text('Message non envoyé.'),
          action: SnackBarAction(label: 'Réessayer', onPressed: () => _deliver(match, local)),
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
    return [...remote, ...extra]..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final match = _match;
    if (match == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return Scaffold(
      appBar: LiveHeader(
        title: match.title,
        subtitle: '${match.role == 'seller' ? 'Acheteur intéressé' : 'Discussion produit'}${match.city == null ? '' : ' · ${match.city}'}',
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
        Card(
          margin: const EdgeInsets.all(12),
          child: ListTile(
            leading: match.photo == null ? const CircleAvatar(child: Icon(Icons.inventory_2_outlined)) : CircleAvatar(backgroundImage: NetworkImage(match.photo!)),
            title: Text(match.title, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(match.price == null ? (match.city ?? 'Annonce WAOUH') : '${match.price} FCFA${match.city == null ? '' : ' · ${match.city}'}'),
          ),
        ),
        Expanded(
          child: StreamBuilder<List<LiveMessage>>(
            stream: _messageStream,
            builder: (_, snapshot) => LiveSmartTimeline(
              messages: _merge(snapshot.data ?? const <LiveMessage>[]),
              onPayload: _send,
              emptyMessage: match.seedText ?? 'Commencez la discussion sur ce produit.',
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            ),
          ),
        ),
        LiveAttachmentStrip(items: _attachments, onRemove: (item) => setState(() => _attachments.remove(item))),
        SafeArea(
          top: false,
          child: Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(6, 5, 8, 8),
            child: Row(children: [
              IconButton(tooltip: 'Prendre une photo', onPressed: () => _pick(ImageSource.camera), icon: const Icon(Icons.camera_alt_outlined)),
              IconButton(tooltip: 'Joindre une image', onPressed: () => _pick(ImageSource.gallery), icon: const Icon(Icons.attach_file_rounded)),
              Expanded(child: TextField(controller: _composer, focusNode: _focus, minLines: 1, maxLines: 4, textInputAction: TextInputAction.send, onSubmitted: (_) => _send(), decoration: const InputDecoration(hintText: 'Message sur ce produit...'))),
              IconButton(tooltip: 'Envoyer', onPressed: _send, icon: const Icon(Icons.send_rounded)),
            ]),
          ),
        ),
      ]),
    );
  }
}
