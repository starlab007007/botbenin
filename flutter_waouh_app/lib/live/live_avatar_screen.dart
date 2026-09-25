import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_theme.dart';
import 'live_widgets.dart';

class LiveAvatarScreen extends StatefulWidget {
  const LiveAvatarScreen({super.key});

  @override
  State<LiveAvatarScreen> createState() => _LiveAvatarScreenState();
}

class _LiveAvatarScreenState extends State<LiveAvatarScreen> {
  bool _editing = false;


  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    if (!avatar.loaded) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (!avatar.profile.configured || _editing) {
      return _AvatarSetupScreen(
        editMode: avatar.profile.configured,
        onDone: () => setState(() => _editing = false),
      );
    }

    final waouh = context.watch<LiveWaouhController>();
    final agentic = waouh.agentic;

    final presence = avatar.state != LiveAvatarPresenceState.idle
        ? avatar.state
        : agentic.pendingApprovalCount > 0
            ? LiveAvatarPresenceState.waiting
            : agentic.activeMissionCount > 0
                ? LiveAvatarPresenceState.searching
                : agentic.activeWatchCount > 0
                    ? LiveAvatarPresenceState.watching
                    : LiveAvatarPresenceState.idle;

    final status = agentic.pendingApprovalCount > 0
        ? 'Une décision vous attend.'
        : agentic.activeMissionCount > 0
            ? 'Je poursuis vos missions.'
            : agentic.activeWatchCount > 0
                ? 'Je surveille le marché pour vous.'
                : 'Je suis prêt. Que faisons-nous ?';

