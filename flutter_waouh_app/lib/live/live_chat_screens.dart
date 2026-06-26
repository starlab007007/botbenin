import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_models.dart';
import 'live_widgets.dart';

class LiveMainChatScreen extends StatefulWidget {
  const LiveMainChatScreen({super.key});

  @override
  State<LiveMainChatScreen> createState() => _LiveMainChatScreenState();
}

class _LiveMainChatScreenState extends State<LiveMainChatScreen> {
  final composer = TextEditingController();
  final attachments = <LiveAttachment>[];
  bool sending = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final seed = context.read<LiveWaouhController>().takeComposerSeed();
      if (seed != null) composer.text = seed;
    });
  }

  @override
  void dispose() {
    composer.dispose();
    super.dispose();
  }

  Future<void> _attach(ImageSource source) async {
    final file = await ImagePicker().pickImage(source: source, imageQuality: 82);
    if (file == null || !mounted) return;
    try {
      final item = await context.read<LiveWaouhController>().uploadChatImage(file);
      if (mounted) setState(() => attachments.add(item));
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  Future<void> _send([String? payload]) async {
    if (sending) return;
    final text = (payload ?? composer.text).trim();
    final files = List<LiveAttachment>.from(attachments);
    if (text.isEmpty && files.isEmpty) return;
    setState(() { sending = true; composer.clear(); attachments.clear(); });
    try {
      await context.read<LiveWaouhController>().sendMain(text: text, attachments: files);
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
    final auth = context.watch<legacy.AuthController>();
    return Scaffold(
      appBar: LiveHeader(
        title: 'WAOUH',
        subtitle: auth.profile?.fullName == null ? 'Achetez · Vendez · Negociez' : 'Bonjour ${auth.profile!.fullName!.split(' ').first}',
        back: true,
        actions: [
          IconButton(onPressed: () => context.go('/app/notifications'), icon: const Icon(Icons.notifications_none_rounded)),
          IconButton(onPressed: () async { await controller.startNewChat(); }, icon: const Icon(Icons.add_rounded)),
          IconButton(onPressed: () => context.go('/app/profile'), icon: const Icon(Icons.person_outline)),
        ],
      ),
      body: Column(children: [
        Expanded(child: StreamBuilder<List<LiveMessage>>(
          stream: controller.mainMessages(),
          builder: (_, snapshot) {
            final messages = snapshot.data ?? const <LiveMessage>[];
            if (messages.isEmpty) {
              return const Center(child: Padding(padding: EdgeInsets.all(28), child: Text('Bonjour !\nEcrivez « Je vends », « Je cherche » ou utilisez les boutons ci-dessous.', textAlign: TextAlign.center, style: TextStyle(fontSize: 17, color: legacy.WaouhColors.muted))));
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: messages.length,
              itemBuilder: (_, index) => LiveMessageBubble(message: messages[index], onPayload: (payload) => _send(payload)),
            );
          },
        )),
        Container(
          color: Colors.white,
          height: 58,
          child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9), children: [
            _quick('Vendre', Icons.shopping_bag_outlined, () => setState(() => composer.text = 'Je vends : ')),
            _quick('Acheter', Icons.search_rounded, () => setState(() => composer.text = 'Je cherche ')),
            _quick('Negocier', Icons.handshake_outlined, () => setState(() => composer.text = 'Je propose  FCFA pour ')),
          ]),
        ),
        LiveAttachmentStrip(items: attachments, onRemove: (item) => setState(() => attachments.remove(item))),
        SafeArea(top: false, child: Container(
          padding: const EdgeInsets.fromLTRB(8, 6, 8, 9),
          color: Colors.white,
          child: Row(children: [
            IconButton(onPressed: () => _attach(ImageSource.camera), icon: const Icon(Icons.camera_alt_outlined)),
            IconButton(onPressed: () => _attach(ImageSource.gallery), icon: const Icon(Icons.attach_file_rounded)),
            Expanded(child: TextField(controller: composer, minLines: 1, maxLines: 4, textInputAction: TextInputAction.send, onSubmitted: (_) => _send(), decoration: const InputDecoration(hintText: 'Votre message...'))),
            const SizedBox(width: 6),
            FilledButton(style: FilledButton.styleFrom(minimumSize: const Size(52, 52), padding: EdgeInsets.zero), onPressed: sending ? null : _send, child: sending ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.send_rounded)),
          ]),
        )),
      ]),
    );
  }

  Widget _quick(String label, IconData icon, VoidCallback callback) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: ActionChip(avatar: Icon(icon, size: 18), label: Text(label), onPressed: callback),
  );
}

