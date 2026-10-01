import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'avatar/live_avatar_controller.dart';
import 'agentic/live_agentic_models.dart';
import 'agentic/live_agentic_workspace.dart';
import 'live_avatar_guide.dart';
import 'live_commerce_action_client.dart';
import 'live_controller.dart';
import 'live_commerce_agent_ui.dart';
import 'live_guest_action_gate.dart';
import 'live_match_navigation.dart';
import 'live_models.dart';
import 'live_sell_sheet.dart';
import 'live_smart_timeline.dart';
import 'live_thread_flow.dart';
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
  late final LiveWaouhController _controller;
  bool _interestInFlight = false;
  bool _interestNavigationFailed = false;
  final _avatarBarKey = GlobalKey<LiveAvatarGuideBarState>();
  // L'avatar « écrit » : ses bulles en direct apparaissent l'une après l'autre (historique : d'un coup).
  final _avatarReveal = LiveAvatarReveal();
  Timer? _revealTimer;
  DateTime? _revealScheduledFor;
  late final LiveAvatarGuideService _avatarService = LiveAvatarGuideService((body) async {
    final response = await legacy.supabase.functions.invoke('waouh-avatar-briefing', body: body);
    final data = response.data;
    return data is Map ? Map<String, dynamic>.from(data) : null;
  });

  @override
  void initState() {
    super.initState();
    _controller = context.read<LiveWaouhController>();
    _messageStream = _controller.mainMessages();
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
    _revealTimer?.cancel();
    composer.dispose();
    composerFocus.dispose();
    super.dispose();
  }

  Future<void> _attach(ImageSource source) async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/chat/waouh',
      actionLabel: 'joindre une photo',
    )) {
      return;
    }
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

  Future<void> _openSellForm() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/chat/waouh',
      actionLabel: 'publier une vente',
    )) {
      return;
    }
    if (!mounted) return;
    await Navigator.of(context).push(MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => const LiveSellSheet(),
    ));
  }

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

  /// Boutons de l'avatar guide : point, réglages, aide, ouverture d'une Deal Room, suivi des offres.
  /// Rien n'est envoyé à un tiers sans ce tap (les actions passent par waouh-commerce-action).
  Future<bool> _handleAvatarPayload(String payload) async {
    final command = payload.trim().toLowerCase();
    if (command == 'avatar:point') {
      await _avatarBarKey.currentState?.runPoint('now');
      return true;
    }
    if (command == 'avatar:reglages') {
      await _avatarBarKey.currentState?.openSettings();
      return true;
    }
    if (command == 'aide:acheter') {
      composer.text = composer.text.trim().isEmpty ? 'Je cherche ' : composer.text;
      composerFocus.requestFocus();
      return true;
    }
    if (command == 'aide:vendre') {
      await _openSellForm();
      return true;
    }
    if (command.startsWith('ouvrir-deal:')) {
      final rest = payload.trim().substring('ouvrir-deal:'.length);
      final query = rest.indexOf('?');
      final threadId = (query < 0 ? rest : rest.substring(0, query)).trim();
      final role = rest.contains('role=seller') ? 'seller' : 'buyer';
      if (threadId.isNotEmpty && mounted) {
        unawaited(livePushMatchChat(
          context,
          LiveMatch(
            key: 'meet_$threadId',
            articleId: '',
            role: role,
            title: 'Discussion produit',
            lastAt: DateTime.now(),
            threadId: threadId,
          ),
        ));
      }
      return true;
    }
    if (command.startsWith('relancer:') || command.startsWith('envoyer-offre:') || command.startsWith('veille:')) {
      final request = liveCommerceRequestFromPayload(payload);
      if (request == null) return true;
      try {
        final response = await _controller.sendCommerceAction(request);
        if (!mounted) return true;
        final reply = response?['reply'];
        _notice(reply is Map
            ? '${reply['title'] ?? ''} · ${reply['detail'] ?? ''}'
            : 'Action indisponible pour le moment. Réessayez.');
      } catch (_) {
        if (mounted) _notice('Rien n\'a été envoyé. Réessayez.');
      }
      return true;
    }
    return false;
  }

  Future<void> _handlePayload(String payload) async {
    if (await _handleAvatarPayload(payload)) return;
    final command = payload.trim().toLowerCase();
    if (command.startsWith('waouh:watch')) {
      await showWaouhWatchDialog(
        context,
        controller: _controller.agentic,
        payload: payload,
      );
      if (mounted) _notice('Veille prix/stock activée.', success: true);
      return;
    }
    if (command.startsWith('ouvrir-meet:')) {
      final threadId = payload.substring('ouvrir-meet:'.length).trim();
      if (threadId.isNotEmpty && mounted) {
        final match = LiveMatch(
          key: 'meet_$threadId',
          articleId: '',
          role: 'buyer',
          title: 'Discussion produit',
          lastAt: DateTime.now(),
          threadId: threadId,
        );
        unawaited(livePushMatchChat(context, match));
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
    await _send(payload);
  }

  Future<void> _send([String? payload]) async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/chat/waouh',
      actionLabel: 'envoyer un message ou lancer une recherche',
    )) {
      return;
    }
    if (!mounted) return;

    final controller = _controller;
    final text = payload == null
        ? composer.text.trim()
        : liveCommercePayloadText(payload);
    final files = List<LiveAttachment>.from(attachments);
    var meta = Map<String, dynamic>.from(pendingMeta)..remove('auto_send');

    final searchRequest = meta['intent'] == 'buy' ||
        meta['action'] == 'buy' ||
        RegExp(
          r'\b(cherche|recherche|acheter|achète)\b',
          caseSensitive: false,
        ).hasMatch(text);
    if (searchRequest) {
      meta.putIfAbsent('result_limit', () => 10);
      meta.putIfAbsent('max_results', () => 10);
    }

    if (payload != null && payload.trim().isNotEmpty) {
      meta.addAll(liveCommercePayloadMeta(payload));
    }

    meta.putIfAbsent('idempotency_key', controller.newIdempotencyKey);
    meta = liveCanonicalInterestedMeta(
      text: text,
      meta: meta,
      authUserId: controller.auth.user?.id,
    );
    final interested = liveIsInterestedMeta(meta, text: text);
    if (interested && _interestInFlight) {
      _notice('Ouverture de la discussion déjà en cours.');
      return;
    }

    if (text.isEmpty && files.isEmpty) return;

    if (interested) _interestInFlight = true;
    final prepared = interested
        ? controller.prepareInterestedMeet(text: text, meta: meta)
        : null;

    final local = LiveMessage(
      id: 'client_${DateTime.now().microsecondsSinceEpoch}',
      text: text,
      createdAt: DateTime.now(),
      direction: 'in',
      attachments: files,
      meta: {
        ...meta,
        'delivery_state': controller.isOnline ? 'sending' : 'queued',
      },
    );

    setState(() {
      optimistic.add(local);
      composer.clear();
      attachments.clear();
      pendingMeta = const {};
    });

    // La navigation doit partir avant toute attente réseau. `_deliver` n'est
    // créé qu'après le push afin qu'aucun upload, sessionId ou appel Supabase
    // synchrone ne puisse retarder le premier frame de la nouvelle page.
    if (prepared != null && mounted) {
      unawaited(_openInterestedMatch(prepared));
    } else {
      composerFocus.requestFocus();
    }
    unawaited(_deliver(local, meta));
  }

  Future<void> _openInterestedMatch(LiveMatch match) async {
    _interestNavigationFailed = false;
    try {
      await livePushMatchChat<void>(context, match);
    } catch (error) {
      _interestNavigationFailed = true;
      if (!mounted) return;
      _notice(
        'Impossible d’ouvrir la discussion produit. Réessayez depuis la carte.',
      );
    }
  }

  Future<void> _deliver(
    LiveMessage local,
    Map<String, dynamic> meta,
  ) async {
    final interested = liveIsInterestedMeta(meta, text: local.text);
    try {
      await _controller.sendMain(
        text: local.text,
        attachments: local.attachments,
        meta: meta,
      );
      _replaceDelivery(
        local.id,
        _controller.isOnline ? 'sent' : 'queued',
      );

      // Filet de sécurité aligné sur le Web : si un ancien payload local n'a
      // pas été reconnu, le backend peut quand même renvoyer un intent/article
      // structuré. Le contrôleur publie alors le Match autoritaire ou provisoire
      // correspondant et cette page l'ouvre après la réponse.
      final responseMeet = _controller.takePendingMeet();
      if (responseMeet != null &&
          mounted &&
          (!interested || _interestNavigationFailed)) {
        unawaited(_openInterestedMatch(responseMeet));
      }
    } catch (error) {
      _replaceDelivery(local.id, 'failed');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              interested
                  ? 'Intérêt non finalisé : ${error.toString()}'
                  : 'Message non envoyé.',
            ),
            action: SnackBarAction(
              label: 'Réessayer',
              onPressed: () => _retry(local, meta),
            ),
          ),
        );
      }
    } finally {
      if (interested) _interestInFlight = false;
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

  void _scheduleReveal(DateTime? nextAt) {
    if (nextAt == null || nextAt == _revealScheduledFor) return;
    _revealTimer?.cancel();
    _revealScheduledFor = nextAt;
    final wait = nextAt.difference(DateTime.now());
    _revealTimer = Timer(wait.isNegative ? const Duration(milliseconds: 30) : wait + const Duration(milliseconds: 10), () {
      _revealScheduledFor = null;
      if (mounted) setState(() {});
    });
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

  void _resumeMission(WaouhMission mission) {
    final prompt = _controller.agentic.resumeMission(mission.id);
    if (prompt.isEmpty) return;
    setState(() {
      composer.text = prompt;
      pendingMeta = <String, dynamic>{
        'mission_id': mission.id,
        'action': 'resume_mission',
        'intent': 'search',
        'schema': 'waouh.message.v1',
      };
    });
    composerFocus.requestFocus();
    unawaited(_send());
  }

  Future<void> _openAgenticWorkspace() => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.white,
        builder: (_) => FractionallySizedBox(
          heightFactor: .92,
          child: LiveAgenticWorkspace(
            controller: _controller.agentic,
            onResumeMission: _resumeMission,
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final avatar = context.watch<LiveAvatarController>();
    return Scaffold(
      backgroundColor: const Color(0xFFF6F9FF),
      appBar: LiveHeader(
        title: 'WAOUH One',
        subtitle: '${avatar.name} · Avatar IA · NEXUS + Signal + Contact',
        back: true,
        actions: [
          IconButton(
              tooltip: 'Mon Avatar',
              onPressed: () => context.push('/app/avatar'),
              icon: const Icon(Icons.face_retouching_natural_rounded)),
          IconButton(
              tooltip: 'Nouvel objectif',
              onPressed: _newChat,
              icon: const Icon(Icons.add_comment_outlined)),
          IconButton(
              tooltip: 'Notifications',
              onPressed: () => context.go('/app/notifications'),
              icon: const Icon(Icons.notifications_none_rounded)),
        ],
      ),
      body: Column(children: [
        if (context.watch<legacy.AuthController>().signedIn)
          LiveAvatarGuideBar(
            key: _avatarBarKey,
            service: _avatarService,
            sessionId: () async => await _controller.session.sessionId,
          ),
        Expanded(
            child: StreamBuilder<List<LiveMessage>>(
                stream: _messageStream,
                builder: (_, snapshot) {
                  final revealed = _avatarReveal.filter(
                      _visibleMessages(snapshot.data ?? const <LiveMessage>[]),
                      DateTime.now());
                  final messages = revealed.visible;
                  _scheduleReveal(revealed.nextAt);
                  final waiting = optimistic
                      .any((item) => item.meta['delivery_state'] == 'sending');
                  final hasGoal = messages.any(
                    (item) => item.outgoing && item.text.trim().isNotEmpty,
                  );

                  void seedGoal(String value) {
                    composer.text = value;
                    composer.selection = TextSelection.collapsed(
                      offset: composer.text.length,
                    );
                    composerFocus.requestFocus();
                  }

                  void openIntelligence() => showLiveUnifiedIntelligenceSheet(
                        context,
                        messages: messages,
                        busy: waiting,
                        missionCount: controller.agentic.activeMissionCount,
                        watchCount: controller.agentic.activeWatchCount,
                        approvalCount: controller.agentic.pendingApprovalCount,
                        onNewGoal: () {
                          unawaited(_newChat());
                        },
                        onOpenAgentic: () {
                          unawaited(_openAgenticWorkspace());
                        },
                      );

                  return Column(children: [
                    if (!hasGoal)
                      _LiveObjectiveLauncher(
                        avatarName: avatar.name,
                        onBuy: () => seedGoal('Je veux acheter '),
                        onSell: _openSellForm,
                        onSearch: () => seedGoal('Je cherche '),
                        onCompare: () =>
                            seedGoal('Compare les meilleures options pour '),
                        onNegotiate: () =>
                            seedGoal('Je souhaite négocier '),
                        onAvatar: () => context.push('/app/avatar'),
                      )
                    else ...[
                      LiveCommerceAgentBar(
                        messages: messages,
                        busy: waiting,
                        compact: true,
                        onTap: openIntelligence,
                      ),
                      LiveSmartComposerBar(
                        messages: messages,
                        busy: waiting,
                        onPrompt: seedGoal,
                        onSell: _openSellForm,
                        onMuse: openIntelligence,
                        onLocation: () async {
                          await controller.useDeviceLocation();
                          if (!mounted) return;
                          final position = controller.position;
                          _notice(position.available
                              ? 'Position ajoutée au prochain message.'
                              : (position.errorMessage ??
                                  'Position GPS indisponible.'));
                        },
                      ),
                    ],
                    Expanded(
                      child: LiveSmartTimeline(
                        messages: messages,
                        onPayload: _handlePayload,
                        showAssistantHint: waiting,
                        emptyMessage:
                            'Choisissez un objectif ou dites simplement ce que vous voulez.',
                      ),
                    ),
                    if (revealed.nextAt != null) const LiveAvatarTypingRow(),
                  ]);
                })),
        if (pendingMeta.isNotEmpty)
          Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: const Color(0xFFFFF8EE),
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
        LiveAttachmentStrip(
            items: attachments,
            onRemove: (item) => setState(() => attachments.remove(item))),
        SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(8, 0, 8, 8),
          child: Container(
            padding: const EdgeInsets.fromLTRB(7, 7, 7, 7),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE2EAF6)),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF456795).withValues(alpha: .10),
                  blurRadius: 26,
                  offset: const Offset(0, 10),
                  spreadRadius: -8,
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                PopupMenuButton<ImageSource>(
                  tooltip: 'Ajouter',
                  icon: const Icon(
                    Icons.add_circle_rounded,
                    color: Color(0xFF4F7FFF),
                  ),
                  onSelected: _attach,
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
                    controller: composer,
                    focusNode: composerFocus,
                    minLines: 1,
                    maxLines: 4,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                    decoration: const InputDecoration(
                      hintText: 'Écrire à WAOUH…',
                      filled: false,
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 5),
                FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(44, 44),
                    maximumSize: const Size(44, 44),
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                  onPressed: _send,
                  child: const Icon(Icons.arrow_upward_rounded, size: 20),
                ),
              ],
            ),
          ),
        ),
      ]),
    );
  }


}

