import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'avatar/bot_character.dart';
import 'avatar/live_avatar_controller.dart';
import 'avatar/live_avatar_widgets.dart';
import 'live_theme.dart';

/// UI V3 — Bot, cœur de WAOUH, sur l'accueil Flutter (parité avec le Web
/// `src/components/waouh/bot/*`). Purement visuel : aucune donnée serveur
/// n'est créée ni modifiée ici.

/// Taille de texte / d'icône proportionnelle à la largeur
/// (téléphone compact 0,92 → tablette 1,22).
double liveBotUiScale(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  return (width / 390).clamp(0.92, 1.22).toDouble();
}

/// Trois messages courts d'accueil, prononcés l'un après l'autre.
/// [thirdLine] remplace le troisième message quand Bot a une activité réelle.
List<String> liveBotGreetingLines(String? firstName, [String? thirdLine]) {
  final name = (firstName ?? '').trim().split(RegExp(r'\s+')).first;
  final named = name.isNotEmpty && name.toLowerCase() != 'waouhapp';
  final third = (thirdLine ?? '').trim();
  return [
    named ? 'Bonjour $name, je suis Bot.' : 'Bonjour, je suis Bot.',
    'Je cherche, compare et négocie pour vous.',
    third.isNotEmpty ? third : "Dites-moi ce qu'il vous faut, je m'occupe du reste.",
  ];
}

/// Troisième message selon l'activité réelle (missions ou Deal Rooms suivies).
String? liveBotActivityLine({int missions = 0, int deals = 0}) {
  if (missions > 0) {
    return "J'ai $missions mission${missions > 1 ? 's' : ''} en cours pour vous.";
  }
  if (deals > 0) {
    return 'Je suis $deals Deal Room${deals > 1 ? 's' : ''} pour vous.';
  }
  return null;
}

/// Question posée par Bot à la fin de l'accueil.
const liveBotQuestion = 'On commence par quoi ?';

/// Expression de Bot pendant l'accueil : salut, parole, question.
BotExpression liveBotGreetingExpression({
  required int shown,
  required int lineCount,
  required bool instant,
  int missions = 0,
  int approvals = 0,
}) {
  if (instant || shown > lineCount) {
    if (approvals > 0) return BotExpression.ask;
    if (missions > 0) return BotExpression.work;
    return instant ? BotExpression.idle : BotExpression.ask;
  }
  if (shown == 0) return BotExpression.hello;
  if (shown < lineCount) return BotExpression.talk;
  return BotExpression.ask;
}

class BotHomeHero extends StatefulWidget {
  const BotHomeHero({
    super.key,
    required this.avatarName,
    required this.firstName,
    required this.missionCount,
    required this.approvalCount,
    required this.activeDeals,
    required this.onAvatar,
    required this.onMissions,
    required this.onAsk,
    required this.onFindOpportunity,
    required this.onNegotiate,
    this.onPrompt,
  });

  final String avatarName;
  final String? firstName;
  final int missionCount;
  final int approvalCount;
  final int activeDeals;
  final VoidCallback onAvatar;
  final VoidCallback onMissions;
  final VoidCallback onAsk;
  final VoidCallback onFindOpportunity;
  final VoidCallback onNegotiate;

  /// Ouvre la conversation WAOUH avec un début de demande (choix rapides).
  final ValueChanged<String>? onPrompt;

  /// L'accueil animé n'est joué qu'une fois par lancement de l'application.
  static bool greetingPlayed = false;

  @override
  State<BotHomeHero> createState() => _BotHomeHeroState();
}

class _BotHomeHeroState extends State<BotHomeHero> {
  final _timers = <Timer>[];
  late final List<String> _lines = liveBotGreetingLines(
    widget.firstName,
    liveBotActivityLine(missions: widget.missionCount, deals: widget.activeDeals),
  );
  late final bool _instant = BotHomeHero.greetingPlayed;
  int _shown = 0;
  bool _typing = false;
  bool _leaving = false;

  int get _steps => _lines.length + 1;

