import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'agentic/live_agentic_models.dart';
import 'agentic/live_agentic_workspace.dart';
import 'live_controller.dart';
import 'live_widgets.dart';
import 'live_theme.dart';

class LiveMuseScreen extends StatefulWidget {
  const LiveMuseScreen({super.key});

  @override
  State<LiveMuseScreen> createState() => _LiveMuseScreenState();
}

class _LiveMuseScreenState extends State<LiveMuseScreen> {
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

  void resumeMission(WaouhMission mission) {
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

  void talkToMuse() {
    final controller = context.read<LiveWaouhController>();
    controller.setComposerSeed(
      'Muse, aide-moi à atteindre mon objectif. Pose-moi seulement les questions indispensables puis travaille avec NEXUS.',
      meta: const <String, dynamic>{
        'source': 'muse_home',
        'intent': 'agentic_goal',
      },
    );
    context.go('/app/chat/waouh');
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<legacy.AuthController>();
    final waouh = context.watch<LiveWaouhController>();
    final agentic = waouh.agentic;

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: const LiveHeader(
        title: 'WAOUH Muse',
        subtitle: 'Dites l’objectif · Muse + NEXUS s’en chargent',
        back: true,
      ),
      body: auth.signedIn
          ? ListView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 120),
              children: [
                const _MuseHero(),
                const SizedBox(height: 10),
                const _ArchitectureFlow(),
                const SizedBox(height: 12),
                LiveAgenticSummaryBar(
                  controller: agentic,
                  onResumeMission: resumeMission,
                ),
                const SizedBox(height: 12),
                const _SectionTitle(
                  title: 'Que voulez-vous faire ?',
                  subtitle: 'Muse + NEXUS',
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.travel_explore_rounded,
                        title: 'Trouver partout',
                        subtitle: 'Vendeurs ou acheteurs',
                        onTap: () => context.push('/app/nexus'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.auto_awesome_rounded,
                        title: 'Parler à Muse',
                        subtitle: 'Créer un objectif',
                        onTap: talkToMuse,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.flag_outlined,
                        title: 'Missions',
                        subtitle: agentic.activeMissionCount.toString() +
                            ' active(s)',
                        onTap: () => context.push('/app/missions'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.notifications_active_outlined,
                        title: 'Veilles',
                        subtitle: agentic.activeWatchCount.toString() +
                            ' active(s)',
                        onTap: () => context.push('/app/missions'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _StatusCard(
                  pendingApprovals: agentic.pendingApprovalCount,
                  activityCount: agentic.activity.length,
                  onOpen: () => context.push('/app/missions'),
                ),
                const SizedBox(height: 14),
                const _MusePrinciples(),
              ],
            )
          : Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: FilledButton.icon(
                  onPressed: () => context.go('/app/auth?next=/app/muse'),
                  icon: const Icon(Icons.login_rounded),
                  label: const Text('Se connecter pour activer Muse'),
                ),
              ),
            ),
    );
  }
}

class _MuseHero extends StatelessWidget {
  const _MuseHero();

  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(
          gradient: WaouhGradients.muse,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: const Color(0xFFDDE7F7)),
          boxShadow: WaouhShadows.card,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Stack(
            children: [
              Positioned(
                right: -28,
                top: -38,
                child: Container(
                  width: 145,
                  height: 145,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [Color(0x4455DDF2), Color(0x008B7CFF)],
                    ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        gradient: WaouhGradients.brand,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: WaouhShadows.brandGlow,
                      ),
                      child: const Icon(
                        Icons.psychology_alt_rounded,
                        color: Colors.white,
                        size: 27,
                      ),
                    ),
                    const SizedBox(width: 13),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Acheter ou vendre avec Muse.',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Dites l’objectif. WAOUH cherche et compare.',
                            style: TextStyle(
                              color: WaouhPalette.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              height: 1.28,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: const [
                              _MuseChip(label: 'NEXUS'),
                              _MuseChip(label: 'Comparaison'),
                              _MuseChip(label: 'Contact'),
                            ],
                          ),
                        ],
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

class _MuseChip extends StatelessWidget {
  const _MuseChip({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white70,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: const Color(0xFFDDE6F6)),
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: WaouhPalette.blue,
            fontSize: 9,
            fontWeight: FontWeight.w800,
          ),
        ),
      );
}