class _LiveObjectiveLauncher extends StatelessWidget {
  const _LiveObjectiveLauncher({
    required this.avatarName,
    required this.onBuy,
    required this.onSell,
    required this.onSearch,
    required this.onCompare,
    required this.onNegotiate,
    required this.onAvatar,
  });

  final String avatarName;
  final VoidCallback onBuy;
  final VoidCallback onSell;
  final VoidCallback onSearch;
  final VoidCallback onCompare;
  final VoidCallback onNegotiate;
  final VoidCallback onAvatar;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.fromLTRB(10, 8, 10, 4),
        padding: const EdgeInsets.fromLTRB(14, 13, 14, 12),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [
              Color(0xFFFFFFFF),
              Color(0xFFF0F8FF),
              Color(0xFFF1FFF9),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFDDE8F5)),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF496B9C).withValues(alpha: .08),
              blurRadius: 22,
              offset: const Offset(0, 9),
              spreadRadius: -8,
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const LiveMuseAvatar(size: 56),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Quel est votre objectif ?',
                        style: TextStyle(
                          color: Color(0xFF132B25),
                          fontSize: 17,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -.2,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '$avatarName vous accompagne de la demande jusqu’au deal.',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF667A73),
                          fontSize: 11,
                          height: 1.25,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Mon Avatar',
                  onPressed: onAvatar,
                  icon: const Icon(
                    Icons.face_retouching_natural_rounded,
                    color: Color(0xFF4F7FFF),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 11),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                _ObjectiveChip(
                  label: 'Acheter',
                  icon: Icons.shopping_cart_outlined,
                  onTap: onBuy,
                ),
                _ObjectiveChip(
                  label: 'Vendre',
                  icon: Icons.sell_outlined,
                  onTap: onSell,
                ),
                _ObjectiveChip(
                  label: 'Chercher',
                  icon: Icons.travel_explore_rounded,
                  onTap: onSearch,
                ),
                _ObjectiveChip(
                  label: 'Comparer',
                  icon: Icons.compare_arrows_rounded,
                  onTap: onCompare,
                ),
                _ObjectiveChip(
                  label: 'Négocier',
                  icon: Icons.handshake_outlined,
                  onTap: onNegotiate,
                ),
              ],
            ),
            const SizedBox(height: 10),
            const Row(
              children: [
                _JourneyPill(label: 'Objectif', icon: Icons.flag_outlined),
                _JourneyArrow(),
                _JourneyPill(label: 'NEXUS', icon: Icons.hub_outlined),
                _JourneyArrow(),
                _JourneyPill(
                  label: 'Signal',
                  icon: Icons.auto_graph_rounded,
                ),
                _JourneyArrow(),
                _JourneyPill(label: 'Deal', icon: Icons.handshake_outlined),
              ],
            ),
          ],
        ),
      );
}

