import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';

import 'live_avatar_controller.dart';

/// Ce que Bot exprime. Chaque expression correspond à un moment réel de WAOUH.
enum BotExpression { idle, hello, listen, talk, think, work, ask, win }

/// Portrait officiel de Bot (même image que le Web).
const botAvatarAsset = 'assets/bot/bot_avatar.png';

class _Spec {
  const _Spec(this.halo, this.tilt, this.label);
  final Color halo;
  final double tilt;
  final String label;
}

const _specs = <BotExpression, _Spec>{
  BotExpression.idle: _Spec(Color(0xFF14B8A6), 0, 'Bot, votre Avatar IA'),
  BotExpression.hello: _Spec(Color(0xFF34D399), -6, 'Bot vous salue'),
  BotExpression.listen: _Spec(Color(0xFF22D3EE), 6, 'Bot vous écoute'),
  BotExpression.talk: _Spec(Color(0xFF14B8A6), 0, 'Bot vous parle'),
  BotExpression.think: _Spec(Color(0xFF8B5CF6), -7, 'Bot réfléchit'),
  BotExpression.work: _Spec(Color(0xFF3B82F6), 0, 'Bot travaille pour vous'),
  BotExpression.ask: _Spec(Color(0xFFF59E0B), 8, 'Bot vous pose une question'),
  BotExpression.win: _Spec(Color(0xFFFBBF24), 0, 'Bot célèbre un accord'),
};

/// Libellé d'accessibilité d'une expression.
String botExpressionLabel(BotExpression expression) => _specs[expression]!.label;

/// Couleur du halo (état) d'une expression.
Color botExpressionColor(BotExpression expression) => _specs[expression]!.halo;

/// État de présence de l'avatar → expression de Bot.
BotExpression botExpressionForPresence(LiveAvatarPresenceState state) => switch (state) {
      LiveAvatarPresenceState.idle => BotExpression.idle,
      LiveAvatarPresenceState.listening => BotExpression.listen,
      LiveAvatarPresenceState.thinking => BotExpression.think,
      LiveAvatarPresenceState.searching => BotExpression.think,
      LiveAvatarPresenceState.comparing => BotExpression.think,
      LiveAvatarPresenceState.watching => BotExpression.think,
      LiveAvatarPresenceState.typing => BotExpression.talk,
      LiveAvatarPresenceState.found => BotExpression.talk,
      LiveAvatarPresenceState.waiting => BotExpression.ask,
      LiveAvatarPresenceState.negotiating => BotExpression.work,
      LiveAvatarPresenceState.done => BotExpression.win,
      LiveAvatarPresenceState.offline => BotExpression.idle,
    };

double _wave(double s, double period, [double delay = 0]) =>
    0.5 - 0.5 * math.cos(2 * math.pi * ((s + delay) / period));

/// Bot, le cœur de WAOUH : portrait animé (flotte, respire, incline la tête),
/// halo d'état et badge d'action selon ce qu'il fait. Purement visuel.
class BotCharacter extends StatefulWidget {
  const BotCharacter({
    super.key,
    this.expression = BotExpression.idle,
    this.size = 120,
    this.animated = true,
  });

  final BotExpression expression;
  final double size;
  final bool animated;

  @override
  State<BotCharacter> createState() => _BotCharacterState();
}

class _BotCharacterState extends State<BotCharacter> with SingleTickerProviderStateMixin {
  final ValueNotifier<double> _clock = ValueNotifier<double>(0);
  Ticker? _ticker;

