import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'brand_mark.dart';
import 'live_controller.dart';
import 'live_theme.dart';

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

  void _openMuse() => context.push('/app/avatar');
  void _openMissions() => context.push('/app/missions');

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LiveWaouhController>();
    final agentic = controller.agentic;
    final width = MediaQuery.sizeOf(context).width;

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: SafeArea(
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: _TopLine(
                    onMuse: _openMuse,
                    onMissions: _openMissions,
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: _AirHero(
                    missions: agentic.activeMissionCount,
                    watches: agentic.activeWatchCount,
                    approvals: agentic.pendingApprovalCount,
                    onMuse: _openMuse,
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: Text(
                    'Que voulez-vous faire ?',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      Expanded(
                        child: _IntentCard(
                          icon: Icons.shopping_bag_outlined,
                          title: 'Acheter',
                          subtitle: 'Trouver les meilleures offres',
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFFE8F3FF), Color(0xFFF4F8FF)],
                          ),
                          accent: WaouhPalette.blue,
                          onTap: _openMuse,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _IntentCard(
                          icon: Icons.sell_outlined,
                          title: 'Vendre',
                          subtitle: 'Trouver les bons acheteurs',
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFFFFF1DD), Color(0xFFFFF8EE)],
                          ),
                          accent: const Color(0xFFE18A27),
                          onTap: _openMuse,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                sliver: SliverToBoxAdapter(
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Vos espaces intelligents',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push('/app/nexus'),
                        child: const Text('NEXUS'),
                      ),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                sliver: SliverToBoxAdapter(
                  child: width >= 650
                      ? Row(
                          children: [
                            Expanded(
                              child: _FeatureCard(
                                icon: Icons.psychology_alt_rounded,
                                title: 'WAOUH Avatar',
                                subtitle: 'Objectif → recherche → action',
                                badge: 'AI',
                                accent: WaouhPalette.blue,
                                onTap: _openMuse,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _FeatureCard(
                                icon: Icons.route_rounded,
                                title: 'Missions & veille',
                                subtitle: 'Continue même hors du chat',
                                badge: agentic.pendingApprovalCount > 0
                                    ? '${agentic.pendingApprovalCount} à valider'
                                    : 'ACTIF',
                                accent: WaouhPalette.jade,
                                onTap: _openMissions,
                              ),
                            ),
                          ],
                        )
                      : Column(
                          children: [
                            _FeatureCard(
                              icon: Icons.psychology_alt_rounded,
                              title: 'WAOUH Avatar',
                              subtitle: 'Objectif → recherche → action',
                              badge: 'AI',
                              accent: WaouhPalette.blue,
                              onTap: _openMuse,
                            ),
                            const SizedBox(height: 10),
                            _FeatureCard(
                              icon: Icons.route_rounded,
                              title: 'Missions & veille',
                              subtitle: 'Continue même hors du chat',
                              badge: agentic.pendingApprovalCount > 0
                                  ? '${agentic.pendingApprovalCount} à valider'
                                  : 'ACTIF',
                              accent: WaouhPalette.jade,
                              onTap: _openMissions,
                            ),
                          ],
                        ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 8),
                sliver: SliverToBoxAdapter(
                  child: Text(
                    'En un geste',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 26),
                sliver: SliverGrid(
                  delegate: SliverChildListDelegate.fixed([
                    _QuickAction(
                      icon: Icons.travel_explore_rounded,
                      label: 'Trouver',
                      accent: const Color(0xFF4788F4),
                      onTap: () => context.push('/app/nexus'),
                    ),
                    _QuickAction(
                      icon: Icons.compare_arrows_rounded,
                      label: 'Comparer',
                      accent: const Color(0xFF7A6CF2),
                      onTap: () => context.push('/app/nexus'),
                    ),
                    _QuickAction(
                      icon: Icons.flag_outlined,
                      label: 'Mission',
                      accent: const Color(0xFF3479E8),
                      badge: agentic.activeMissionCount,
                      onTap: _openMissions,
                    ),
                    _QuickAction(
                      icon: Icons.notifications_active_outlined,
                      label: 'Veille',
                      accent: const Color(0xFF9B67E8),
                      badge: agentic.activeWatchCount,
                      onTap: _openMissions,
                    ),
                    _QuickAction(
                      icon: Icons.verified_user_outlined,
                      label: 'Valider',
                      accent: agentic.pendingApprovalCount > 0
                          ? const Color(0xFFF09B38)
                          : const Color(0xFF7890B8),
                      badge: agentic.pendingApprovalCount,
                      onTap: _openMissions,
                    ),
                    _QuickAction(
                      icon: Icons.forum_outlined,
                      label: 'Chat',
                      accent: WaouhPalette.jade,
                      onTap: () => context.push('/app/chat/waouh'),
                    ),
                  ]),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: width >= 900 ? 6 : 3,
                    mainAxisSpacing: 9,
                    crossAxisSpacing: 9,
                    childAspectRatio: width >= 520 ? 1.25 : 1.02,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopLine extends StatelessWidget {
  const _TopLine({required this.onMuse, required this.onMissions});

  final VoidCallback onMuse;
  final VoidCallback onMissions;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Container(
            width: 42,
            height: 42,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: WaouhPalette.line),
              boxShadow: WaouhShadows.card,
            ),
            child: const BrandMark(size: 26),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('WAOUH', style: Theme.of(context).textTheme.titleLarge),
                const Text(
                  'Votre espace intelligent',
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
            tooltip: 'Missions',
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xFFF1F6FF),
              foregroundColor: WaouhPalette.blue,
            ),
            onPressed: onMissions,
            icon: const Icon(Icons.route_rounded),
          ),
          const SizedBox(width: 4),
          IconButton.filledTonal(
            tooltip: 'Avatar',
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xFFF1F6FF),
              foregroundColor: WaouhPalette.blue,
            ),
            onPressed: onMuse,
            icon: const Icon(Icons.psychology_alt_rounded),
          ),
        ],
      );
}

