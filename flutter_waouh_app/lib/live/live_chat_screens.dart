import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';
import 'live_models.dart';
import 'live_sell_sheet.dart';
import 'live_smart_timeline.dart';
import 'live_widgets.dart';

class LiveMainChatScreen extends StatefulWidget {
  const LiveMainChatScreen({super.key});
  @override
  State<LiveMainChatScreen> createState() => _LiveMainChatScreenState();
}

class _LiveMainChatScreenState extends State<LiveMainChatScreen> {
  final composer = TextEditingController();
  final composerFocus = FocusNode();
  final attachments = <LiveAttachment>[];
  final optimistic = <LiveMessage>[];
  Map<String, dynamic> pendingMeta = const {};
  late final Stream<List<LiveMessage>> _messageStream;

  @override
  void initState() {
    super.initState();
    _messageStream = context.read<LiveWaouhController>().mainMessages();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final controller = context.read<LiveWaouhController>();
      final seed = controller.takeComposerSeed();
      final meta = controller.takeComposerMeta();
      if (seed != null) composer.text = seed;
      if (meta.isNotEmpty && mounted) setState(() => pendingMeta = meta);
      if (meta['auto_send'] == true && seed != null && seed.trim().isNotEmpty) {
        await Future<void>.delayed(const Duration(milliseconds: 160));
        if (mounted && composer.text.trim().isNotEmpty) _send();
      }
    });
  }

  @override
  void dispose() {
    composer.dispose();
    composerFocus.dispose();
    super.dispose();
  }

  Future<void> _attach(ImageSource source) async {
    final file =
        await ImagePicker().pickImage(source: source, imageQuality: 82);
    if (file == null || !mounted) return;
    try {
      final item =
          await context.read<LiveWaouhController>().uploadChatImage(file);
      if (mounted) setState(() => attachments.add(item));
    } catch (error) {
      if (mounted) _notice(error.toString());
    }
  }

  Future<void> _openSellForm() => Navigator.of(context).push(MaterialPageRoute(
      fullscreenDialog: true, builder: (_) => const LiveSellSheet()));

  Future<void> _newChat() async {
    await context.read<LiveWaouhController>().startNewChat();
    if (!mounted) return;
    setState(() {
      composer.clear();
      attachments.clear();
      optimistic.clear();
      pendingMeta = const {};
    });
    composerFocus.requestFocus();
    _notice('Nouvelle conversation WAOUH commencée.', success: true);
  }

  Future<void> _handlePayload(String payload) async {
    final command = payload.trim().toLowerCase();
    if (command.startsWith('ouvrir-meet:')) {
      final threadId = payload.substring('ouvrir-meet:'.length).trim();
      if (threadId.isNotEmpty && mounted) {
        context.go(
          '/app/chat/match/${Uri.encodeComponent('meet_$threadId')}',
        );
      }
      return;
    }
    if (command == 'sell' ||
        command == 'vendre' ||
        command.contains('vendre') ||
        command.contains('sell')) {
      await _openSellForm();
      return;
    }
    if (command == 'buy' ||
        command == 'acheter' ||
        command.contains('cherche')) {
      composer.text =
          composer.text.trim().isEmpty ? 'Je cherche ' : composer.text;
      composerFocus.requestFocus();
      return;
    }
    if (command == 'negotiate' ||
        command == 'négocier' ||
        command == 'negocier' ||
        command == 'proposer' ||
        command.startsWith('proposer:') ||
        command == 'contre-proposition' ||
        command.startsWith('contre-proposition:') ||
        command.startsWith('counter:')) {
      final suggested = command.startsWith('proposer:')
          ? command.substring('proposer:'.length).replaceAll(RegExp(r'\D'), '')
          : '';
      composer.text =
          suggested.isEmpty ? 'Je propose  FCFA' : 'Je propose $suggested FCFA';
      composer.selection = TextSelection.collapsed(
        offset: suggested.isEmpty ? 'Je propose '.length : composer.text.length,
      );
      composerFocus.requestFocus();
      return;
    }
    _send(payload);
  }

  void _send([String? payload]) {
    final controller = context.read<LiveWaouhController>();
    final text = payload == null
        ? composer.text.trim()
        : liveCommercePayloadText(payload);
    final files = List<LiveAttachment>.from(attachments);
    final meta = Map<String, dynamic>.from(pendingMeta)..remove('auto_send');
    if (payload != null && payload.trim().isNotEmpty) {
      meta.addAll(liveCommercePayloadMeta(payload));
    }
    meta.putIfAbsent('idempotency_key', controller.newIdempotencyKey);
    if (text.isEmpty && files.isEmpty) return;
    final local = LiveMessage(
        id: 'client_${DateTime.now().microsecondsSinceEpoch}',
        text: text,
        createdAt: DateTime.now(),
        direction: 'in',
        attachments: files,
        meta: {
          ...meta,
          'delivery_state': controller.isOnline ? 'sending' : 'queued'
        });
    setState(() {
      optimistic.add(local);
      composer.clear();
      attachments.clear();
      pendingMeta = const {};
    });
    composerFocus.requestFocus();
    unawaited(_deliver(local, meta));
  }

  Future<void> _deliver(LiveMessage local, Map<String, dynamic> meta) async {
    try {
      final controller = context.read<LiveWaouhController>();
      await controller.sendMain(
          text: local.text, attachments: local.attachments, meta: meta);
      _replaceDelivery(local.id,
          controller.isOnline ? 'sent' : 'queued');
      final matchKey = controller.takePendingMeetKey();
      if (matchKey != null && mounted) {
        context.go('/app/chat/match/${Uri.encodeComponent(matchKey)}');
      }
    } catch (_) {
      _replaceDelivery(local.id, 'failed');
      if (mounted)
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: const Text('Message non envoyé.'),
            action: SnackBarAction(
                label: 'Réessayer', onPressed: () => _retry(local, meta))));
    }
  }

  void _retry(LiveMessage local, Map<String, dynamic> meta) {
    _replaceDelivery(local.id, 'sending');
    unawaited(_deliver(local, meta));
  }

  void _replaceDelivery(String id, String delivery) {
    if (!mounted) return;
    final index = optimistic.indexWhere((item) => item.id == id);
    if (index < 0) return;
    final item = optimistic[index];
    setState(() => optimistic[index] = LiveMessage(
        id: item.id,
        text: item.text,
        createdAt: item.createdAt,
        direction: item.direction,
        conversationId: item.conversationId,
        articleId: item.articleId,
        attachments: item.attachments,
        meta: {...item.meta, 'delivery_state': delivery}));
  }

  List<LiveMessage> _visibleMessages(List<LiveMessage> remote) {
    final localOnly = optimistic
        .where((local) => !remote.any((server) =>
            server.outgoing &&
            server.text.trim() == local.text.trim() &&
            server.attachments.length == local.attachments.length &&
            server.createdAt.difference(local.createdAt).inSeconds.abs() < 120))
        .toList();
    return [...remote, ...localOnly]
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  void _notice(String text, {bool success = false}) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          backgroundColor: success ? legacy.WaouhColors.green : null,
          content: Text(text)));

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final auth = context.watch<legacy.AuthController>();
    return Scaffold(
      appBar: LiveHeader(
        title: 'WAOUH',
        subtitle: auth.profile?.fullName == null
            ? 'Assistant de recherche et de vente'
            : 'Bonjour ${auth.profile!.fullName!.split(' ').first}',
        back: true,
        actions: [
          TextButton.icon(
              onPressed: _newChat,
              icon: const Icon(Icons.edit_outlined, size: 18),
              label: const Text('Nouveau'),
              style: TextButton.styleFrom(
                  foregroundColor: Colors.white,
                  textStyle: const TextStyle(fontWeight: FontWeight.w800))),
          IconButton(
              tooltip: 'Notifications',
              onPressed: () => context.go('/app/notifications'),
              icon: const Icon(Icons.notifications_none_rounded)),
        ],
      ),
      body: Column(children: [
        Expanded(
            child: StreamBuilder<List<LiveMessage>>(
                stream: _messageStream,
                builder: (_, snapshot) {
                  final messages =
                      _visibleMessages(snapshot.data ?? const <LiveMessage>[]);
                  final waiting = optimistic
                      .any((item) => item.meta['delivery_state'] == 'sending');
                  return LiveSmartTimeline(
                      messages: messages,
                      onPayload: _handlePayload,
                      showAssistantHint: waiting,
                      emptyMessage:
                          'Bonjour !\nUtilisez Vendre pour publier une annonce, ou écrivez « Je cherche ».');
                })),
        if (pendingMeta.isNotEmpty)
          Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: const Color(0xFFFFF7E6),
              child: Row(children: [
                const Icon(Icons.link_rounded,
                    size: 18, color: legacy.WaouhColors.orange),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(
                        pendingMeta['article_id'] == null
                            ? 'Réponse liée au statut.'
                            : 'Réponse liée à un produit WAOUH.',
                        style: const TextStyle(fontWeight: FontWeight.w700))),
                IconButton(
                    onPressed: () => setState(() => pendingMeta = const {}),
                    icon: const Icon(Icons.close, size: 18))
              ])),
        Container(
            color: Colors.white,
            height: 58,
            child: ListView(
                scrollDirection: Axis.horizontal,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                children: [
                  _quick('Vendre', Icons.shopping_bag_outlined, _openSellForm),
                  _quick('Acheter', Icons.search_rounded, () {
                    composer.text = 'Je cherche ';
                    composerFocus.requestFocus();
                  }),
                  _quick('Négocier', Icons.handshake_outlined, () {
                    composer.text = 'Je propose  FCFA pour ';
                    composerFocus.requestFocus();
                  }),
                  _quick('GPS', Icons.my_location, () async {
                    await controller.useDeviceLocation();
                    if (!mounted) return;
                    final position = controller.position;
                    _notice(position.available
                        ? 'Position ajoutée au prochain message.'
                        : (position.errorMessage ??
                            'Position GPS indisponible.'));
                  }),
                ])),
        LiveAttachmentStrip(
            items: attachments,
            onRemove: (item) => setState(() => attachments.remove(item))),
        SafeArea(
            top: false,
            child: Container(
                padding: const EdgeInsets.fromLTRB(8, 6, 8, 9),
                color: Colors.white,
                child: Row(children: [
                  IconButton(
                      tooltip: 'Prendre une photo',
                      onPressed: () => _attach(ImageSource.camera),
                      icon: const Icon(Icons.camera_alt_outlined)),
                  IconButton(
                      tooltip: 'Joindre une image',
                      onPressed: () => _attach(ImageSource.gallery),
                      icon: const Icon(Icons.attach_file_rounded)),
                  Expanded(
                      child: TextField(
                          controller: composer,
                          focusNode: composerFocus,
                          minLines: 1,
                          maxLines: 4,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(),
                          decoration: const InputDecoration(
                              hintText: 'Écrivez à WAOUH...'))),
                  const SizedBox(width: 6),
                  FilledButton(
                      style: FilledButton.styleFrom(
                          minimumSize: const Size(52, 52),
                          padding: EdgeInsets.zero),
                      onPressed: _send,
                      child: const Icon(Icons.send_rounded)),
                ]))),
      ]),
    );
  }

  Widget _quick(String label, IconData icon, VoidCallback callback) => Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ActionChip(
          avatar: Icon(icon, size: 18),
          label: Text(label),
          onPressed: callback));
}

