import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'live_controller.dart';

class LiveMuseMissionsHubScreen extends StatefulWidget {
  const LiveMuseMissionsHubScreen({super.key});

  @override
  State<LiveMuseMissionsHubScreen> createState() =>
      _LiveMuseMissionsHubScreenState();
}

class _LiveMuseMissionsHubScreenState extends State<LiveMuseMissionsHubScreen> {
  bool _initialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_initialized) return;
    _initialized = true;
    final userId = legacy.supabase.auth.currentUser?.id;
    if (userId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        context.read<LiveWaouhController>().agentic.initialize(userId);
      });
    }
  }

  Future<void> _openMuseWith(String prompt, String intent) async {
    final controller = context.read<LiveWaouhController>();
    await controller.startNewChat();
    controller.setComposerSeed(
      prompt,
      meta: <String, dynamic>{
        'source': 'waouh_hub',
        'intent': intent,
      },
    );
    if (mounted) context.go('/app/chat/waouh');
  }

  Future<void> _newMission() => _openMuseWith(
        'Je veux lancer une mission. Aide-moi à préciser le besoin, le budget et la zone, puis crée la mission.',
        'agentic_goal',
      );

  Future<void> _newWatch() => _openMuseWith(
        'Je veux créer une veille. Aide-moi à définir ce qu’il faut surveiller, le seuil et la fréquence.',
        'watch',
      );

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final agentic = controller.agentic;

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAF9),
      body: SafeArea(
        child: ListenableBuilder(
          listenable: agentic,
          builder: (_, __) => CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
                sliver: SliverToBoxAdapter(
                  child: _Hero(
                    missionCount: agentic.activeMissionCount,
                    watchCount: agentic.activeWatchCount,
                    approvalCount: agentic.pendingApprovalCount,
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      Expanded(
                        child: _PrimaryCard(
                          icon: Icons.psychology_alt_rounded,
                          title: 'WAOUH Muse',
                          subtitle: 'Acheter · vendre · NEXUS',
                          accent: const Color(0xFF08756A),
                          onTap: () => context.push('/app/muse'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _PrimaryCard(
                          icon: Icons.route_rounded,
                          title: 'Missions & veille',
                          subtitle: agentic.pendingApprovalCount > 0
                              ? '${agentic.pendingApprovalCount} validation(s)'
                              : '${agentic.activeMissionCount} mission(s) · ${agentic.activeWatchCount} veille(s)',
                          accent: const Color(0xFF2563EB),
                          badge: agentic.pendingApprovalCount,
                          onTap: () => context.push('/app/missions'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SliverPadding(
                padding: EdgeInsets.fromLTRB(16, 4, 16, 7),
                sliver: SliverToBoxAdapter(
                  child: Text(
                    'Actions rapides',
                    style: TextStyle(
                      color: Color(0xFF17372F),
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(14, 0, 14, 18),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 9,
                    mainAxisSpacing: 9,
                    childAspectRatio: 1.95,
                  ),
                  delegate: SliverChildListDelegate([
                    _QuickAction(
                      icon: Icons.search_rounded,
                      label: 'Acheter',
                      onTap: () => _openMuseWith(
                        'Je veux acheter. Aide-moi à préciser mon besoin puis trouve et compare les vendeurs avec NEXUS.',
                        'buy',
                      ),
                    ),
                    _QuickAction(
                      icon: Icons.sell_outlined,
                      label: 'Vendre',
                      onTap: () => _openMuseWith(
                        'Je veux vendre. Aide-moi à structurer mon offre puis trouve les acheteurs pertinents avec NEXUS.',
                        'sell',
                      ),
                    ),
                    _QuickAction(
                      icon: Icons.flag_outlined,
                      label: 'Nouvelle mission',
                      onTap: _newMission,
                    ),
                    _QuickAction(
                      icon: Icons.notifications_active_outlined,
                      label: 'Nouvelle veille',
                      onTap: _newWatch,
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.missionCount,
    required this.watchCount,
    required this.approvalCount,
  });

  final int missionCount;
  final int watchCount;
  final int approvalCount;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(17, 17, 17, 15),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF053F37), Color(0xFF08756A), Color(0xFF0B8A79)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(26),
          boxShadow: const [
            BoxShadow(
              color: Color(0x22064F46),
              blurRadius: 26,
              offset: Offset(0, 11),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                CircleAvatar(
                  radius: 22,
                  backgroundColor: Colors.white12,
                  child: Icon(Icons.auto_awesome_rounded, color: Colors.white),
                ),
                SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WAOUH intelligent',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -.2,
                        ),
                      ),
                      SizedBox(height: 1),
                      Text(
                        'Muse + Missions & veille',
                        style: TextStyle(
                          color: Color(0xFFD4F5EA),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 13),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: [
                _Metric(label: 'Missions', value: missionCount),
                _Metric(label: 'Veilles', value: watchCount),
                _Metric(
                  label: 'À valider',
                  value: approvalCount,
                  alert: approvalCount > 0,
                ),
              ],
            ),
          ],
        ),
      );
}

class _Metric extends StatelessWidget {
  const _Metric({
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
          color: alert ? const Color(0xFFFFE6AF) : Colors.white12,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
            color: alert ? const Color(0xFFFFC45A) : Colors.white24,
          ),
        ),
        child: Text(
          '$label $value',
          style: TextStyle(
            color: alert ? const Color(0xFF6F4500) : Colors.white,
            fontSize: 10.5,
            fontWeight: FontWeight.w900,
          ),
        ),
      );
}

class _PrimaryCard extends StatelessWidget {
  const _PrimaryCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accent,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color accent;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Ink(
            height: 132,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFDDE9E5)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0C163A31),
                  blurRadius: 18,
                  offset: Offset(0, 7),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: .11),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(icon, color: accent, size: 22),
                    ),
                    const Spacer(),
                    if (badge > 0)
                      Container(
                        constraints: const BoxConstraints(minWidth: 24),
                        height: 24,
                        padding: const EdgeInsets.symmetric(horizontal: 7),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFE7B5),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Text(
                          '$badge',
                          style: const TextStyle(
                            color: Color(0xFF794800),
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      )
                    else
                      const Icon(
                        Icons.arrow_forward_rounded,
                        size: 19,
                        color: Color(0xFF8B9B95),
                      ),
                  ],
                ),
                const Spacer(),
                Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF17372F),
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xFF71827C),
                    fontSize: 9.7,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Ink(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFDDE9E5)),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEAF7F3),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Icon(
                    icon,
                    color: const Color(0xFF08756A),
                    size: 18,
                  ),
                ),
                const SizedBox(width: 9),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Color(0xFF17372F),
                      fontSize: 11.5,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}
