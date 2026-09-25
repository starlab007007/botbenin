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

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final agentic = controller.agentic;
    final width = MediaQuery.sizeOf(context).width;
    final wide = width >= 640;

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAF9),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
              sliver: SliverToBoxAdapter(
                child: _Hero(
                  missions: agentic.activeMissionCount,
                  watches: agentic.activeWatchCount,
                  approvals: agentic.pendingApprovalCount,
                  onMuse: () => context.push('/app/muse'),
                  onMissions: () => context.push('/app/missions'),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              sliver: SliverToBoxAdapter(
                child: wide
                    ? Row(
                        children: [
                          Expanded(
                            child: _PrimaryCard(
                              icon: Icons.psychology_alt_rounded,
                              title: 'WAOUH Muse',
                              subtitle: 'Acheter · vendre · trouver',
                              badge: 'NEXUS',
                              accent: const Color(0xFF08756A),
                              onTap: () => context.push('/app/muse'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _PrimaryCard(
                              icon: Icons.route_rounded,
                              title: 'Missions & veille',
                              subtitle: 'Lancer · suivre · valider',
                              badge: agentic.pendingApprovalCount > 0
                                  ? '${agentic.pendingApprovalCount} à valider'
                                  : 'ACTIF',
                              accent: const Color(0xFF2457C5),
                              onTap: () => context.push('/app/missions'),
                            ),
                          ),
                        ],
                      )
                    : Column(
                        children: [
                          _PrimaryCard(
                            icon: Icons.psychology_alt_rounded,
                            title: 'WAOUH Muse',
                            subtitle: 'Acheter · vendre · trouver',
                            badge: 'NEXUS',
                            accent: const Color(0xFF08756A),
                            onTap: () => context.push('/app/muse'),
                          ),
                          const SizedBox(height: 10),
                          _PrimaryCard(
                            icon: Icons.route_rounded,
                            title: 'Missions & veille',
                            subtitle: 'Lancer · suivre · valider',
                            badge: agentic.pendingApprovalCount > 0
                                ? '${agentic.pendingApprovalCount} à valider'
                                : 'ACTIF',
                            accent: const Color(0xFF2457C5),
                            onTap: () => context.push('/app/missions'),
                          ),
                        ],
                      ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(14, 2, 14, 8),
              sliver: SliverToBoxAdapter(
                child: Text(
                  'Accès rapide',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: const Color(0xFF183B32),
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 24),
              sliver: SliverGrid(
                delegate: SliverChildListDelegate.fixed([
                  _QuickAction(
                    icon: Icons.shopping_bag_outlined,
                    label: 'Acheter',
                    accent: const Color(0xFF08756A),
                    onTap: () => context.push('/app/muse'),
                  ),
                  _QuickAction(
                    icon: Icons.sell_outlined,
                    label: 'Vendre',
                    accent: const Color(0xFFB45309),
                    onTap: () => context.push('/app/muse'),
                  ),
                  _QuickAction(
                    icon: Icons.travel_explore_rounded,
                    label: 'Trouver',
                    accent: const Color(0xFF0E7490),
                    onTap: () => context.push('/app/nexus'),
                  ),
                  _QuickAction(
                    icon: Icons.notifications_active_outlined,
                    label: 'Veille',
                    accent: const Color(0xFF6D28D9),
                    onTap: () => context.push('/app/missions'),
                  ),
                  _QuickAction(
                    icon: Icons.flag_outlined,
                    label: 'Missions',
                    accent: const Color(0xFF2457C5),
                    onTap: () => context.push('/app/missions'),
                  ),
                  _QuickAction(
                    icon: Icons.verified_user_outlined,
                    label: 'Validations',
                    accent: agentic.pendingApprovalCount > 0
                        ? const Color(0xFFD97706)
                        : const Color(0xFF64748B),
                    badge: agentic.pendingApprovalCount,
                    onTap: () => context.push('/app/missions'),
                  ),
                ]),
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: width >= 900 ? 6 : width >= 520 ? 3 : 3,
                  mainAxisSpacing: 9,
                  crossAxisSpacing: 9,
                  childAspectRatio: width >= 520 ? 1.45 : 1.05,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({
    required this.missions,
    required this.watches,
    required this.approvals,
    required this.onMuse,
    required this.onMissions,
  });

  final int missions;
  final int watches;
  final int approvals;
  final VoidCallback onMuse;
  final VoidCallback onMissions;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(16, 17, 16, 15),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF043F38), Color(0xFF08756A), Color(0xFF0B8A79)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(26),
          boxShadow: const [
            BoxShadow(
              color: Color(0x22064F46),
              blurRadius: 26,
              offset: Offset(0, 12),
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
                        'Muse & Missions',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -.35,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Trouvez. Décidez. WAOUH poursuit.',
                        style: TextStyle(
                          color: Color(0xFFD6F5EC),
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                _HeroMetric(label: 'Missions', value: missions),
                const SizedBox(width: 7),
                _HeroMetric(label: 'Veilles', value: watches),
                const SizedBox(width: 7),
                _HeroMetric(
                  label: 'À valider',
                  value: approvals,
                  alert: approvals > 0,
                ),
              ],
            ),
            const SizedBox(height: 13),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onMuse,
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF075E54),
                      minimumSize: const Size.fromHeight(43),
                    ),
                    icon: const Icon(Icons.psychology_alt_rounded, size: 18),
                    label: const Text(
                      'Ouvrir Muse',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onMissions,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(43),
                      side: const BorderSide(color: Colors.white38),
                    ),
                    icon: const Icon(Icons.route_rounded, size: 18),
                    label: const Text(
                      'Missions',
                      style: TextStyle(fontWeight: FontWeight.w900),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({
    required this.label,
    required this.value,
    this.alert = false,
  });

  final String label;
  final int value;
  final bool alert;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
          decoration: BoxDecoration(
            color: alert ? const Color(0xFFFFE7B3) : Colors.white10,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: alert ? const Color(0xFFFFC75A) : Colors.white24,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$value',
                style: TextStyle(
                  color: alert ? const Color(0xFF704500) : Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: alert ? const Color(0xFF704500) : Colors.white70,
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
      );
}

class _PrimaryCard extends StatelessWidget {
  const _PrimaryCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.accent,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String badge;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(21),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFDCE9E4)),
              borderRadius: BorderRadius.circular(21),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .10),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: accent, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF173A31),
                          fontSize: 14.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFF70817B),
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: accent.withValues(alpha: .08),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        badge,
                        style: TextStyle(
                          color: accent,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Icon(
                      Icons.arrow_forward_rounded,
                      size: 17,
                      color: Color(0xFF91A09B),
                    ),
                  ],
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
    required this.accent,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final String label;
  final Color accent;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(17),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFFE0EBE7)),
              borderRadius: BorderRadius.circular(17),
            ),
            child: Stack(
              children: [
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: .09),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(icon, color: accent, size: 19),
                      ),
                    ),
                    const SizedBox(height: 7),
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Color(0xFF29483F),
                        fontSize: 10.5,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
                if (badge > 0)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 18),
                      height: 18,
                      alignment: Alignment.center,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE28A17),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        '$badge',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
}