class _ArchitectureFlow extends StatelessWidget {
  const _ArchitectureFlow();

  @override
  Widget build(BuildContext context) => Row(
        children: const [
          Expanded(child: _FlowStep(icon: Icons.chat_bubble_outline_rounded, label: 'Objectif')),
          _FlowArrow(),
          Expanded(child: _FlowStep(icon: Icons.psychology_alt_outlined, label: 'Muse')),
          _FlowArrow(),
          Expanded(child: _FlowStep(icon: Icons.travel_explore_rounded, label: 'NEXUS')),
          _FlowArrow(),
          Expanded(child: _FlowStep(icon: Icons.hub_outlined, label: 'Signal')),
        ],
      );
}

class _FlowStep extends StatelessWidget {
  const _FlowStep({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 9, horizontal: 5),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: WaouhPalette.blue),
            const SizedBox(height: 4),
            Text(
              label,
              maxLines: 1,
              style: const TextStyle(
                color: WaouhPalette.ink,
                fontSize: 9.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
}

class _FlowArrow extends StatelessWidget {
  const _FlowArrow();

  @override
  Widget build(BuildContext context) => const Padding(
        padding: EdgeInsets.symmetric(horizontal: 2),
        child: Icon(
          Icons.chevron_right_rounded,
          size: 15,
          color: Color(0xFFA5B2C8),
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Row(
        children: [
          Expanded(
            child: Text(
              title,
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
          Text(
            subtitle,
            style: const TextStyle(
              color: WaouhPalette.blue,
              fontSize: 10,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      );
}

class _ActionCard extends StatelessWidget {
  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Ink(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              border: Border.all(color: WaouhPalette.line),
              borderRadius: BorderRadius.circular(20),
              boxShadow: WaouhShadows.card,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 39,
                  height: 39,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F5FF),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(icon, color: WaouhPalette.blue, size: 20),
                ),
                const SizedBox(height: 10),
                Text(
                  title,
                  style: const TextStyle(
                    color: WaouhPalette.ink,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    color: WaouhPalette.muted,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({
    required this.pendingApprovals,
    required this.activityCount,
    required this.onOpen,
  });

  final int pendingApprovals;
  final int activityCount;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onOpen,
          child: Ink(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              border: Border.all(
                color: pendingApprovals > 0
                    ? const Color(0xFFF5D39D)
                    : WaouhPalette.line,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: pendingApprovals > 0
                        ? const Color(0xFFFFF3E1)
                        : const Color(0xFFF0F5FF),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(
                    pendingApprovals > 0
                        ? Icons.verified_user_outlined
                        : Icons.history_rounded,
                    color: pendingApprovals > 0
                        ? const Color(0xFFE0922F)
                        : WaouhPalette.blue,
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pendingApprovals > 0
                            ? '$pendingApprovals à valider'
                            : 'Tout est à jour',
                        style: const TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$activityCount activité(s)',
                        style: const TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF9AA9C0),
                ),
              ],
            ),
          ),
        ),
      );
}

class _MusePrinciples extends StatelessWidget {
  const _MusePrinciples();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFF),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: WaouhPalette.line),
        ),
        child: const Row(
          children: [
            Icon(
              Icons.verified_user_outlined,
              size: 20,
              color: WaouhPalette.blue,
            ),
            SizedBox(width: 9),
            Expanded(
              child: Text(
                'Vous gardez le contrôle des contacts, validations et paiements.',
                style: TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  height: 1.3,
                ),
              ),
            ),
          ],
        ),
      );
}