  @override
  void initState() {
    super.initState();
    if (_instant) {
      _shown = _steps;
      return;
    }
    var at = 350;
    for (var i = 0; i < _steps; i++) {
      _timers.add(Timer(Duration(milliseconds: at), () {
        if (mounted) setState(() => _typing = true);
      }));
      at += 750;
      final index = i;
      _timers.add(Timer(Duration(milliseconds: at), () {
        if (mounted) {
          setState(() {
            _typing = false;
            _shown = index + 1;
          });
        }
      }));
      at += 650;
    }
    _timers.add(Timer(Duration(milliseconds: at), () {
      BotHomeHero.greetingPlayed = true;
    }));
  }

  @override
  void dispose() {
    for (final timer in _timers) {
      timer.cancel();
    }
    super.dispose();
  }

  /// Bot glisse vers la conversation, puis l'action s'ouvre.
  void _glideThen(VoidCallback action) {
    if (_leaving) return;
    setState(() => _leaving = true);
    _timers.add(Timer(const Duration(milliseconds: 420), () {
      action();
      _timers.add(Timer(const Duration(milliseconds: 600), () {
        if (mounted) setState(() => _leaving = false);
      }));
    }));
  }

  void _prompt(String seed) {
    final onPrompt = widget.onPrompt;
    _glideThen(onPrompt == null ? widget.onAsk : () => onPrompt(seed));
  }

  BotExpression get _expression => _leaving
      ? BotExpression.think
      : liveBotGreetingExpression(
          shown: _shown,
          lineCount: _lines.length,
          instant: _instant,
          missions: widget.missionCount,
          approvals: widget.approvalCount,
        );