class LiveMatchChatScreen extends StatefulWidget {
  const LiveMatchChatScreen({super.key, required this.matchKey});
  final String matchKey;

  @override
  State<LiveMatchChatScreen> createState() => _LiveMatchChatScreenState();
}

class _LiveMatchChatScreenState extends State<LiveMatchChatScreen> {
  final composer = TextEditingController();
  final attachments = <LiveAttachment>[];
  bool sending = false;
  LiveMatch? match;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    match ??= GoRouterState.of(context).extra as LiveMatch?;
  }

  @override
  void dispose() { composer.dispose(); super.dispose(); }

  Future<void> _send(LiveWaouhController controller, [String? payload]) async {
    final text = (payload ?? composer.text).trim();
    final files = List<LiveAttachment>.from(attachments);
    if (match == null || (text.isEmpty && files.isEmpty) || sending) return;
    setState(() { sending = true; composer.clear(); attachments.clear(); });
    try { await controller.sendMatch(match: match!, text: text, attachments: files); }
    catch (error) {
      composer.text = text;
      if (mounted) { setState(() => attachments.addAll(files)); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString()))); }
    } finally { if (mounted) setState(() => sending = false); }
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final active = match;
    if (active == null) return const Scaffold(body: Center(child: Text('Fenetre de match introuvable. Revenez a la liste des discussions.')));
    return Scaffold(
      appBar: LiveHeader(
        title: active.title,
        subtitle: '${active.role == 'seller' ? 'Acheteur interesse' : 'Discussion produit'}${active.city == null ? '' : ' · ${active.city}'}',
        back: true,
        actions: [IconButton(onPressed: () async { await controller.archiveMatch(active, true); if (context.mounted) context.go('/app/chat'); }, icon: const Icon(Icons.archive_outlined))],
      ),
      body: Column(children: [
        Card(margin: const EdgeInsets.all(12), child: ListTile(
          leading: active.photo == null ? const CircleAvatar(child: Icon(Icons.inventory_2_outlined)) : CircleAvatar(backgroundImage: NetworkImage(active.photo!)),
          title: Text(active.title),
          subtitle: Text(active.price == null ? (active.city ?? 'Annonce WAOUH') : '${active.price} FCFA${active.city == null ? '' : ' · ${active.city}'}'),
        )),
        Expanded(child: StreamBuilder<List<LiveMessage>>(
          stream: controller.chat.loadMainHistory(authUserId: controller.auth.user?.id).asStream(),
          builder: (_, snapshot) {
            final all = snapshot.data ?? const <LiveMessage>[];
            final messages = all.where((item) => item.articleId == active.articleId).toList();
            if (messages.isEmpty) return Center(child: Text(active.seedText ?? 'Commencez la discussion sur ce produit.'));
            return ListView.builder(padding: const EdgeInsets.all(16), itemCount: messages.length, itemBuilder: (_, i) => LiveMessageBubble(message: messages[i], onPayload: (payload) => _send(controller, payload)));
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

class LiveConversationScreen extends StatefulWidget {
  const LiveConversationScreen({super.key, required this.conversationId});
  final String conversationId;
  @override
  State<LiveConversationScreen> createState() => _LiveConversationScreenState();
}

class _LiveConversationScreenState extends State<LiveConversationScreen> {
  final composer = TextEditingController();
  bool sending = false;
  @override
  void dispose() { composer.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    return Scaffold(
      appBar: const LiveHeader(title: 'Discussion', subtitle: 'WAOUH', back: true),
      body: Column(children: [
        Expanded(child: StreamBuilder<List<LiveMessage>>(
          stream: controller.conversationMessages(widget.conversationId),
          builder: (_, snapshot) => ListView.builder(padding: const EdgeInsets.all(16), itemCount: (snapshot.data ?? const []).length, itemBuilder: (_, i) => LiveMessageBubble(message: snapshot.data![i])),
        )),
        SafeArea(top: false, child: Row(children: [
          Expanded(child: TextField(controller: composer, decoration: const InputDecoration(hintText: 'Votre reponse...'))),
          IconButton(onPressed: sending ? null : () async { final text = composer.text; if (text.trim().isEmpty) return; setState(() => sending = true); composer.clear(); try { await controller.sendConversation(widget.conversationId, text); } finally { if (mounted) setState(() => sending = false); } }, icon: const Icon(Icons.send_rounded)),
        ])),
      ]),
    );
  }
}
