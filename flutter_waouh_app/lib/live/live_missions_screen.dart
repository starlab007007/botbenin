import 'convergence/live_convergence_screen.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'agentic/live_agentic_models.dart';
import 'agentic/live_agentic_workspace.dart';
import 'avatar/bot_character.dart';
import 'live_contact_ledger.dart';
import 'live_controller.dart';
import 'live_nexus_find_panel.dart';
import 'live_widgets.dart';
import 'live_theme.dart';

class LiveMissionsScreen extends StatefulWidget {
  const LiveMissionsScreen({super.key});

  @override
  State<LiveMissionsScreen> createState() => _LiveMissionsScreenState();
}

class _LiveMissionsScreenState extends State<LiveMissionsScreen> {
  bool initialized = false;
  int _view = 0; // 0 = NEXUS (trouver), 1 = Suivi
  BotExpression _bot = BotExpression.idle;
  String _botLine = 'Dites-moi ce que vous cherchez.';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (initialized) return;
    initialized = true;
    final userId = legacy.supabase.auth.currentUser?.id;
    if (userId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        context.read<LiveWaouhController>().agentic.initialize(userId);
      });
    }
  }

  void _resumeMission(WaouhMission mission) {
    final controller = context.read<LiveWaouhController>();
    final prompt = controller.agentic.resumeMission(mission.id);
    if (prompt.isEmpty) return;
    controller.setComposerSeed(
      prompt,
      meta: <String, dynamic>{
        'mission_id': mission.id,
        'action': 'resume_mission',
        'intent': 'search',
        'schema': 'waouh.message.v1',
      },
    );
    context.go('/app/chat/waouh');
  }

  /// Règle produit : toute nouvelle demande ouvre un NOUVEAU chat.
  Future<void> _askInNewChat(String prompt) async {
    final controller = context.read<LiveWaouhController>();
    await controller.startNewChat();
    controller.setComposerSeed(
      prompt,
      meta: const <String, dynamic>{
        'source': 'missions_nexus',
        'intent': 'search',
        'schema': 'waouh.message.v1',
      },
    );
    if (mounted) context.go('/app/chat/waouh');
  }

  Future<void> _newMission() async {
    final controller = context.read<LiveWaouhController>();
    await controller.startNewChat();
    controller.setComposerSeed(
      'Je veux lancer une nouvelle mission. Aide-moi à préciser ce que je cherche, mon budget et ma zone, puis crée la mission.',
      meta: const <String, dynamic>{
        'source': 'missions_home',
        'intent': 'agentic_goal',
        'action': 'mission.create',
      },
    );
    if (mounted) context.go('/app/chat/waouh');
  }

  Future<void> _newWatch() async {
    final controller = context.read<LiveWaouhController>();
    await controller.startNewChat();
    controller.setComposerSeed(
      'Je veux créer une veille. Demande-moi le produit ou la recherche à surveiller, le prix cible et la fréquence.',
      meta: const <String, dynamic>{
        'source': 'missions_home',
        'intent': 'watch',
        'action': 'watch.create',
      },
    );
    if (mounted) context.go('/app/chat/waouh');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final waouh = context.watch<LiveWaouhController>();
    final agentic = waouh.agentic;

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: const LiveHeader(
        title: 'Missions',
        subtitle: 'Trouver · Vendre · Suivre',
        back: true,
      ),
      body: auth.signedIn
          ? Column(
              children: [
                Padding(padding: const EdgeInsets.fromLTRB(14,8,14,8),child:OutlinedButton.icon(onPressed:()=>openLiveConvergence(context),icon:const Icon(Icons.layers_outlined),label:const Text('Organiser mon besoin · produits, services, annonces'))),
                ListenableBuilder(
                  listenable: agentic,
                  builder: (_, __) => _MissionHero(
                    missions: agentic.activeMissionCount,
                    watches: agentic.activeWatchCount,
                    approvals: agentic.pendingApprovalCount,
                    onMission: _newMission,
                    onWatch: _newWatch,
                    onMuse: () => context.push('/app/avatar'),
                    bot: _view == 0 ? _bot : BotExpression.idle,
                    line: _view == 0
                        ? _botLine
                        : 'Je suis vos missions et veilles.',
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 0, 14, 8),
                  child: SizedBox(
                    width: double.infinity,
                    child: SegmentedButton<int>(
                      showSelectedIcon: false,
                      segments: const <ButtonSegment<int>>[
                        ButtonSegment<int>(value: 0, label: Text('NEXUS')),
                        ButtonSegment<int>(value: 1, label: Text('Suivi')),
                      ],
                      selected: <int>{_view},
                      onSelectionChanged: (value) =>
                          setState(() => _view = value.first),
                    ),
                  ),
                ),
                Expanded(
                  child: _view == 0
                      ? LiveNexusFindPanel(
                          onExpression: (value) {
                            if (mounted) setState(() => _bot = value);
                          },
                          onSpeak: (value) {
                            if (mounted) setState(() => _botLine = value);
                          },
                          onAsk: _askInNewChat,
                        )
                      : Column(
                          children: [
                            const LiveContactLedger(),
                            Expanded(
                              child: LiveAgenticWorkspace(
                                controller: agentic,
                                onResumeMission: _resumeMission,
                                standalone: true,
                              ),
                            ),
                          ],
                        ),
                ),
              ],
            )
          : Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: FilledButton.icon(
                  onPressed: () => context.go('/app/auth?next=/app/missions'),
                  icon: const Icon(Icons.login_rounded),
                  label: const Text('Se connecter pour activer les missions'),
                ),
              ),
            ),
    );
  }
}