  @override
  Widget build(BuildContext context) {
    final avatar = context.watch<LiveAvatarController>();
    final stored = widget.avatarName.trim();
    final name =
        stored.isEmpty || stored.toLowerCase() == 'ayo' ? 'Bot' : stored;
    final k = liveBotUiScale(context);
    final avatarSize = 118.0 * k;
    final reduceMotion = MediaQuery.of(context).disableAnimations;
    final pending = widget.approvalCount > 0
        ? '${widget.approvalCount} à valider'
        : widget.missionCount > 0
            ? '${widget.missionCount} mission${widget.missionCount > 1 ? 's' : ''}'
            : null;

    return Container(
      padding: EdgeInsets.fromLTRB(16 * k, 16 * k, 16 * k, 14 * k),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFE6FAFA), Color(0xFFFFFFFF), Color(0xFFF3F1FF)],
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: const Color(0xFFD5EEF4)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0E7490).withValues(alpha: .14),
            blurRadius: 36,
            offset: const Offset(0, 18),
            spreadRadius: -20,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                button: true,
                label: 'Ouvrir $name, mon Avatar IA',
                child: GestureDetector(
                  onTap: widget.onAvatar,
                  child: AnimatedSlide(
                    offset: _leaving ? const Offset(-.25, -.45) : Offset.zero,
                    duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 520),
                    curve: Curves.easeInOutCubic,
                    child: AnimatedScale(
                      scale: _leaving ? .32 : 1,
                      duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 520),
                      curve: Curves.easeInOutCubic,
                      child: AnimatedOpacity(
                        opacity: _leaving ? .25 : 1,
                        duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 520),
                        child: LiveAvatarVisual(
                          preset: avatar.profile.preset,
                          expression: _expression,
                          size: avatarSize,
                          showStatusBadge: true,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              SizedBox(width: 12 * k),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Text(
                          name,
                          style: TextStyle(
                            color: WaouhPalette.ink,
                            fontSize: 32 * k,
                            height: 1,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1,
                          ),
                        ),
                        _Pill(
                          text: 'En ligne',
                          dot: const Color(0xFF10B981),
                          scale: k,
                        ),
                        if (pending != null)
                          GestureDetector(
                            onTap: widget.onMissions,
                            child: _Pill(text: pending, scale: k),
                          ),
                      ],
                    ),
                    SizedBox(height: 4 * k),
                    Text(
                      'Votre Avatar IA',
                      style: TextStyle(
                        color: WaouhPalette.muted,
                        fontSize: 12.5 * k,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 8 * k),
                    ConstrainedBox(
                      constraints: BoxConstraints(minHeight: 104 * k),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          for (var i = 0; i < math.min(_shown, _lines.length); i++)
                            _GreetingBubble(
                              key: ValueKey('greet_$i'),
                              text: _lines[i],
                              last: false,
                              scale: k,
                            ),
                          if (_shown > _lines.length)
                            _GreetingBubble(
                              key: const ValueKey('greet_question'),
                              text: liveBotQuestion,
                              last: true,
                              scale: k,
                            ),
                          if (_typing && _shown < _steps)
                            _TypingBubble(scale: k),
                          if (_shown >= _steps)
                            Wrap(
                              spacing: 6 * k,
                              runSpacing: 6 * k,
                              children: [
                                _ChoiceChip(label: 'Acheter', scale: k, onTap: () => _prompt('Je veux acheter ')),
                                _ChoiceChip(label: 'Vendre', scale: k, onTap: () => _prompt('Je veux vendre ')),
                                widget.missionCount + widget.approvalCount > 0
                                    ? _ChoiceChip(
                                        label: 'Voir mes missions',
                                        scale: k,
                                        onTap: () => _glideThen(widget.onMissions),
                                      )
                                    : _ChoiceChip(
                                        label: 'Trouver une opportunité',
                                        scale: k,
                                        onTap: () => _glideThen(widget.onFindOpportunity),
                                      ),
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
          SizedBox(height: 12 * k),
          Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            child: InkWell(
              onTap: () => _glideThen(widget.onAsk),
              borderRadius: BorderRadius.circular(18),
              child: Container(
                height: 50 * k,
                padding: EdgeInsets.only(left: 14 * k, right: 6 * k),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFD9E7F2)),
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.auto_awesome_rounded,
                      size: 18 * k,
                      color: const Color(0xFF0AAE9A),
                    ),
                    SizedBox(width: 10 * k),
                    Expanded(
                      child: Text(
                        'Demandez à $name…',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 14 * k,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Container(
                      width: 38 * k,
                      height: 38 * k,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [Color(0xFF14B8A6), Color(0xFF0891B2)],
                        ),
                      ),
                      child: Icon(
                        Icons.arrow_upward_rounded,
                        size: 19 * k,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SizedBox(height: 10 * k),
          Row(
            children: [
              Expanded(
                child: _HeroAction(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: 'Démarrer',
                  caption: 'avec $name',
                  primary: true,
                  scale: k,
                  onTap: () => _glideThen(widget.onAsk),
                ),
              ),
              SizedBox(width: 7 * k),
              Expanded(
                child: _HeroAction(
                  icon: Icons.travel_explore_rounded,
                  label: 'Trouver',
                  caption: 'une opportunité',
                  scale: k,
                  onTap: widget.onFindOpportunity,
                ),
              ),
              SizedBox(width: 7 * k),
              Expanded(
                child: _HeroAction(
                  icon: Icons.handshake_outlined,
                  label: 'Négocier',
                  caption: 'avec $name',
                  scale: k,
                  onTap: widget.onNegotiate,
                ),
              ),
            ],
          ),
          SizedBox(height: 10 * k),
          BotWorkingStrip(activeDeals: widget.activeDeals),
        ],
      ),
    );
  }
}

class _ChoiceChip extends StatelessWidget {
  const _ChoiceChip({required this.label, required this.scale, required this.onTap});

  final String label;
  final double scale;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: StadiumBorder(
          side: BorderSide(color: const Color(0xFF0F766E), width: 1.5 * scale.clamp(.9, 1.1).toDouble()),
        ),
        child: InkWell(
          onTap: onTap,
          customBorder: const StadiumBorder(),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 40),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 13 * scale, vertical: 8 * scale),
              child: Text(
                label,
                style: TextStyle(
                  color: const Color(0xFF115E59),
                  fontSize: 13 * scale,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ),
      );
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.scale, this.dot});

  final String text;
  final double scale;
  final Color? dot;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .9),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: const Color(0xFFD5F0E6)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (dot != null) ...[
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
              ),
              const SizedBox(width: 5),
            ],
            Text(
              text,
              style: TextStyle(
                color: dot != null ? const Color(0xFF047857) : WaouhPalette.blue,
                fontSize: 11 * scale,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      );
}