class _ObjectiveChip extends StatelessWidget {
  const _ObjectiveChip({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ActionChip(
        avatar: Icon(icon, size: 16, color: const Color(0xFF3F6FE5)),
        label: Text(label),
        onPressed: onTap,
        backgroundColor: Colors.white.withValues(alpha: .92),
        side: const BorderSide(color: Color(0xFFDDE6F5)),
        labelStyle: const TextStyle(
          color: Color(0xFF263A35),
          fontSize: 10.8,
          fontWeight: FontWeight.w800,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
      );
}

class _JourneyPill extends StatelessWidget {
  const _JourneyPill({required this.label, required this.icon});
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          height: 30,
          padding: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .78),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFFE3EAF5)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 12, color: const Color(0xFF5A729C)),
              const SizedBox(width: 3),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF5A729C),
                    fontSize: 8.8,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

class _JourneyArrow extends StatelessWidget {
  const _JourneyArrow();

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 2),
        child: Icon(
          Icons.chevron_right_rounded,
          size: 14,
          color: Color(0xFFA8B5C8),
        ),
      );
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

  Future<void> _send() async {
    if (!await requireLiveAuthentication(
      context,
      next: '/app/chat/${widget.conversationId}',
      actionLabel: 'envoyer ce message',
    )) {
      return;
    }
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
    unawaited(_send());
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
          title: 'WAOUH One',
          subtitle: 'Conversation directe · Contact protégé',
          back: true),
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
            child: Container(
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE1E9E6))),
              ),
              padding: const EdgeInsets.fromLTRB(8, 7, 8, 9),
              child: Row(children: [
                Expanded(
                    child: TextField(
                        controller: composer,
                        focusNode: focus,
                        minLines: 1,
                        maxLines: 4,
                        textInputAction: TextInputAction.send,
                        onSubmitted: (_) => _send(),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: const Color(0xFFF5F8F7),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(20),
                            borderSide: BorderSide.none,
                          ),
                          hintText: 'Votre réponse…',
                        ))),
                const SizedBox(width: 6),
                FilledButton(
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      padding: EdgeInsets.zero,
                      backgroundColor: const Color(0xFF08745D),
                    ),
                    onPressed: _send,
                    child: const Icon(Icons.send_rounded))
              ]),
            )),
      ]));
}
