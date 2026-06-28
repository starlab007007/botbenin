import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';
import 'live_controller_extensions.dart';
import 'live_controller_match_actions.dart';
import 'live_models.dart';
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
  final _attachments = <LiveAttachment>[];
  LiveMatch? _match;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _match = widget.initial;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final controller = context.read<LiveWaouhController>();
      final found = _match ?? await controller.resolveMatch(widget.matchKey);
      if (found != null) await controller.markMatchRead(found);
      if (mounted) setState(() => _match = found);
    });
  }

  @override
  void dispose() {
    _composer.dispose();
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

  Future<void> _send([String? payload]) async {
    final controller = context.read<LiveWaouhController>();
    final match = _match;
    final text = (payload ?? _composer.text).trim();
    final media = List<LiveAttachment>.from(_attachments);
    if (_sending || match == null || (text.isEmpty && media.isEmpty)) return;
    setState(() { _sending = true; _composer.clear(); _attachments.clear(); });
    try {
      await controller.sendMatch(match: match, text: text, attachments: media);
    } catch (error) {
      _composer.text = text;
      if (mounted) {
        setState(() => _attachments.addAll(media));
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
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
            leading: match.photo == null
                ? const CircleAvatar(child: Icon(Icons.inventory_2_outlined))
                : CircleAvatar(backgroundImage: NetworkImage(match.photo!)),
            title: Text(match.title, maxLines: 1, overflow: TextOverflow.ellipsis),
            subtitle: Text(match.price == null ? (match.city ?? 'Annonce WAOUH') : '${match.price} FCFA${match.city == null ? '' : ' · ${match.city}'}'),
          ),
        ),
        Expanded(
          child: StreamBuilder<List<LiveMessage>>(
            stream: controller.matchMessages(match),
            builder: (_, snapshot) {
              final messages = snapshot.data ?? const <LiveMessage>[];
              if (messages.isEmpty) return Center(child: Text(match.seedText ?? 'Commencez la discussion sur ce produit.'));
              return ListView.builder(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                itemCount: messages.length,
                itemBuilder: (_, index) => LiveMessageBubble(message: messages[index], onPayload: _send),
              );
            },
          ),
        ),
        LiveAttachmentStrip(items: _attachments, onRemove: (item) => setState(() => _attachments.remove(item))),
        SafeArea(
          top: false,
          child: Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(6, 5, 8, 8),
            child: Row(children: [
              IconButton(onPressed: () => _pick(ImageSource.camera), icon: const Icon(Icons.camera_alt_outlined)),
              IconButton(onPressed: () => _pick(ImageSource.gallery), icon: const Icon(Icons.attach_file_rounded)),
              Expanded(child: TextField(controller: _composer, minLines: 1, maxLines: 4, onSubmitted: (_) => _send(), decoration: const InputDecoration(hintText: 'Votre message...'))),
              IconButton(onPressed: _sending ? null : _send, icon: _sending ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send_rounded)),
            ]),
          ),
        ),
      ]),
    );
  }
}
