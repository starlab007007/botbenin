// Ouverture de l'application : Bot se présente en trois écrans animés.
// Affichée une seule fois (voir LiveOnboardingGate), purement visuelle.
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'avatar/bot_character.dart' show botAvatarAsset;
import 'brand_mark.dart';

const liveOnboardingSeenKey = 'waouh.onboarding.v1';

const _ink = Color(0xFF10213D);
const _slate = Color(0xFF55688A);
const _blue = Color(0xFF4F7FFF);
const _cyan = Color(0xFF55DDF2);
const _violet = Color(0xFF8B7CFF);
const _jade = Color(0xFF19B6A4);
const _orange = Color(0xFFF4A340);
const _line = Color(0xFFE2EAF6);
const _dotOff = Color(0xFFCBD7EC);

const _bg = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(0xFFF8FBFF), Color(0xFFF2F7FF), Color(0xFFFBF8FF)],
);
const _cta = LinearGradient(
  begin: Alignment.topLeft,
  end: Alignment.bottomRight,
  colors: [Color(0xFF315BD8), Color(0xFF4F7FFF), Color(0xFF47A8E7)],
);

double _clamp01(double v) => v < 0 ? 0 : (v > 1 ? 1 : v);
double _smooth(double a, double b, double t) {
  final x = _clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
}

/// Affiche l'ouverture au premier lancement, puis mémorise qu'elle a été vue.
class LiveOnboardingGate extends StatefulWidget {
  const LiveOnboardingGate({super.key, required this.child});
  final Widget child;

  @override
  State<LiveOnboardingGate> createState() => _LiveOnboardingGateState();
}

class _LiveOnboardingGateState extends State<LiveOnboardingGate> {
  bool _show = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!(prefs.getBool(liveOnboardingSeenKey) ?? false) && mounted) {
        setState(() => _show = true);
      }
    } catch (_) {/* sans stockage, on n'affiche rien */}
  }

  Future<void> _finish() async {
    if (mounted) setState(() => _show = false);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(liveOnboardingSeenKey, true);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) => Stack(
        fit: StackFit.expand,
        children: [
          widget.child,
          if (_show)
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: LiveOnboarding(onDone: _finish),
              ),
            ),
        ],
      );
}