class _MissionHero extends StatelessWidget {
  const _MissionHero({
    required this.missions,
    required this.watches,
    required this.approvals,
    required this.onMission,
    required this.onWatch,
    required this.onMuse,
    required this.bot,
    required this.line,
  });

  final int missions;
  final int watches;
  final int approvals;
  final VoidCallback onMission;
  final VoidCallback onWatch;
  final VoidCallback onMuse;
  final BotExpression bot;
  final String line;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.fromLTRB(14, 12, 14, 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: WaouhGradients.airHero,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: const Color(0xFFDCE7F8)),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    BotCharacter(expression: bot, size: 60),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(color: const Color(0xFFBBF0DA)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.circle, size: 6, color: Color(0xFF10B981)),
                          SizedBox(width: 4),
                          Text('En ligne',
                              style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF047857))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Missions',
                          style: TextStyle(
                              fontSize: 24, fontWeight: FontWeight.w900)),
                      const SizedBox(height: 2),
                      const Text('Trouver · Vendre · Suivre',
                          style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: WaouhPalette.muted)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(.92),
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(4),
                            topRight: Radius.circular(16),
                            bottomLeft: Radius.circular(16),
                            bottomRight: Radius.circular(16),
                          ),
                          border: Border.all(color: const Color(0xFFD9E6FF)),
                        ),
                        child: Text(line,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E3A8A))),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _HeroChip(
                      icon: Icons.add_rounded,
                      label: 'Mission',
                      onTap: onMission,
                      filled: true),
                  const SizedBox(width: 8),
                  _HeroChip(
                      icon: Icons.notifications_active_outlined,
                      label: approvals > 0 ? 'Veille · $approvals à valider' : 'Veille',
                      onTap: onWatch),
                  const SizedBox(width: 8),
                  _HeroChip(
                      icon: Icons.face_retouching_natural_rounded,
                      label: 'Avatar',
                      onTap: onMuse),
                  const SizedBox(width: 8),
                  _HeroChip(
                      icon: Icons.radar_rounded,
                      label: 'Radar',
                      onTap: () => context.push('/app/radar-map')),
                  const SizedBox(width: 8),
                  _HeroChip(
                      icon: Icons.chat_rounded,
                      label: 'Studio WhatsApp IA',
                      color: const Color(0xFF25D366),
                      filled: true,
                      onTap: () => context.push('/app/whatsapp')),
                ],
              ),
            ),
          ],
        ),
      );
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({
    required this.icon,
    required this.label,
    required this.onTap,
    this.filled = false,
    this.color,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool filled;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final base = color ?? WaouhPalette.blue;
    return Material(
      color: filled ? base : Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 40),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
                color: filled ? base : const Color(0xFFD9E6FF)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: filled ? Colors.white : base),
              const SizedBox(width: 6),
              Text(label,
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: filled ? Colors.white : const Color(0xFF1E3A8A))),
            ],
          ),
        ),
      ),
    );
  }
}