class _AirHero extends StatelessWidget {
  const _AirHero({
    required this.missions,
    required this.watches,
    required this.approvals,
    required this.onMuse,
  });

  final int missions;
  final int watches;
  final int approvals;
  final VoidCallback onMuse;

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          gradient: WaouhGradients.airHero,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFDCE7F8)),
          boxShadow: WaouhShadows.card,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Stack(
            children: [
              const Positioned(
                right: -42,
                top: -55,
                child: _GlowOrb(
                  size: 160,
                  colors: [Color(0x445EDCFF), Color(0x338B7CFF)],
                ),
              ),
              const Positioned(
                left: -35,
                bottom: -70,
                child: _GlowOrb(
                  size: 150,
                  colors: [Color(0x333BC7C5), Color(0x225B8CFF)],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            gradient: WaouhGradients.brand,
                            borderRadius: BorderRadius.circular(18),
                            boxShadow: WaouhShadows.brandGlow,
                          ),
                          child: const Icon(
                            Icons.auto_awesome_rounded,
                            color: Colors.white,
                            size: 25,
                          ),
                        ),
                        const SizedBox(width: 13),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Votre Avatar comprend votre objectif.',
                                style:
                                    Theme.of(context).textTheme.headlineMedium,
                              ),
                              const SizedBox(height: 5),
                              const Text(
                                'Vous décidez. WAOUH cherche, compare et poursuit.',
                                style: TextStyle(
                                  color: WaouhPalette.muted,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 15),
                    Row(
                      children: [
                        _Metric(value: missions, label: 'missions'),
                        const SizedBox(width: 7),
                        _Metric(value: watches, label: 'veilles'),
                        const SizedBox(width: 7),
                        _Metric(
                          value: approvals,
                          label: 'à valider',
                          alert: approvals > 0,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    FilledButton.icon(
                      onPressed: onMuse,
                      icon: const Icon(Icons.mic_none_rounded, size: 19),
                      label: const Text('Parler à l’Avatar'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        backgroundColor: WaouhPalette.blue,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
}

class _GlowOrb extends StatelessWidget {
  const _GlowOrb({required this.size, required this.colors});

  final double size;
  final List<Color> colors;

  @override
  Widget build(BuildContext context) => IgnorePointer(
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(colors: colors),
          ),
        ),
      );
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.value,
    required this.label,
    this.alert = false,
  });

  final int value;
  final String label;
  final bool alert;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
          decoration: BoxDecoration(
            color: alert ? const Color(0xFFFFF2DF) : Colors.white70,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color:
                  alert ? const Color(0xFFF7D49B) : const Color(0xFFE1E9F6),
            ),
          ),
          child: Row(
            children: [
              Text(
                '$value',
                style: TextStyle(
                  color: alert
                      ? const Color(0xFFD57F17)
                      : WaouhPalette.ink,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}

class _IntentCard extends StatelessWidget {
  const _IntentCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.gradient,
    required this.accent,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Gradient gradient;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Ink(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: Colors.white),
              boxShadow: WaouhShadows.card,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .10),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: accent, size: 21),
                ),
                const SizedBox(height: 12),
                Text(
                  title,
                  style: const TextStyle(
                    color: WaouhPalette.ink,
                    fontSize: 15.5,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  maxLines: 2,
                  style: const TextStyle(
                    color: WaouhPalette.muted,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    height: 1.25,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({
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
        borderRadius: BorderRadius.circular(22),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Ink(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: WaouhPalette.line),
              boxShadow: WaouhShadows.card,
            ),
            child: Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .09),
                    borderRadius: BorderRadius.circular(15),
                  ),
                  child: Icon(icon, color: accent, size: 22),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 7),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .08),
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    badge,
                    style: TextStyle(
                      color: accent,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w800,
                    ),
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
        borderRadius: BorderRadius.circular(18),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: WaouhPalette.line),
            ),
            child: Stack(
              children: [
                Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: .09),
                          borderRadius: BorderRadius.circular(13),
                        ),
                        child: Icon(icon, color: accent, size: 20),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 10.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                if (badge > 0)
                  Positioned(
                    right: 7,
                    top: 7,
                    child: Container(
                      constraints: const BoxConstraints(minWidth: 18),
                      height: 18,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5A13D),
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        '$badge',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8.5,
                          fontWeight: FontWeight.w800,
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
