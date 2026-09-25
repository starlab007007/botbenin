import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'agentic/live_agentic_models.dart';
import 'agentic/live_agentic_workspace.dart';
import 'live_controller.dart';
import 'live_widgets.dart';

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
      backgroundColor: const Color(0xFFF7FAF9),
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
        margin: const EdgeInsets.fromLTRB(12, 12, 12, 6),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF063F37), Color(0xFF08756A), Color(0xFF0B8A79)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x22064F46),
              blurRadius: 24,
              offset: Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                CircleAvatar(
                  radius: 21,
                  backgroundColor: Colors.white12,
                  child: Icon(Icons.route_rounded, color: Colors.white),
                ),
                SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WAOUH One · Missions & veille',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'WAOUH continue à chercher et surveiller pour vous.',
                        style: TextStyle(
                          color: Color(0xFFD6F5EC),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                _CountPill(label: 'Missions', value: missions),
                _CountPill(label: 'Veilles', value: watches),
                _CountPill(
                  label: 'Validations',
                  value: approvals,
                  alert: approvals > 0,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onMission,
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF075E54),
                    ),
                    icon: const Icon(Icons.flag_outlined, size: 18),
                    label: const Text('Nouvelle mission'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onWatch,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white38),
                    ),
                    icon: const Icon(Icons.notifications_active_outlined, size: 18),
                    label: const Text('Nouvelle veille'),
                  ),
                ),
              ],
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onMuse,
                style: TextButton.styleFrom(foregroundColor: const Color(0xFFD6F5EC)),
                icon: const Icon(Icons.psychology_alt_rounded, size: 17),
                label: const Text('Ouvrir Muse'),
              ),
            ),
          ],
        ),
      );
}

class _CountPill extends StatelessWidget {
  const _CountPill({
    required this.label,
    required this.value,
    this.alert = false,
  });

  final String label;
  final int value;
  final bool alert;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: alert ? const Color(0xFFFFE7B3) : Colors.white12,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: alert ? const Color(0xFFFFC75A) : Colors.white24),
        ),
        child: Text(
          '$label $value',
          style: TextStyle(
            color: alert ? const Color(0xFF704500) : Colors.white,
            fontSize: 10.5,
            fontWeight: FontWeight.w900,
          ),
        ),
      );
}
