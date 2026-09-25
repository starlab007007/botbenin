import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'agentic/live_agentic_models.dart';
import 'agentic/live_agentic_workspace.dart';
import 'live_controller.dart';
import 'live_widgets.dart';
import 'live_theme.dart';

class LiveMissionsScreen extends StatefulWidget {
  const LiveMissionsScreen({super.key});

  @override
  State<LiveMissionsScreen> createState() => _LiveMissionsScreenState();
}

class _LiveMissionsScreenState extends State<LiveMissionsScreen> {
  bool initialized = false;

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
        title: 'Missions & veille',
        subtitle: 'Objectifs persistants · alertes · validations',
        back: true,
      ),
      body: auth.signedIn
          ? Column(
              children: [
                ListenableBuilder(
                  listenable: agentic,
                  builder: (_, __) => _MissionHero(
                    missions: agentic.activeMissionCount,
                    watches: agentic.activeWatchCount,
                    approvals: agentic.pendingApprovalCount,
                    onMission: _newMission,
                    onWatch: _newWatch,
                    onMuse: () => context.push('/app/muse'),
                  ),
                ),
                Expanded(
                  child: LiveAgenticWorkspace(
                    controller: agentic,
                    onResumeMission: _resumeMission,
                    standalone: true,
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
  });

  final int missions;
  final int watches;
  final int approvals;
  final VoidCallback onMission;
  final VoidCallback onWatch;
  final VoidCallback onMuse;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.fromLTRB(14, 14, 14, 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: WaouhGradients.missions,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: const Color(0xFFDDE8F4)),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    gradient: WaouhGradients.brand,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(
                    Icons.route_rounded,
                    color: Colors.white,
                    size: 23,
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Missions & veille',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'WAOUH continue pour vous.',
                        style: TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton.filledTonal(
                  tooltip: 'Muse',
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.white70,
                    foregroundColor: WaouhPalette.blue,
                  ),
                  onPressed: onMuse,
                  icon: const Icon(Icons.psychology_alt_rounded, size: 20),
                ),
              ],
            ),
            const SizedBox(height: 13),
            Row(
              children: [
                Expanded(
                  child: _MissionMetric(
                    label: 'Missions',
                    value: missions,
                    accent: WaouhPalette.blue,
                  ),
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: _MissionMetric(
                    label: 'Veilles',
                    value: watches,
                    accent: const Color(0xFF8B6CE8),
                  ),
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: _MissionMetric(
                    label: 'À valider',
                    value: approvals,
                    accent: approvals > 0
                        ? const Color(0xFFE18B26)
                        : const Color(0xFF7D8CA7),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 13),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onMission,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Mission'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onWatch,
                    icon:
                        const Icon(Icons.notifications_active_outlined, size: 18),
                    label: const Text('Veille'),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white70,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
}

class _MissionMetric extends StatelessWidget {
  const _MissionMetric({
    required this.label,
    required this.value,
    required this.accent,
  });

  final String label;
  final int value;
  final Color accent;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(10, 9, 8, 8),
        decoration: BoxDecoration(
          color: Colors.white70,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: const Color(0xFFE2EAF5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$value',
              style: TextStyle(
                color: accent,
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 1),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: WaouhPalette.muted,
                fontSize: 9,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
}