class LiveConversationScreen extends StatefulWidget {
  const LiveConversationScreen({super.key, required this.conversationId});
  final String conversationId;
  @override
  State<LiveConversationScreen> createState() => _LiveConversationScreenState();
}

class _LiveConversationScreenState extends State<LiveConversationScreen> {
  final composer = TextEditingController();
  final focus = FocusNode();
  final optimistic = <LiveMessage>[];
  late final Stream<List<LiveMessage>> _messages;
  @override
  void initState() {
    super.initState();
    _messages = context
        .read<LiveWaouhController>()
        .conversationMessages(widget.conversationId);
  }

  @override
  void dispose() {
    composer.dispose();
    focus.dispose();
    super.dispose();
  }

  void _send() {
    final text = composer.text.trim();
    if (text.isEmpty) return;
    final local = LiveMessage(
        id: 'client_${DateTime.now().microsecondsSinceEpoch}',
        text: text,
        createdAt: DateTime.now(),
        direction: 'in',
        conversationId: widget.conversationId,
        meta: const {'delivery_state': 'sending'});
    setState(() {
      optimistic.add(local);
      composer.clear();
    });
    focus.requestFocus();
    unawaited(_deliver(local));
  }

  void _handlePayload(String payload) {
    final command = payload.trim().toLowerCase();
    if (command == 'proposer' ||
        command.startsWith('proposer:') ||
        command.startsWith('contre-proposition') ||
        command.startsWith('counter')) {
      composer.text = 'Je propose  FCFA';
      composer.selection = const TextSelection.collapsed(
        offset: 'Je propose '.length,
      );
      focus.requestFocus();
      return;
    }
    composer.text = payload;
    _send();
  }