class LiveOnboarding extends StatefulWidget {
  const LiveOnboarding({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<LiveOnboarding> createState() => _LiveOnboardingState();
}

class _LiveOnboardingState extends State<LiveOnboarding> {
  final _pages = PageController();
  int _index = 0;
  static const _count = 3;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _next() {
    if (_index >= _count - 1) {
      widget.onDone();
      return;
    }
    _pages.nextPage(
        duration: const Duration(milliseconds: 380), curve: Curves.easeOutCubic);
  }

  @override
  Widget build(BuildContext context) {
    final last = _index == _count - 1;
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: _bg),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 12, 0),
              child: Row(
                children: [
                  const BrandMark(size: 38),
                  const Spacer(),
                  if (!last)
                    TextButton(
                      onPressed: widget.onDone,
                      style: TextButton.styleFrom(
                          minimumSize: const Size(64, 44),
                          foregroundColor: _slate),
                      child: const Text('Passer',
                          style: TextStyle(
                              fontWeight: FontWeight.w700, fontSize: 15)),
                    )
                  else
                    const SizedBox(height: 44),
                ],
              ),
            ),
            Expanded(
              child: PageView(
                controller: _pages,
                onPageChanged: (i) => setState(() => _index = i),
                children: const [_SlideBot(), _SlideNegotiate(), _SlideJourney()],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
              child: Row(
                children: [
                  Semantics(
                    label: 'Page ${_index + 1} sur $_count',
                    child: Row(
                      children: [
                        for (var i = 0; i < _count; i++)
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 300),
                            margin: const EdgeInsets.only(right: 6),
                            height: 8,
                            width: i == _index ? 28 : 8,
                            decoration: BoxDecoration(
                              color: i == _index ? _blue : _dotOff,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  _CtaButton(
                      label: last ? 'Commencer' : 'Suivant', onTap: _next),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CtaButton extends StatelessWidget {
  const _CtaButton({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: label,
        child: Container(
          decoration: BoxDecoration(
            gradient: _cta,
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                  color: const Color(0xFF315BD8).withValues(alpha: .35),
                  blurRadius: 24,
                  offset: const Offset(0, 12)),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: onTap,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 54, minWidth: 140),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    child: Text(label,
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 18)),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}

// --- animation -------------------------------------------------------------

/// Anime une valeur 0→1 (une fois, ou en boucle). Figée à l'état final si
/// l'utilisateur a réduit les animations.
class _Loop extends StatefulWidget {
  const _Loop({
    required this.seconds,
    required this.builder,
    this.once = false,
    this.delay = Duration.zero,
    this.rest = 0.75,
  });
  final double seconds;
  final bool once;
  final Duration delay;
  final double rest;
  final Widget Function(BuildContext context, double t) builder;

  @override
  State<_Loop> createState() => _LoopState();
}

class _LoopState extends State<_Loop> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
      vsync: this,
      duration: Duration(milliseconds: (widget.seconds * 1000).round()));
  Timer? _timer;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final off = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (off) {
      _timer?.cancel();
      _c.stop();
      _c.value = widget.once ? 1 : widget.rest;
      _started = true;
    } else if (!_started) {
      _started = true;
      _timer = Timer(widget.delay, () {
        if (!mounted) return;
        widget.once ? _c.forward() : _c.repeat();
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
      animation: _c, builder: (ctx, _) => widget.builder(ctx, _c.value));
}

/// Apparition en fondu avec une légère montée.
class _Reveal extends StatelessWidget {
  const _Reveal({required this.delayMs, required this.child});
  final int delayMs;
  final Widget child;

  @override
  Widget build(BuildContext context) => _Loop(
        seconds: .7,
        once: true,
        delay: Duration(milliseconds: delayMs),
        builder: (_, t) {
          final e = Curves.easeOutCubic.transform(t);
          return Opacity(
              opacity: e,
              child: Transform.translate(
                  offset: Offset(0, (1 - e) * 14), child: child));
        },
      );
}

// --- Bot -------------------------------------------------------------------

class _Bot extends StatelessWidget {
  const _Bot({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Bot, votre avatar',
        image: true,
        child: SizedBox(
          width: size,
          height: size,
          child: _Loop(
            seconds: 5.5,
            builder: (_, t) {
              final s = math.sin(t * 2 * math.pi);
              final pulse = (t * 2) % 1.0;
              return Stack(
                alignment: Alignment.center,
                clipBehavior: Clip.none,
                children: [
                  for (final (i, color) in [(0, _cyan), (1, _violet)])
                    Builder(builder: (_) {
                      final p = (pulse + i * .5) % 1.0;
                      return Opacity(
                        opacity: (1 - p) * .55,
                        child: Container(
                          width: size * (.85 + p * .5),
                          height: size * (.85 + p * .5),
                          decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: color, width: 2)),
                        ),
                      );
                    }),
                  Transform.translate(
                    offset: Offset(0, -6 * s),
                    child: Transform.rotate(
                      angle: .026 * s,
                      child: Container(
                        width: size,
                        height: size,
                        padding: EdgeInsets.all(size * .035),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [_cyan, _blue, _violet]),
                          boxShadow: [
                            BoxShadow(
                                color: _blue.withValues(alpha: .45),
                                blurRadius: 28,
                                offset: const Offset(0, 14)),
                          ],
                        ),
                        child: Container(
                          decoration: const BoxDecoration(
                              shape: BoxShape.circle, color: Colors.white),
                          padding: const EdgeInsets.all(3),
                          child: ClipOval(
                            child: Image.asset(botAvatarAsset,
                                fit: BoxFit.cover, excludeFromSemantics: true),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      );
}

class _SoundBars extends StatelessWidget {
  const _SoundBars();

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: _Loop(
          seconds: .9,
          builder: (_, t) => SizedBox(
            height: 18,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                for (var i = 0; i < 5; i++)
                  Container(
                    width: 4,
                    height: 18 *
                        (.25 +
                            .75 *
                                (.5 -
                                    .5 *
                                        math.cos(2 *
                                            math.pi *
                                            (t - i * .13)))),
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    decoration: BoxDecoration(
                        color: [_blue, _cyan, _violet, _cyan, _blue][i],
                        borderRadius: BorderRadius.circular(2)),
                  ),
              ],
            ),
          ),
        ),
      );
}

class _Speech extends StatelessWidget {
  const _Speech({required this.title, required this.body});
  final InlineSpan title;
  final String body;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 22),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: .94),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: _line),
          boxShadow: [
            BoxShadow(
                color: const Color(0xFF315BD8).withValues(alpha: .14),
                blurRadius: 36,
                offset: const Offset(0, 18)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _Reveal(
              delayMs: 500,
              child: Text.rich(title,
                  style: const TextStyle(
                      color: _ink,
                      fontSize: 26,
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -.4)),
            ),
            const SizedBox(height: 10),
            _Reveal(
              delayMs: 1400,
              child: Text(body,
                  style: const TextStyle(
                      color: _slate,
                      fontSize: 17,
                      height: 1.45,
                      fontWeight: FontWeight.w500)),
            ),
          ],
        ),
      );
}

// --- Slide 1 : Bot se présente ----------------------------------------------

class _SlideBot extends StatelessWidget {
  const _SlideBot();

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(24, 4, 24, 12),
        child: Column(
          children: [
            SizedBox(
              height: 270,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  const _Bot(size: 150),
                  _Orbit(icons: const [
                    (Icons.search_rounded, _blue),
                    (Icons.sell_outlined, _jade),
                    (Icons.notifications_none_rounded, _violet),
                  ]),
                ],
              ),
            ),
            const _SoundBars(),
            const SizedBox(height: 10),
            _Speech(
              title: const TextSpan(children: [
                TextSpan(text: 'Bonjour, je suis '),
                TextSpan(text: 'Bot', style: TextStyle(color: _blue)),
                TextSpan(text: '.'),
              ]),
              body:
                  'Votre avatar. Je cherche, je négocie et je conclus à votre place.',
            ),
            const SizedBox(height: 16),
            Row(
              children: const [
                Expanded(
                  child: _Reveal(
                    delayMs: 2500,
                    child: _IntentCard(
                        title: 'Acheter',
                        sub: 'Au meilleur prix',
                        bg: Color(0xFFEEF4FF),
                        border: Color(0xFFD9E6FF),
                        fg: Color(0xFF315BD8)),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: _Reveal(
                    delayMs: 3100,
                    child: _IntentCard(
                        title: 'Vendre',
                        sub: 'Photos et prix minimum',
                        bg: Color(0xFFEAFBF8),
                        border: Color(0xFFC7F0E9),
                        fg: Color(0xFF0E7F73)),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
}

class _IntentCard extends StatelessWidget {
  const _IntentCard(
      {required this.title,
      required this.sub,
      required this.bg,
      required this.border,
      required this.fg});
  final String title, sub;
  final Color bg, border, fg;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: border)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: TextStyle(
                    color: fg, fontSize: 16, fontWeight: FontWeight.w800)),
            const SizedBox(height: 2),
            Text(sub,
                style: const TextStyle(
                    color: _slate, fontSize: 13, fontWeight: FontWeight.w500)),
          ],
        ),
      );
}

class _Orbit extends StatelessWidget {
  const _Orbit({required this.icons});
  final List<(IconData, Color)> icons;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: SizedBox(
          width: 260,
          height: 260,
          child: _Loop(
            seconds: 18,
            builder: (_, t) => Stack(
              children: [
                for (var i = 0; i < icons.length; i++)
                  Positioned(
                    left: 130 +
                        122 * math.cos(t * 2 * math.pi + i * 2 * math.pi / 3 - math.pi / 2) -
                        22,
                    top: 130 +
                        122 * math.sin(t * 2 * math.pi + i * 2 * math.pi / 3 - math.pi / 2) -
                        22,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                              color: icons[i].$2.withValues(alpha: .35),
                              blurRadius: 18,
                              offset: const Offset(0, 8)),
                        ],
                      ),
                      child: Icon(icons[i].$1, color: icons[i].$2, size: 22),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
}

// --- Slide 2 : Bot négocie ---------------------------------------------------

class _SlideNegotiate extends StatelessWidget {
  const _SlideNegotiate();

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(24, 4, 24, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: const [
                _Bot(size: 88),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _SoundBars(),
                      SizedBox(height: 4),
                      Text('Bot · votre avatar',
                          style: TextStyle(
                              color: _blue,
                              fontWeight: FontWeight.w700,
                              fontSize: 15)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const _Speech(
              title: TextSpan(children: [
                TextSpan(text: 'Je négocie. '),
                TextSpan(text: 'Vous concluez.', style: TextStyle(color: _blue)),
              ]),
              body:
                  'Dites-moi votre prix. Je le défends et je vous préviens dès qu’une offre arrive.',
            ),
            const SizedBox(height: 16),
            const _Reveal(delayMs: 2000, child: _NegotiationCard()),
            const SizedBox(height: 12),
            const _Reveal(delayMs: 5800, child: _OfferNotification()),
          ],
        ),
      );
}

class _NegotiationCard extends StatelessWidget {
  const _NegotiationCard();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: _line),
          boxShadow: [
            BoxShadow(
                color: const Color(0xFF315BD8).withValues(alpha: .1),
                blurRadius: 30,
                offset: const Offset(0, 14)),
          ],
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                _Price(label: 'Votre offre', value: '245 000', color: Color(0xFF315BD8)),
                _Price(
                    label: 'Prix demandé',
                    value: '280 000',
                    color: _ink,
                    end: true),
              ],
            ),
            const SizedBox(height: 12),
            LayoutBuilder(builder: (context, c) {
              return _Loop(
                seconds: 4,
                once: true,
                delay: const Duration(milliseconds: 2400),
                builder: (_, t) {
                  final move = Curves.easeInOutCubic.transform(_clamp01(t / .62));
                  final win = _smooth(.6, .85, t);
                  final w = c.maxWidth;
                  final mid = (w - 28) / 2;
                  return SizedBox(
                    height: 36,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Positioned(
                          left: 14,
                          right: 14,
                          child: Container(
                              height: 4,
                              decoration: BoxDecoration(
                                  color: _line,
                                  borderRadius: BorderRadius.circular(2))),
                        ),
                        Positioned(
                          left: mid * move,
                          child: Container(
                            width: 28,
                            height: 28,
                            decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(colors: [_cyan, _blue])),
                          ),
                        ),
                        Positioned(
                          right: mid * move,
                          child: Container(
                              width: 28,
                              height: 28,
                              decoration: const BoxDecoration(
                                  shape: BoxShape.circle, color: _ink)),
                        ),
                        Opacity(
                          opacity: win,
                          child: Transform.scale(
                            scale: .4 + .6 * win,
                            child: Container(
                              width: 36,
                              height: 36,
                              decoration: const BoxDecoration(
                                  shape: BoxShape.circle, color: _jade),
                              child: const Icon(Icons.check_rounded,
                                  color: Colors.white, size: 22),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              );
            }),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Flexible(
                  child: Text('Exemple · FCFA',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          color: _slate,
                          fontSize: 12,
                          fontWeight: FontWeight.w500)),
                ),
                const SizedBox(width: 8),
                const Flexible(
                  child: _Reveal(
                    delayMs: 5000,
                    child: Text('Accord à 255 000',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                            color: Color(0xFF0E7F73),
                            fontSize: 14,
                            fontWeight: FontWeight.w800)),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
}

class _Price extends StatelessWidget {
  const _Price(
      {required this.label,
      required this.value,
      required this.color,
      this.end = false});
  final String label, value;
  final Color color;
  final bool end;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment:
            end ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  color: _slate, fontSize: 12, fontWeight: FontWeight.w600)),
          Text(value,
              style: TextStyle(
                  color: color, fontSize: 20, fontWeight: FontWeight.w800)),
        ],
      );
}

class _OfferNotification extends StatelessWidget {
  const _OfferNotification();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: _line),
        ),
        child: Row(
          children: [
            ClipOval(
              child: Image.asset(botAvatarAsset,
                  width: 36,
                  height: 36,
                  fit: BoxFit.cover,
                  excludeFromSemantics: true),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Nouvelle offre',
                      style: TextStyle(
                          color: _ink, fontWeight: FontWeight.w800, fontSize: 14)),
                  Text('iPhone 13 · 255 000 FCFA',
                      style: TextStyle(
                          color: _slate, fontSize: 13, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                  color: const Color(0xFFEEF4FF),
                  borderRadius: BorderRadius.circular(12)),
              child: const Text('Répondre',
                  style: TextStyle(
                      color: Color(0xFF315BD8),
                      fontWeight: FontWeight.w800,
                      fontSize: 13)),
            ),
          ],
        ),
      );
}

// --- Slide 3 : du besoin à l'accord -----------------------------------------

class _SlideJourney extends StatelessWidget {
  const _SlideJourney();

  static const _rows = <(String, String, IconData, Color)>[
    ('Vous dites', 'Je veux acheter ou vendre', Icons.chat_bubble_outline_rounded, _blue),
    ('Bot cherche', 'Annonces, vendeurs et acheteurs', Icons.search_rounded, Color(0xFF55A8E7)),
    ('Bot trouve', 'Les meilleures offres, triées pour vous', Icons.star_outline_rounded, _violet),
    ('Bot demande', 'Il contacte et négocie le prix', Icons.forum_outlined, _orange),
    ('Vous concluez', 'Vous validez l’accord, d’un geste', Icons.check_rounded, _jade),
  ];

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        physics: const ClampingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(24, 4, 24, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const _Bot(size: 64),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      _Reveal(
                        delayMs: 300,
                        child: Text.rich(
                          TextSpan(children: [
                            TextSpan(text: 'De votre envie '),
                            TextSpan(
                                text: 'à l’accord.',
                                style: TextStyle(color: _blue)),
                          ]),
                          style: TextStyle(
                              color: _ink,
                              fontSize: 25,
                              height: 1.12,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -.3),
                        ),
                      ),
                      SizedBox(height: 6),
                      _Reveal(
                        delayMs: 800,
                        child: Text('Bot s’occupe de chaque étape.',
                            style: TextStyle(
                                color: _slate,
                                fontSize: 14,
                                fontWeight: FontWeight.w500)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),
            _Loop(
              seconds: 12,
              builder: (_, t) {
                final fill = _clamp01(t / .68);
                final railOpacity = t < .68 ? 1.0 : 1 - _smooth(.68, .76, t);
                final dotOpacity = t < .03
                    ? t / .03
                    : (t <= .68 ? 1.0 : 1 - _smooth(.68, .74, t));
                return SizedBox(
                  height: 450,
                  child: Stack(
                    children: [
                      Positioned(
                        left: 23,
                        top: 45,
                        child: Container(
                            width: 4,
                            height: 360,
                            decoration: BoxDecoration(
                                color: _line,
                                borderRadius: BorderRadius.circular(2))),
                      ),
                      Positioned(
                        left: 23,
                        top: 45,
                        child: Opacity(
                          opacity: railOpacity,
                          child: Container(
                            width: 4,
                            height: 360 * fill,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(2),
                              gradient: const LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [_blue, _cyan, _violet, _jade]),
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 15,
                        top: 37 + 360 * fill,
                        child: Opacity(
                          opacity: dotOpacity,
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: _blue, width: 4),
                              boxShadow: [
                                BoxShadow(
                                    color: _blue.withValues(alpha: .35),
                                    blurRadius: 12,
                                    spreadRadius: 4),
                              ],
                            ),
                          ),
                        ),
                      ),
                      for (var k = 0; k < _rows.length; k++)
                        Positioned(
                          left: 0,
                          right: 0,
                          top: k * 90.0,
                          height: 90,
                          child: _JourneyRow(
                            data: _rows[k],
                            lit: _smooth(k * .17, k * .17 + .03, t) *
                                (1 - _smooth(.88, .96, t)),
                            last: k == _rows.length - 1,
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      );
}

class _JourneyRow extends StatelessWidget {
  const _JourneyRow({required this.data, required this.lit, required this.last});
  final (String, String, IconData, Color) data;
  final double lit;
  final bool last;

  @override
  Widget build(BuildContext context) => Opacity(
        opacity: .4 + .6 * lit,
        child: Transform.scale(
          scale: .97 + .03 * lit,
          alignment: Alignment.centerLeft,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: _line),
                  boxShadow: [
                    BoxShadow(
                        color: data.$4.withValues(alpha: .3),
                        blurRadius: 18,
                        offset: const Offset(0, 8)),
                  ],
                ),
                child: Icon(data.$3, color: data.$4, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(data.$1,
                          style: TextStyle(
                              color: last ? const Color(0xFF0E7F73) : _ink,
                              fontSize: 17,
                              fontWeight: FontWeight.w800)),
                      const SizedBox(height: 3),
                      Text(data.$2,
                          style: const TextStyle(
                              color: _slate,
                              fontSize: 14,
                              height: 1.35,
                              fontWeight: FontWeight.w500)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}
