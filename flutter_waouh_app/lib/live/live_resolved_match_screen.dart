import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import 'live_controller.dart';
import 'live_controller_extensions.dart';
import 'live_models.dart';
import 'live_widgets.dart';

class LiveResolvedMatchChatScreen extends StatefulWidget {
  const LiveResolvedMatchChatScreen({super.key, required this.matchKey, this.initial});
  final String matchKey;
  final LiveMatch? initial;

  @override
  State<LiveResolvedMatchChatScreen> createState() => _LiveResolvedMatchChatScreenState();
}

class _LiveResolvedMatchChatScreenState extends State<LiveResolvedMatchChatScreen> {
  final composer = TextEditingController();
  final attachments = <LiveAttachment>[];
  LiveMatch? match;
  bool sending = false;

  @override
  void initState() {
    super.initState();
    match = widget.initial;
    if (match == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        final value = await context.read<LiveWaouhController>().resolveMatch(widget.matchKey);
        if (mounted) setState(() => match = value);
      });
    }
  }

  @override
  void dispose() { composer.dispose(); super.dispose(); }

  Future<void> _send(LiveWaouhController controller, [String? payload]) async {
    final text = (payload ?? composer.text).trim();
    final files = List<LiveAttachment>.from(attachments);
    if (match == null || (text.isEmpty && files.isEmpty) || sending) return;
    setState(() { sending = true; composer.clear(); attachments.clear(); });
    try {
      await controller.sendMatch(match: match!, text: text, attachments: files);
    } catch (error) {
      composer.text = text;
      if (mounted) {
        setState(() => attachments.addAll(files));
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final active = match;
    if (active == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return Scaffold(
      appBar: LiveHeader(
        title: active.title,
        subtitle: '${active.role == 'seller' ? 'Acheteur interesse' : 'Discussion produit'}${active.city == null ? '' : ' · ${active.city}'}',
        back: true,
        actions: [IconButton(onPressed: () async { await controller.archiveMatch(active, true); if (mounted) Navigator.pop(context); }, icon: const Icon(Icons.archive_outlined))],
      ),
      body: Column(children: [
        Card(margin: const EdgeInsets.all(12), child: ListTile(
          leading: active.photo == null ? const CircleAvatar(child: Icon(Icons.inventory_2_outlined)) : CircleAvatar(backgroundImage: NetworkImage(active.photo!)),
          title: Text(active.title),
          subtitle: Text(active.price == null ? (active.city ?? 'Annonce WAOUH') : '${active.price} FCFA${active.city == null ? '' : ' · ${active.city}'}'),
        )),
        Expanded(child: StreamBuilder<List<LiveMessage>>(
          stream: controller.matchMessages(active),
          builder: (_, snapshot) {
            final messages = snapshot.data ?? const <LiveMessage>[];
            if (messages.isEmpty) return Center(child: Text(active.seedText ?? 'Commencez la discussion sur ce produit.'));
            return ListView.builder(padding: const EdgeInsets.all(16), itemCount: messages.length, itemBuilder: (_, index) => LiveMessageBubble(message: messages[index], onPayload: (payload) => _send(controller, payload)));
          },
        )),
        LiveAttachmentStrip(items: attachments, onRemove: (item) => setState(() => attachments.remove(item))),
        SafeArea(top: false, child: Row(children: [
          IconButton(onPressed: () async { final file = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 82); if (file != null) { final item = await controller.uploadChatImage(file); if (mounted) setState(() => attachments.add(item)); } }, icon: const Icon(Icons.attach_file_rounded)),
          Expanded(child: TextField(controller: composer, onSubmitted: (_) => _send(controller), decoration: const InputDecoration(hintText: 'Message sur ce produit...'))),
          IconButton(onPressed: sending ? null : () => _send(controller), icon: const Icon(Icons.send_rounded)),
        ])),
      ]),
    );
  }
}