    return Scaffold(
      backgroundColor: WaouhPalette.pearl,
      appBar: LiveHeader(
        title: avatar.name,
        subtitle: 'Votre Avatar WAOUH · ${avatar.profile.personality}',
        back: true,
        actions: [
          IconButton(
            tooltip: 'Personnaliser',
            onPressed: () => setState(() => _editing = true),
            icon: const Icon(Icons.tune_rounded),
          ),
        ],
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(gradient: WaouhGradients.air),
        child: ListView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 120),
          children: [
            _AvatarHero(
              avatar: avatar,
              presence: presence,
              status: status,
            ),
            const SizedBox(height: 18),
            Text(
              'Que voulez-vous faire ?',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _GoalCard(
                    icon: Icons.shopping_bag_outlined,
                    title: 'Acheter',
                    subtitle: 'Je trouve et compare',
                    accent: WaouhPalette.blue,
                    background: const Color(0xFFEAF3FF),
                    onTap: () => context.push('/app/avatar/journey/buy'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _GoalCard(
                    icon: Icons.sell_outlined,
                    title: 'Vendre',
                    subtitle: 'Je trouve des acheteurs',
                    accent: const Color(0xFFE18A27),
                    background: const Color(0xFFFFF2E2),
                    onTap: () => context.push('/app/avatar/journey/sell'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _GoalCard(
                    icon: Icons.travel_explore_rounded,
                    title: 'Trouver',
                    subtitle: 'Partout avec NEXUS',
                    accent: const Color(0xFF2A9CCB),
                    background: const Color(0xFFEAF9FC),
                    onTap: () {
                      avatar.showState(LiveAvatarPresenceState.searching);
                      context.push('/app/nexus');
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _GoalCard(
                    icon: Icons.chat_bubble_outline_rounded,
                    title: 'Demander',
                    subtitle: 'Parlez naturellement',
                    accent: const Color(0xFF8B7CFF),
                    background: const Color(0xFFF2EFFF),
                    onTap: () => context.push('/app/avatar/journey/ask'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            _AvatarActivityCard(
              avatarName: avatar.name,
              missions: agentic.activeMissionCount,
              watches: agentic.activeWatchCount,
              approvals: agentic.pendingApprovalCount,
              onMissions: () => context.push('/app/missions'),
            ),
            const SizedBox(height: 14),
            _ForYouCard(
              avatarName: avatar.name,
              missions: agentic.activeMissionCount,
              watches: agentic.activeWatchCount,
              approvals: agentic.pendingApprovalCount,
              onNexus: () => context.push('/app/nexus'),
              onMissions: () => context.push('/app/missions'),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: WaouhPalette.line),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.shield_outlined,
                    color: WaouhPalette.blue,
                    size: 21,
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Votre Avatar prépare et conseille. Vous validez toujours les actions sensibles.',
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
            ),
          ],
        ),
      ),
    );
  }
}

class _AvatarHero extends StatelessWidget {
  const _AvatarHero({
    required this.avatar,
    required this.presence,
    required this.status,
  });

  final LiveAvatarController avatar;
  final LiveAvatarPresenceState presence;
  final String status;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 16),
        decoration: BoxDecoration(
          gradient: WaouhGradients.airHero,
          borderRadius: BorderRadius.circular(30),
          border: Border.all(color: const Color(0xFFDCE7F8)),
          boxShadow: WaouhShadows.card,
        ),
        child: Column(
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                LiveAvatarVisual(
                  preset: avatar.profile.preset,
                  state: presence,
                  size: 148,
                ),
                Positioned(
                  right: 6,
                  top: 8,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .85),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: WaouhPalette.line),
                    ),
                    child: const Text(
                      'WAOUH AI',
                      style: TextStyle(
                        color: WaouhPalette.blue,
                        fontSize: 8.5,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Text(
              avatar.name,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 3),
            Text(
              status,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: WaouhPalette.muted,
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 9),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 6,
              runSpacing: 6,
              children: [
                _MiniPill(label: avatar.profile.personality),
                _MiniPill(label: avatar.profile.proactivity),
                const _MiniPill(label: 'NEXUS'),
              ],
            ),
          ],
        ),
      );

}

class _MiniPill extends StatelessWidget {
  const _MiniPill({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        decoration: BoxDecoration(
          color: Colors.white70,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(color: WaouhPalette.line),
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

class _GoalCard extends StatelessWidget {
  const _GoalCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accent,
    required this.background,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color accent;
  final Color background;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: background,
        borderRadius: BorderRadius.circular(22),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: Colors.white),
              boxShadow: WaouhShadows.card,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white70,
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Icon(icon, color: accent, size: 20),
                ),
                const SizedBox(height: 11),
                Text(
                  title,
                  style: const TextStyle(
                    color: WaouhPalette.ink,
                    fontSize: 14.5,
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
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _AvatarActivityCard extends StatelessWidget {
  const _AvatarActivityCard({
    required this.avatarName,
    required this.missions,
    required this.watches,
    required this.approvals,
    required this.onMissions,
  });

  final String avatarName;
  final int missions;
  final int watches;
  final int approvals;
  final VoidCallback onMissions;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onMissions,
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              border: Border.all(color: WaouhPalette.line),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.bolt_rounded,
                      color: WaouhPalette.blue,
                      size: 20,
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: Text(
                        'Ce que $avatarName fait pour vous',
                        style: const TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: Color(0xFF9AA9C0),
                    ),
                  ],
                ),
                const SizedBox(height: 11),
                Row(
                  children: [
                    Expanded(
                      child: _ActivityMetric(
                        value: missions,
                        label: 'Missions',
                        icon: Icons.flag_outlined,
                      ),
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: _ActivityMetric(
                        value: watches,
                        label: 'Veilles',
                        icon: Icons.radar_rounded,
                      ),
                    ),
                    const SizedBox(width: 7),
                    Expanded(
                      child: _ActivityMetric(
                        value: approvals,
                        label: 'À valider',
                        icon: Icons.verified_user_outlined,
                        alert: approvals > 0,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
}

class _ActivityMetric extends StatelessWidget {
  const _ActivityMetric({
    required this.value,
    required this.label,
    required this.icon,
    this.alert = false,
  });

  final int value;
  final String label;
  final IconData icon;
  final bool alert;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
        decoration: BoxDecoration(
          color: alert ? const Color(0xFFFFF3E2) : const Color(0xFFF5F8FF),
          borderRadius: BorderRadius.circular(15),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              size: 17,
              color: alert ? const Color(0xFFE18A27) : WaouhPalette.blue,
            ),
            const SizedBox(height: 4),
            Text(
              '$value',
              style: const TextStyle(
                color: WaouhPalette.ink,
                fontSize: 15,
                fontWeight: FontWeight.w800,
              ),
            ),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: WaouhPalette.muted,
                fontSize: 8.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
}

class _ForYouCard extends StatelessWidget {
  const _ForYouCard({
    required this.avatarName,
    required this.missions,
    required this.watches,
    required this.approvals,
    required this.onNexus,
    required this.onMissions,
  });

  final String avatarName;
  final int missions;
  final int watches;
  final int approvals;
  final VoidCallback onNexus;
  final VoidCallback onMissions;

  @override
  Widget build(BuildContext context) {
    final String title;
    final String detail;
    final VoidCallback action;
    final IconData icon;

    if (approvals > 0) {
      title = 'Une décision vous attend';
      detail = '$avatarName a préparé une action à valider.';
      action = onMissions;
      icon = Icons.verified_user_outlined;
    } else if (watches > 0) {
      title = 'Le marché est surveillé';
      detail = '$avatarName suit $watches veille(s) pour vous.';
      action = onMissions;
      icon = Icons.radar_rounded;
    } else if (missions > 0) {
      title = 'Recherche en cours';
      detail = '$avatarName poursuit $missions mission(s).';
      action = onMissions;
      icon = Icons.travel_explore_rounded;
    } else {
      title = 'Explorez le marché';
      detail = '$avatarName peut chercher vendeurs, acheteurs et opportunités.';
      action = onNexus;
      icon = Icons.public_rounded;
    }

    return Material(
      color: const Color(0xFFF1F6FF),
      borderRadius: BorderRadius.circular(22),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: action,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: WaouhPalette.blue, size: 20),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Pour vous',
                      style: TextStyle(
                        color: WaouhPalette.blue,
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      title,
                      style: const TextStyle(
                        color: WaouhPalette.ink,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      detail,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
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
                Icons.arrow_forward_rounded,
                size: 18,
                color: WaouhPalette.blue,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AvatarSetupScreen extends StatefulWidget {
  const _AvatarSetupScreen({
    required this.editMode,
    required this.onDone,
  });

  final bool editMode;
  final VoidCallback onDone;

  @override
  State<_AvatarSetupScreen> createState() => _AvatarSetupScreenState();
}

class _AvatarSetupScreenState extends State<_AvatarSetupScreen> {
  late final TextEditingController _name;
  late LiveAvatarPreset _preset;
  late String _personality;
  late String _proactivity;
  bool _saving = false;

  static const personalities = [
    'Calme',
    'Dynamique',
    'Business',
    'Chaleureux',
    'Équilibré',
  ];
  static const proactivities = ['Discret', 'Équilibré', 'Proactif'];

  @override
  void initState() {
    super.initState();
    final avatar = context.read<LiveAvatarController>();
    _name = TextEditingController(text: avatar.name);
    _preset = avatar.profile.preset;
    _personality = avatar.profile.personality;
    _proactivity = avatar.profile.proactivity;
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    await context.read<LiveAvatarController>().saveProfile(
          name: _name.text,
          preset: _preset,
          personality: _personality,
          proactivity: _proactivity,
        );
    if (!mounted) return;
    setState(() => _saving = false);
    widget.onDone();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: WaouhPalette.pearl,
        appBar: LiveHeader(
          title: widget.editMode ? 'Personnaliser' : 'Créer mon Avatar',
          subtitle: widget.editMode
              ? 'Votre présence WAOUH'
              : 'Choisissez sa présence et son style',
          back: widget.editMode,
        ),
        body: DecoratedBox(
          decoration: const BoxDecoration(gradient: WaouhGradients.air),
          child: ListView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 110),
            children: [
              Center(
                child: LiveAvatarVisual(
                  preset: _preset,
                  state: LiveAvatarPresenceState.listening,
                  size: 142,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _name,
                textAlign: TextAlign.center,
                maxLength: 18,
                decoration: const InputDecoration(
                  labelText: 'Nom de votre Avatar',
                  hintText: 'Ex. Ayo',
                  counterText: '',
                ),
              ),
              const SizedBox(height: 18),
              Text(
                'Choisissez son apparence',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 9),
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 9,
                crossAxisSpacing: 9,
                childAspectRatio: 1.05,
                children: [
                  for (final preset in LiveAvatarPreset.values)
                    _PresetCard(
                      preset: preset,
                      selected: preset == _preset,
                      onTap: () => setState(() => _preset = preset),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'Personnalité',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 7,
                runSpacing: 7,
                children: [
                  for (final item in personalities)
                    ChoiceChip(
                      label: Text(item),
                      selected: _personality == item,
                      onSelected: (_) => setState(() => _personality = item),
                    ),
                ],
              ),
              const SizedBox(height: 18),
              Text(
                'Initiative',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (var i = 0; i < proactivities.length; i++) ...[
                    Expanded(
                      child: ChoiceChip(
                        label: SizedBox(
                          width: double.infinity,
                          child: Text(
                            proactivities[i],
                            textAlign: TextAlign.center,
                          ),
                        ),
                        selected: _proactivity == proactivities[i],
                        onSelected: (_) => setState(
                          () => _proactivity = proactivities[i],
                        ),
                      ),
                    ),
                    if (i != proactivities.length - 1)
                      const SizedBox(width: 6),
                  ],
                ],
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _saving ? null : _save,
                icon: _saving
                    ? const SizedBox.square(
                        dimension: 17,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.auto_awesome_rounded),
                label: Text(
                  widget.editMode ? 'Enregistrer' : 'Créer mon Avatar',
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'La personnalisation est enregistrée uniquement sur cet appareil. Aucun changement backend.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: WaouhPalette.muted,
                  fontSize: 9.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      );
}

class _PresetCard extends StatelessWidget {
  const _PresetCard({
    required this.preset,
    required this.selected,
    required this.onTap,
  });

  final LiveAvatarPreset preset;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? const Color(0xFFEAF2FF) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.fromLTRB(6, 8, 6, 7),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: selected
                    ? const Color(0xFFB8CCFF)
                    : WaouhPalette.line,
                width: selected ? 1.5 : 1,
              ),
            ),
            child: Column(
              children: [
                Expanded(
                  child: LiveAvatarVisual(
                    preset: preset,
                    size: 68,
                    showStatusBadge: false,
                  ),
                ),
                Text(
                  preset.label,
                  style: TextStyle(
                    color: selected ? WaouhPalette.blue : WaouhPalette.ink,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}