  bool get _reduceMotion => MediaQuery.maybeOf(context)?.disableAnimations ?? false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncTicker();
  }

  @override
  void didUpdateWidget(covariant BotCharacter oldWidget) {
    super.didUpdateWidget(oldWidget);
    _syncTicker();
  }

  void _syncTicker() {
    final run = widget.animated && !_reduceMotion;
    if (run && _ticker == null) {
      _ticker = createTicker((elapsed) => _clock.value = elapsed.inMicroseconds / 1e6)..start();
    } else if (!run && _ticker != null) {
      _ticker!.dispose();
      _ticker = null;
      _clock.value = 0;
    }
  }

  @override
  void dispose() {
    _ticker?.dispose();
    _clock.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final spec = _specs[widget.expression]!;
    final size = widget.size;
    final badge = math.max(14.0, size * .34);
    return Semantics(
      label: spec.label,
      image: true,
      child: SizedBox(
        width: size,
        height: size,
        child: TweenAnimationBuilder<double>(
          tween: Tween(end: spec.tilt),
          duration: const Duration(milliseconds: 650),
          curve: Curves.easeOutBack,
          builder: (context, tilt, _) => TweenAnimationBuilder<Color?>(
            tween: ColorTween(end: spec.halo),
            duration: const Duration(milliseconds: 500),
            builder: (context, halo, _) => ValueListenableBuilder<double>(
              valueListenable: _clock,
              builder: (context, s, _) => _frame(s, tilt, halo ?? spec.halo, size, badge),
            ),
          ),
        ),
      ),
    );
  }

  Widget _frame(double s, double tilt, Color halo, double size, double badge) {
    final expression = widget.expression;
    final speaking = expression == BotExpression.talk || expression == BotExpression.hello;
    final faceScale = speaking ? 1 + .035 * _wave(s, .5) : 1 + .025 * _wave(s, 3.6);
    final ringTurn = s / (expression == BotExpression.work || expression == BotExpression.think ? 2.4 : 9);
    return Transform.translate(
      offset: Offset(0, -size * .04 * _wave(s, 3.6)),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          // Lueur d'état.
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: halo.withValues(alpha: .16 + .18 * _wave(s, 2.4)),
                  blurRadius: size * .16,
                  spreadRadius: size * .02,
                ),
              ],
            ),
          ),
          if (expression == BotExpression.listen)
            for (final delay in [0.0, .8])
              Builder(builder: (_) {
                final p = ((s + delay) % 1.6) / 1.6;
                return Transform.scale(
                  scale: 1 + .45 * p,
                  child: Container(
                    width: size,
                    height: size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: halo.withValues(alpha: .8 * (1 - p)), width: 2),
                    ),
                  ),
                );
              }),
          // Anneau d'état.
          Transform.rotate(
            angle: ringTurn * 2 * math.pi,
            child: CustomPaint(
              size: Size.square(size * 1.08),
              painter: _RingPainter(halo, math.max(2.0, size * .025)),
            ),
          ),
          // Portrait.
          Transform.rotate(
            angle: tilt * math.pi / 180,
            child: Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFEAF4FD),
                border: Border.all(color: Colors.white, width: math.max(1.5, size * .02)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0A1226).withValues(alpha: .25),
                    blurRadius: size * .12,
                    offset: Offset(0, size * .05),
                    spreadRadius: -size * .06,
                  ),
                ],
              ),
              child: ClipOval(
                child: Transform.scale(
                  scale: faceScale,
                  alignment: const Alignment(0, .4),
                  child: Image.asset(
                    botAvatarAsset,
                    fit: BoxFit.cover,
                    filterQuality: FilterQuality.medium,
                    gaplessPlayback: true,
                  ),
                ),
              ),
            ),
          ),
          ..._badges(expression, s, halo, size, badge),
        ],
      ),
    );
  }

  List<Widget> _badges(BotExpression expression, double s, Color halo, double size, double badge) {
    Widget disc(Widget child, {bool top = true, double angle = 0, double scale = 1}) => Positioned(
          right: -size * .06,
          top: top ? -size * .06 : null,
          bottom: top ? null : -size * .04,
          child: Transform.rotate(
            angle: angle,
            child: Transform.scale(
              scale: scale,
              child: Container(
                width: badge,
                height: badge,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: halo,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: math.max(1.5, badge * .07)),
                ),
                child: child,
              ),
            ),
          ),
        );
    final icon = badge * .56;
    switch (expression) {
      case BotExpression.talk:
        return [
          disc(
            top: false,
            Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (var i = 0; i < 3; i++) ...[
                  Container(
                    width: badge * .12,
                    height: badge * .46 * (.35 + .65 * _wave(s, .42, -i * .14)),
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(2)),
                  ),
                  if (i < 2) SizedBox(width: badge * .07),
                ],
              ],
            ),
          ),
        ];
      case BotExpression.think:
        return [
          disc(
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (var i = 0; i < 3; i++) ...[
                  Transform.translate(
                    offset: Offset(0, -badge * .1 * _wave(s, 1, -i * .15)),
                    child: Container(
                      width: badge * .15,
                      height: badge * .15,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: .4 + .6 * _wave(s, 1, -i * .15)),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                  if (i < 2) SizedBox(width: badge * .06),
                ],
              ],
            ),
          ),
        ];
      case BotExpression.work:
        return [disc(top: false, scale: .9 + .22 * _wave(s, 1.2), Icon(Icons.bolt_rounded, size: icon, color: Colors.white))];
      case BotExpression.ask:
        return [
          disc(
            angle: (-10 + 20 * _wave(s, 1.6)) * math.pi / 180,
            Icon(Icons.question_mark_rounded, size: icon, color: Colors.white),
          ),
        ];
      case BotExpression.hello:
        return [
          disc(
            angle: (10 - 32 * _wave(s, .9)) * math.pi / 180,
            Icon(Icons.waving_hand_rounded, size: icon, color: Colors.white),
          ),
        ];
      case BotExpression.listen:
        return [disc(top: false, Icon(Icons.mic_rounded, size: icon, color: Colors.white))];
      case BotExpression.win:
        const colors = [Color(0xFFF59E0B), Color(0xFF14B8A6), Color(0xFF8B5CF6), Color(0xFFF472B6)];
        return [
          for (var i = 0; i < 4; i++)
            Builder(builder: (_) {
              final p = (((s - i * .45) % 1.8) + 1.8) % 1.8 / 1.8;
              final opacity = p < .15 ? p / .15 : 1 - (p - .15) / .85;
              return Positioned(
                left: size * (.06 + .26 * i),
                top: -size * .08 + size * .9 * p * p,
                child: Opacity(
                  opacity: opacity.clamp(0.0, 1.0).toDouble(),
                  child: Transform.rotate(
                    angle: 3.8 * p * p,
                    child: Container(
                      width: size * .07,
                      height: size * .12,
                      decoration: BoxDecoration(color: colors[i], borderRadius: BorderRadius.circular(2)),
                    ),
                  ),
                ),
              );
            }),
          disc(scale: .9 + .22 * _wave(s, 1.2), Icon(Icons.star_rounded, size: icon, color: Colors.white)),
        ];
      case BotExpression.idle:
        return const [];
    }
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.color, this.width);
  final Color color;
  final double width;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..shader = SweepGradient(
        colors: [
          color,
          color.withValues(alpha: .15),
          color,
          color.withValues(alpha: .15),
          color,
        ],
      ).createShader(rect);
    canvas.drawCircle(rect.center, size.width / 2 - width / 2, paint);
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) => old.color != color || old.width != width;
}