  Future<void> _deliver(LiveMessage local) async {
    try {
      await context
          .read<LiveWaouhController>()
          .sendConversation(widget.conversationId, local.text);
      _setDelivery(local.id, 'sent');
    } catch (_) {
      _setDelivery(local.id, 'failed');
    }
  }

  void _setDelivery(String id, String value) {
    if (!mounted) return;
    final index = optimistic.indexWhere((item) => item.id == id);
    if (index < 0) return;
    final item = optimistic[index];
    setState(() => optimistic[index] = LiveMessage(
        id: item.id,
        text: item.text,
        createdAt: item.createdAt,
        direction: item.direction,
        conversationId: item.conversationId,
        attachments: item.attachments,
        meta: {...item.meta, 'delivery_state': value}));
  }

  List<LiveMessage> _merge(List<LiveMessage> remote) {
    final extra = optimistic.where((local) => !remote.any((item) =>
        item.outgoing &&
        item.text.trim() == local.text.trim() &&
        item.createdAt.difference(local.createdAt).inSeconds.abs() < 120));
    return [...remote, ...extra]
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: const LiveHeader(
          title: 'Discussion', subtitle: 'Conversation produit', back: true),
      body: Column(children: [
        Expanded(
            child: StreamBuilder<List<LiveMessage>>(
                stream: _messages,
                builder: (_, snapshot) => LiveSmartTimeline(
                    messages: _merge(snapshot.data ?? const <LiveMessage>[]),
                    onPayload: _handlePayload,
                    showAssistantHint: optimistic.any(
                        (item) => item.meta['delivery_state'] == 'sending'),
                    emptyMessage: 'Commencez la discussion.'))),
        SafeArea(
            top: false,
            child: Row(children: [
              Expanded(
                  child: TextField(
                      controller: composer,
                      focusNode: focus,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration:
                          const InputDecoration(hintText: 'Votre réponse...'))),
              IconButton(
                  tooltip: 'Envoyer',
                  onPressed: _send,
                  icon: const Icon(Icons.send_rounded))
            ])),
      ]));
}
