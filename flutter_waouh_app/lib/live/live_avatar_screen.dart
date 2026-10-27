import 'live_avatar_autonomy.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_controller.dart';
import 'live_quick_ask.dart';
import 'live_theme.dart';
import 'live_widgets.dart';

Future<void> _quick(BuildContext context, LiveQuickAskKind kind) async {
  final target = await showLiveQuickAsk(context, kind);
  if (target != null && context.mounted) context.push(target);
}

class LiveAvatarScreen extends StatefulWidget {
  const LiveAvatarScreen({super.key});

  @override
  State<LiveAvatarScreen> createState() => _LiveAvatarScreenState();
}

class _LiveAvatarScreenState extends State<LiveAvatarScreen> {
  bool _editing = false;

  void _startGoal(
    String prompt, {
    required String intent,
    LiveAvatarPresenceState state = LiveAvatarPresenceState.thinking,
  }) {
    final avatar = context.read<LiveAvatarController>();
    final waouh = context.read<LiveWaouhController>();
    avatar.showState(state);
    waouh.setComposerSeed(
      prompt,
      meta: <String, dynamic>{
        'source': 'avatar_home',
        'intent': intent,
        'avatar_name': avatar.name,
      },
    );
    context.go('/app/chat/waouh');
  }

  @override
  Widget build(BuildContext context) {
    if (_editing)
      return _AvatarSetupScreen(
        editMode: true,
        onDone: () => setState(() => _editing = false),
      );
    return LiveAvatarAutonomyScreen(
      name: context.watch<LiveAvatarController>().name,
      onAppearance: () => setState(() => _editing = true),
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
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
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
        Text(avatar.name, style: Theme.of(context).textTheme.headlineMedium),
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
        fontSize: 10.5,
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
                fontSize: 11,
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
                        fontSize: 10.5,
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
                        fontSize: 11,
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
  const _AvatarSetupScreen({required this.editMode, required this.onDone});

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

  static const _personalityIcon = <String, IconData>{
    'Calme': Icons.nightlight_round,
    'Dynamique': Icons.bolt_rounded,
    'Business': Icons.work_outline_rounded,
    'Chaleureux': Icons.favorite_rounded,
    'Équilibré': Icons.balance_rounded,
  };

  static const _proactivityIcon = <String, IconData>{
    'Discret': Icons.visibility_off_rounded,
    'Équilibré': Icons.speed_rounded,
    'Proactif': Icons.rocket_launch_rounded,
  };

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
      title: widget.editMode ? 'Réglage avatar' : 'Créer mon Avatar',
      subtitle: widget.editMode
          ? 'Ce que vous voulez de votre Avatar'
          : 'Son style',
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
              hintText: 'Ex. Bot',
              counterText: '',
            ),
          ),
          const SizedBox(height: 18),
          Text('Apparence', style: Theme.of(context).textTheme.titleMedium),
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
          Text('Personnalité', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 0; i < personalities.length; i++) ...[
                Expanded(
                  child: _IconChoice(
                    icon: _personalityIcon[personalities[i]]!,
                    label: personalities[i],
                    selected: _personality == personalities[i],
                    onTap: () =>
                        setState(() => _personality = personalities[i]),
                  ),
                ),
                if (i != personalities.length - 1) const SizedBox(width: 6),
              ],
            ],
          ),
          const SizedBox(height: 18),
          Text('Initiative', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 0; i < proactivities.length; i++) ...[
                Expanded(
                  child: _IconChoice(
                    icon: _proactivityIcon[proactivities[i]]!,
                    label: proactivities[i],
                    selected: _proactivity == proactivities[i],
                    onTap: () =>
                        setState(() => _proactivity = proactivities[i]),
                  ),
                ),
                if (i != proactivities.length - 1) const SizedBox(width: 6),
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
            label: Text(widget.editMode ? 'Enregistrer' : 'Créer mon Avatar'),
          ),
          const SizedBox(height: 8),
          const Text(
            'Enregistré sur cet appareil.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: WaouhPalette.muted,
              fontSize: 10.5,
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
            color: selected ? const Color(0xFFB8CCFF) : WaouhPalette.line,
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
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Réglage avatar — symbole d'abord, texte minimal : une icône avec une
/// légende courte, pas un bouton-texte (parité avec le Web).
class _IconChoice extends StatelessWidget {
  const _IconChoice({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: selected ? const Color(0xFFEAF2FF) : Colors.white,
    borderRadius: BorderRadius.circular(16),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? const Color(0xFFB8CCFF) : WaouhPalette.line,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: selected ? WaouhPalette.blue : WaouhPalette.muted,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: selected ? WaouhPalette.blue : WaouhPalette.muted,
                fontSize: 9,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Barre de demande libre + suggestions (parité Web : toute nouvelle demande
/// ouvre un NOUVEAU chat avec Bot).
class _AvatarPromptBar extends StatefulWidget {
  const _AvatarPromptBar({required this.suggestions});
  final List<String> suggestions;
  @override
  State<_AvatarPromptBar> createState() => _AvatarPromptBarState();
}

class _AvatarPromptBarState extends State<_AvatarPromptBar> {
  final _c = TextEditingController();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  Future<void> _ask(String text) async {
    final value = text.trim();
    if (value.isEmpty) return;
    final controller = context.read<LiveWaouhController>();
    await controller.startNewChat();
    controller.setComposerSeed(
      value,
      meta: const <String, dynamic>{
        'source': 'avatar_home',
        'intent': 'search',
        'schema': 'waouh.message.v1',
      },
    );
    if (mounted) context.go('/app/chat/waouh');
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      TextField(
        controller: _c,
        textInputAction: TextInputAction.send,
        onSubmitted: _ask,
        decoration: InputDecoration(
          hintText: 'Dites-moi ce qu’il vous faut…',
          filled: true,
          fillColor: Colors.white,
          prefixIcon: const Icon(Icons.auto_awesome_rounded),
          suffixIcon: IconButton(
            tooltip: 'Envoyer',
            onPressed: () => _ask(_c.text),
            icon: const Icon(Icons.send_rounded, color: WaouhPalette.blue),
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: Color(0xFFD9E6FF)),
          ),
        ),
      ),
      const SizedBox(height: 8),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final chip in widget.suggestions)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ActionChip(
                  label: Text(chip),
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: Color(0xFFD9E6FF)),
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF315BD8),
                    fontSize: 12,
                  ),
                  onPressed: () => _ask(chip),
                ),
              ),
          ],
        ),
      ),
    ],
  );
}
