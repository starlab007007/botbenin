import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../main.dart' as legacy;
import 'agentic/live_agentic_models.dart';
import 'agentic/live_agentic_workspace.dart';
import 'live_controller.dart';
import 'live_widgets.dart';

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

  void openWorkspace() {
    final controller = context.read<LiveWaouhController>().agentic;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      builder: (_) => FractionallySizedBox(
        heightFactor: .92,
        child: LiveAgenticWorkspace(
          controller: controller,
          onResumeMission: resumeMission,
        ),
      ),
    );
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
      appBar: const LiveHeader(
        title: 'WAOUH Muse',
        subtitle: 'Dites l’objectif · Muse + NEXUS s’en chargent',
        back: true,
      ),
      body: auth.signedIn
          ? ListView(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 120),
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
                _SectionTitle(
                  title: 'Que voulez-vous confier à Muse ?',
                  subtitle:
                      'Muse poursuit un objectif. NEXUS trouve l’offre ou la demande.',
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
                        onTap: openWorkspace,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _ActionCard(
                        icon: Icons.notifications_active_outlined,
                        title: 'Veilles',
                        subtitle: agentic.activeWatchCount.toString() +
                            ' active(s)',
                        onTap: openWorkspace,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _StatusCard(
                  pendingApprovals: agentic.pendingApprovalCount,
                  activityCount: agentic.activity.length,
                  onOpen: openWorkspace,
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
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF13263A), Color(0xFF0A7D68)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(22),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.white12,
                  child: Icon(Icons.psychology_alt_rounded, color: Colors.white),
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Dites l’objectif. WAOUH poursuit.',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 10),
            Text(
              'Muse planifie. NEXUS cherche acheteurs ou vendeurs. Le Signal Fabric classe les meilleures opportunités et protège les contacts.',
              style: TextStyle(
                color: Colors.white70,
                height: 1.35,
                fontSize: 12.5,
              ),
            ),
          ],
        ),
      );
}

class _ArchitectureFlow extends StatelessWidget {
  const _ArchitectureFlow();

  @override
  Widget build(BuildContext context) => Row(
        children: const [
          Expanded(
            child: _FlowStep(
              icon: Icons.chat_bubble_outline_rounded,
              label: 'Objectif',
            ),
          ),
          _FlowArrow(),
          Expanded(
            child: _FlowStep(
              icon: Icons.psychology_alt_outlined,
              label: 'Muse',
            ),
          ),
          _FlowArrow(),
          Expanded(
            child: _FlowStep(
              icon: Icons.travel_explore_rounded,
              label: 'NEXUS',
            ),
          ),
          _FlowArrow(),
          Expanded(
            child: _FlowStep(
              icon: Icons.hub_outlined,
              label: 'Signal',
            ),
          ),
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
          color: const Color(0xFFF4FBF8),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: const Color(0xFFD8EDE6)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: const Color(0xFF08745D)),
            const SizedBox(height: 3),
            Text(
              label,
              maxLines: 1,
              style: const TextStyle(
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
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
        padding: EdgeInsets.symmetric(horizontal: 3),
        child: Icon(
          Icons.chevron_right_rounded,
          size: 16,
          color: Colors.blueGrey,
        ),
      );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(color: Colors.blueGrey, fontSize: 12),
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
        shape: RoundedRectangleBorder(
          side: const BorderSide(color: Color(0xFFDDE8E4)),
          borderRadius: BorderRadius.circular(17),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(17),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(icon, color: const Color(0xFF08745D)),
                const SizedBox(height: 9),
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 11, color: Colors.blueGrey),
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
  Widget build(BuildContext context) => Card(
        elevation: 0,
        color: pendingApprovals > 0
            ? const Color(0xFFFFF8E7)
            : const Color(0xFFF4FBF7),
        child: ListTile(
          leading: Icon(
            pendingApprovals > 0
                ? Icons.verified_user_outlined
                : Icons.history_rounded,
            color: pendingApprovals > 0
                ? const Color(0xFF9B6500)
                : const Color(0xFF08745D),
          ),
          title: Text(
            pendingApprovals > 0
                ? pendingApprovals.toString() + ' validation(s) à décider'
                : 'Aucune validation en attente',
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
          subtitle: Text(
            activityCount.toString() + ' événement(s) dans le journal Muse',
          ),
          trailing: const Icon(Icons.chevron_right_rounded),
          onTap: onOpen,
        ),
      );
}

class _MusePrinciples extends StatelessWidget {
  const _MusePrinciples();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF7F8F9),
          borderRadius: BorderRadius.circular(17),
        ),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Contrôle humain intégré',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
            SizedBox(height: 8),
            _Principle(
              icon: Icons.search_rounded,
              text: 'Muse peut chercher et comparer automatiquement.',
            ),
            _Principle(
              icon: Icons.visibility_outlined,
              text: 'Vous voyez missions, veilles, étapes et activité.',
            ),
            _Principle(
              icon: Icons.lock_outline_rounded,
              text:
                  'Les contacts privés restent protégés ; blind matching quand nécessaire.',
            ),
            _Principle(
              icon: Icons.payments_outlined,
              text:
                  'Aucun paiement autonome : les décisions financières restent hors de Muse.',
            ),
          ],
        ),
      );
}

class _Principle extends StatelessWidget {
  const _Principle({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 7),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 17, color: const Color(0xFF60776E)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(text, style: const TextStyle(fontSize: 12)),
            ),
          ],
        ),
      );
}