class _GreetingBubble extends StatelessWidget {
  const _GreetingBubble({
    super.key,
    required this.text,
    required this.last,
    required this.scale,
  });

  final String text;
  final bool last;
  final double scale;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: const Duration(milliseconds: 380),
        curve: Curves.easeOutCubic,
        builder: (_, t, child) => Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * 6),
            child: child,
          ),
        ),
        child: Container(
          margin: EdgeInsets.only(bottom: 5 * scale),
          padding: EdgeInsets.symmetric(
            horizontal: 11 * scale,
            vertical: 6 * scale,
          ),
          decoration: BoxDecoration(
            color: last ? const Color(0xFFFFF7E6) : Colors.white.withValues(alpha: .92),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(6),
              topRight: Radius.circular(16),
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            ),
            border: Border.all(
              color: last ? const Color(0xFFF59E0B) : const Color(0xFFE2E8F0),
            ),
          ),
          child: Text(
            text,
            style: TextStyle(
              color: last ? const Color(0xFF0A1226) : const Color(0xFF334155),
              fontSize: 13 * scale,
              height: 1.3,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      );
}

class _TypingBubble extends StatefulWidget {
  const _TypingBubble({required this.scale});
  final double scale;

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _dots = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void dispose() {
    _dots.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Bot écrit',
        child: Container(
          padding: EdgeInsets.symmetric(
            horizontal: 12 * widget.scale,
            vertical: 9 * widget.scale,
          ),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .92),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: AnimatedBuilder(
            animation: _dots,
            builder: (_, __) => Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < 3; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 1.5),
                    child: Opacity(
                      opacity: .3 +
                          .7 *
                              (0.5 +
                                  0.5 *
                                      math.sin(
                                        (_dots.value * 2 * math.pi) - i * .9,
                                      )),
                      child: Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: Color(0xFF0D9488),
                          shape: BoxShape.circle,
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

class _HeroAction extends StatelessWidget {
  const _HeroAction({
    required this.icon,
    required this.label,
    required this.caption,
    required this.scale,
    required this.onTap,
    this.primary = false,
  });

  final IconData icon;
  final String label;
  final String caption;
  final double scale;
  final VoidCallback onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(18),
          child: Ink(
            height: 62 * scale,
            decoration: BoxDecoration(
              gradient: primary
                  ? const LinearGradient(
                      colors: [Color(0xFF14B8A6), Color(0xFF0891B2)],
                    )
                  : null,
              color: primary ? null : Colors.white.withValues(alpha: .92),
              borderRadius: BorderRadius.circular(18),
              border: primary
                  ? null
                  : Border.all(color: const Color(0xFFE2EBF5)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  size: 19 * scale,
                  color: primary ? Colors.white : WaouhPalette.blue,
                ),
                SizedBox(height: 3 * scale),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: primary ? Colors.white : WaouhPalette.ink,
                    fontSize: 12 * scale,
                    height: 1.05,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  caption,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: primary
                        ? Colors.white.withValues(alpha: .8)
                        : WaouhPalette.muted,
                    fontSize: 10 * scale,
                    height: 1.1,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

/// « Bot travaille » : capacités réelles de WAOUH, une à la fois ; le seul
/// chiffre affiché est le nombre réel de Deal Rooms.
class BotWorkingStrip extends StatefulWidget {
  const BotWorkingStrip({super.key, required this.activeDeals});
  final int activeDeals;

  @override
  State<BotWorkingStrip> createState() => _BotWorkingStripState();
}

class _BotWorkingStripState extends State<BotWorkingStrip> {
  Timer? _timer;
  int _index = 0;

  List<(IconData, String)> get _signals => [
        (Icons.radar_rounded, 'NEXUS explore les annonces près de vous'),
        (Icons.auto_awesome_rounded, 'Signal Fabric classe les meilleures offres'),
        (Icons.verified_user_outlined, 'Contact protégé : vos numéros restent privés'),
        if (widget.activeDeals > 0)
          (
            Icons.handshake_outlined,
            '${widget.activeDeals} Deal Room${widget.activeDeals > 1 ? 's' : ''} '
                'suivie${widget.activeDeals > 1 ? 's' : ''} en direct',
          ),
      ];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(milliseconds: 3200), (_) {
      if (mounted) setState(() => _index++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final k = liveBotUiScale(context);
    final signals = _signals;
    final current = signals[_index % signals.length];
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12 * k, vertical: 9 * k),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFD1FAE5)),
      ),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: const BoxDecoration(
              color: Color(0xFF10B981),
              shape: BoxShape.circle,
            ),
          ),
          SizedBox(width: 8 * k),
          Text(
            'BOT TRAVAILLE',
            style: TextStyle(
              color: const Color(0xFF047857),
              fontSize: 10.5 * k,
              letterSpacing: .8,
              fontWeight: FontWeight.w900,
            ),
          ),
          SizedBox(width: 10 * k),
          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 420),
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(-.06, 0),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              ),
              child: Row(
                key: ValueKey(current.$2),
                children: [
                  Icon(current.$1, size: 16 * k, color: const Color(0xFF0891B2)),
                  SizedBox(width: 6 * k),
                  Expanded(
                    child: Text(
                      current.$2,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: const Color(0xFF475569),
                        fontSize: 12.5 * k,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// WAOUH One — le moteur commerce, en accès direct sous Bot.
class WaouhOneQuickCard extends StatelessWidget {
  const WaouhOneQuickCard({
    super.key,
    required this.onOpen,
    required this.onIntent,
  });

  final VoidCallback onOpen;
  final ValueChanged<String> onIntent;

  @override
  Widget build(BuildContext context) {
    final k = liveBotUiScale(context);
    const tiles = [
      (Icons.shopping_cart_outlined, 'Acheter', 'Je veux acheter ', Color(0xFF059669)),
      (Icons.sell_outlined, 'Vendre', 'Je vends : ', Color(0xFF2563EB)),
      (Icons.search_rounded, 'Chercher', 'Je cherche ', Color(0xFF7C3AED)),
      (Icons.compare_arrows_rounded, 'Comparer', 'Compare les meilleures options pour ', Color(0xFFD97706)),
    ];
    return Container(
      padding: EdgeInsets.all(14 * k),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFECFDF5), Colors.white, Color(0xFFECFEFF)],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD1FAE5)),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: onOpen,
            borderRadius: BorderRadius.circular(16),
            child: Row(
              children: [
                Container(
                  width: 44 * k,
                  height: 44 * k,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    Icons.shopping_bag_outlined,
                    color: Colors.white,
                    size: 23 * k,
                  ),
                ),
                SizedBox(width: 11 * k),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'WAOUH One',
                        style: TextStyle(
                          color: WaouhPalette.ink,
                          fontSize: 18 * k,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -.3,
                        ),
                      ),
                      Text(
                        'Achetez, vendez, comparez et négociez en confiance.',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: WaouhPalette.muted,
                          fontSize: 11.5 * k,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: WaouhPalette.muted),
              ],
            ),
          ),
          SizedBox(height: 12 * k),
          Row(
            children: [
              for (var i = 0; i < tiles.length; i++) ...[
                if (i > 0) SizedBox(width: 7 * k),
                Expanded(
                  child: Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      onTap: () => onIntent(tiles[i].$3),
                      borderRadius: BorderRadius.circular(16),
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 10 * k),
                        child: Column(
                          children: [
                            Container(
                              width: 34 * k,
                              height: 34 * k,
                              decoration: BoxDecoration(
                                color: tiles[i].$4.withValues(alpha: .10),
                                borderRadius: BorderRadius.circular(11),
                              ),
                              child: Icon(
                                tiles[i].$1,
                                size: 19 * k,
                                color: tiles[i].$4,
                              ),
                            ),
                            SizedBox(height: 5 * k),
                            Text(
                              tiles[i].$2,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: WaouhPalette.ink,
                                fontSize: 11.5 * k,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
