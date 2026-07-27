import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../domain/fa_ia_models.dart';
import 'fa_ia_theme.dart';

class FaIaChainView extends StatelessWidget {
  const FaIaChainView({
    super.key,
    required this.faces,
    this.animation = 1,
    this.showTraits = true,
    this.height = 430,
    this.motionSeed = 7416,
    this.concealFinalFaces = false,
    this.revealAt = 0.90,
    this.showSideLabels = true,
  });

  final List<FaFaceState> faces;
  final double animation;
  final bool showTraits;
  final double height;
  final int motionSeed;
  final bool concealFinalFaces;
  final double revealAt;
  final bool showSideLabels;

  @override
  Widget build(BuildContext context) {
    final safeFaces = faces.length == 8
        ? faces
        : List<FaFaceState>.filled(8, FaFaceState.open);
    final progress = animation.clamp(0.0, 1.0).toDouble();
    final revealProgress = concealFinalFaces
        ? ((progress - revealAt) / math.max(0.001, 1 - revealAt))
              .clamp(0.0, 1.0)
              .toDouble()
        : 1.0;

    return SizedBox(
      height: height,
      width: double.infinity,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = Size(constraints.maxWidth, height);
          final shellSize = math.min(size.width * 0.20, 86.0);
          final leftX = size.width * 0.28;
          final rightX = size.width * 0.72;
          final topY = size.height * 0.18;
          final bottomY = size.height * 0.79;
          final rowGap = (bottomY - topY) / 3;

          return ClipRRect(
            borderRadius: BorderRadius.circular(30),
            child: Stack(
              fit: StackFit.expand,
              children: <Widget>[
                CustomPaint(
                  painter: _MysticBackdropPainter(
                    progress: progress,
                    motionSeed: motionSeed,
                  ),
                ),
                CustomPaint(
                  painter: _ChainPathPainter(
                    progress: progress,
                    motionSeed: motionSeed,
                  ),
                ),
                for (var index = 0; index < 8; index += 1)
                  _buildCowry(
                    index: index,
                    face: safeFaces[index],
                    size: size,
                    shellSize: shellSize,
                    leftX: leftX,
                    rightX: rightX,
                    topY: topY,
                    rowGap: rowGap,
                    progress: progress,
                    revealProgress: revealProgress,
                  ),
                if (showTraits && revealProgress > 0.82)
                  ..._buildTraits(
                    faces: safeFaces,
                    size: size,
                    shellSize: shellSize,
                    leftX: leftX,
                    rightX: rightX,
                    topY: topY,
                    rowGap: rowGap,
                    alpha: ((revealProgress - 0.82) / 0.18)
                        .clamp(0.0, 1.0)
                        .toDouble(),
                  ),
                Positioned(
                  top: 18,
                  left: 0,
                  right: 0,
                  child: Text(
                    'CHAÎNE DU FÂ',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: FaIaColors.ivory.withOpacity(0.92),
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2.2,
                      shadows: <Shadow>[
                        Shadow(
                          color: Colors.black.withOpacity(0.45),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                  ),
                ),
                if (concealFinalFaces && revealProgress < 0.82)
                  Positioned.fill(
                    child: IgnorePointer(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: RadialGradient(
                            center: Alignment.center,
                            radius: 0.78,
                            colors: <Color>[
                              Colors.transparent,
                              Colors.black.withOpacity(0.10),
                              Colors.black.withOpacity(0.28),
                            ],
                            stops: const <double>[0.0, 0.68, 1.0],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildCowry({
    required int index,
    required FaFaceState face,
    required Size size,
    required double shellSize,
    required double leftX,
    required double rightX,
    required double topY,
    required double rowGap,
    required double progress,
    required double revealProgress,
  }) {
    final isLeft = index < 4;
    final row = isLeft ? index : index - 4;
    final baseX = isLeft ? leftX : rightX;
    final baseY = topY + rowGap * row;
    final random = math.Random(motionSeed + (index + 1) * 104729);

    final phase = random.nextDouble() * math.pi * 2;
    final xFrequency = 7.4 + random.nextDouble() * 6.8;
    final yFrequency = 6.0 + random.nextDouble() * 7.0;
    final spinFrequency = 10.0 + random.nextDouble() * 12.0;
    final xAmplitude = 0.085 + random.nextDouble() * 0.075;
    final yAmplitude = 0.050 + random.nextDouble() * 0.075;
    final crossingDirection = isLeft ? 1.0 : -1.0;

    final launch = _smoothStep(0.0, 0.16, progress);
    final settle = 1 - _smoothStep(0.70, 0.985, progress);
    final chaos = launch * settle;
    final middlePulse = math.sin(math.pi * _window(progress, 0.12, 0.88));

    final orbitX =
        math.sin(progress * math.pi * xFrequency + phase) *
        size.width *
        xAmplitude *
        chaos;
    final orbitY =
        math.cos(progress * math.pi * yFrequency + phase * 1.47) *
        size.height *
        yAmplitude *
        chaos;
    final crossX =
        crossingDirection *
        math.sin(
          progress * math.pi * (2.2 + random.nextDouble() * 1.8) + phase,
        ) *
        size.width *
        (0.08 + random.nextDouble() * 0.06) *
        middlePulse *
        settle;
    final verticalSweep =
        math.sin(
          progress * math.pi * (3.0 + random.nextDouble() * 2.6) + phase * 0.8,
        ) *
        size.height *
        0.035 *
        middlePulse *
        settle;
    final finalBounce =
        math.sin(progress * math.pi * 8 + phase) *
        size.height *
        0.012 *
        (1 - _smoothStep(0.82, 1.0, progress));

    final rotation =
        (isLeft ? -0.08 : 0.08) +
        math.sin(progress * math.pi * spinFrequency + phase) *
            (1.8 + random.nextDouble() * 2.4) *
            chaos +
        math.sin(progress * math.pi * 3 + phase) * 0.20 * settle;

    final flickerCycle = (progress * (28 + random.nextInt(18)) + index * 0.73)
        .floor();
    final temporaryFace = flickerCycle.isEven
        ? FaFaceState.open
        : FaFaceState.closed;
    final visibleFace = concealFinalFaces && revealProgress < 0.82
        ? temporaryFace
        : face;
    final asset = visibleFace == FaFaceState.open
        ? 'assets/fa_ia/cowrie_open_real.png'
        : 'assets/fa_ia/cowrie_closed_real.png';

    final flip = concealFinalFaces && revealProgress < 0.82
        ? 0.30 +
              0.70 *
                  math.max(
                    0.08,
                    math.cos(progress * math.pi * (20 + index) + phase).abs(),
                  )
        : 1.0;
    final revealScale = 0.88 + 0.12 * revealProgress;
    final danceScale =
        1 + math.sin(progress * math.pi * (9 + index) + phase) * 0.12 * chaos;

    final x = baseX + orbitX + crossX;
    final y = baseY + orbitY + verticalSweep + finalBounce;

    return Positioned(
      left: x - shellSize / 2,
      top: y - shellSize / 2,
      width: shellSize,
      height: shellSize,
      child: Transform.rotate(
        angle: rotation,
        child: Transform.scale(
          scaleX: flip,
          scaleY: danceScale * revealScale,
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 180),
            opacity: concealFinalFaces && revealProgress < 0.04 ? 0.90 : 1,
            child: DecoratedBox(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: <BoxShadow>[
                  BoxShadow(
                    color: const Color(
                      0xFFD8A451,
                    ).withOpacity(0.20 + chaos * 0.24 + revealProgress * 0.14),
                    blurRadius: 24 + chaos * 34,
                    spreadRadius: 1 + chaos * 2,
                  ),
                  BoxShadow(
                    color: Colors.black.withOpacity(0.36),
                    blurRadius: 18,
                    offset: const Offset(0, 9),
                  ),
                ],
              ),
              child: Image.asset(
                asset,
                fit: BoxFit.contain,
                filterQuality: FilterQuality.high,
                errorBuilder: (_, __, ___) => const Icon(
                  Icons.blur_circular_rounded,
                  color: FaIaColors.ivory,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildTraits({
    required List<FaFaceState> faces,
    required Size size,
    required double shellSize,
    required double leftX,
    required double rightX,
    required double topY,
    required double rowGap,
    required double alpha,
  }) {
    final widgets = <Widget>[];
    for (var row = 0; row < 4; row += 1) {
      widgets.addAll(<Widget>[
        _trait(
          x: leftX,
          y: topY + rowGap * row + shellSize * 0.62,
          symbol: faces[row].trait.symbol,
          alpha: alpha,
        ),
        _trait(
          x: rightX,
          y: topY + rowGap * row + shellSize * 0.62,
          symbol: faces[row + 4].trait.symbol,
          alpha: alpha,
        ),
      ]);
    }
    if (showSideLabels) {
      widgets.addAll(<Widget>[
        Positioned(
          left: leftX - 58,
          bottom: 12,
          width: 116,
          child: Opacity(
            opacity: alpha,
            child: const Text(
              'COLONNE A',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: FaIaColors.ivory,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
              ),
            ),
          ),
        ),
        Positioned(
          left: rightX - 58,
          bottom: 12,
          width: 116,
          child: Opacity(
            opacity: alpha,
            child: const Text(
              'COLONNE B',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: FaIaColors.ivory,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.2,
              ),
            ),
          ),
        ),
      ]);
    }
    return widgets;
  }

  Widget _trait({
    required double x,
    required double y,
    required String symbol,
    required double alpha,
  }) => Positioned(
    left: x - 28,
    top: y - 13,
    width: 56,
    child: Opacity(
      opacity: alpha,
      child: Text(
        symbol,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w900,
          shadows: <Shadow>[
            Shadow(color: Colors.black.withOpacity(0.65), blurRadius: 8),
          ],
        ),
      ),
    ),
  );

  static double _smoothStep(double edge0, double edge1, double value) {
    if (edge0 == edge1) return value < edge0 ? 0 : 1;
    final t = ((value - edge0) / (edge1 - edge0)).clamp(0.0, 1.0).toDouble();
    return t * t * (3 - 2 * t);
  }

  static double _window(double value, double start, double end) =>
      ((value - start) / math.max(0.001, end - start))
          .clamp(0.0, 1.0)
          .toDouble();
}

class _ChainPathPainter extends CustomPainter {
  const _ChainPathPainter({required this.progress, required this.motionSeed});

  final double progress;
  final int motionSeed;

  @override
  void paint(Canvas canvas, Size size) {
    final leftX = size.width * 0.28;
    final rightX = size.width * 0.72;
    final topY = size.height * 0.18;
    final bottomY = size.height * 0.80;
    final shimmer = 0.62 + math.sin(progress * math.pi * 5) * 0.12;
    final random = math.Random(motionSeed);
    final sway =
        math.sin(progress * math.pi * (3.2 + random.nextDouble())) *
        size.width *
        0.025 *
        (1 - FaIaChainView._smoothStep(0.72, 1, progress));

    final shadowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7
      ..strokeCap = StrokeCap.round
      ..color = Colors.black.withOpacity(0.28);
    final chainPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.2
      ..strokeCap = StrokeCap.round
      ..shader = LinearGradient(
        colors: <Color>[
          const Color(0xFF5F5D5B),
          Color.lerp(const Color(0xFF938E89), Colors.white, shimmer)!,
          const Color(0xFF4C4947),
        ],
      ).createShader(Offset.zero & size);

    final top = Path()
      ..moveTo(leftX + sway, topY)
      ..cubicTo(
        leftX - size.width * 0.03 + sway,
        size.height * 0.035,
        rightX + size.width * 0.03 + sway,
        size.height * 0.035,
        rightX + sway,
        topY,
      );
    final left = Path()
      ..moveTo(leftX + sway, topY)
      ..cubicTo(
        leftX - sway * 0.8,
        size.height * 0.42,
        leftX + sway * 0.4,
        size.height * 0.62,
        leftX,
        bottomY,
      );
    final right = Path()
      ..moveTo(rightX + sway, topY)
      ..cubicTo(
        rightX - sway * 0.4,
        size.height * 0.42,
        rightX + sway * 0.8,
        size.height * 0.62,
        rightX,
        bottomY,
      );

    for (final path in <Path>[top, left, right]) {
      canvas.drawPath(path, shadowPaint);
      canvas.drawPath(path, chainPaint);
      _drawLinks(canvas, path, size);
    }
  }

  void _drawLinks(Canvas canvas, Path path, Size size) {
    final metrics = path.computeMetrics().toList();
    if (metrics.isEmpty) return;
    final metric = metrics.first;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = const Color(0xFFD4D0CB).withOpacity(0.76);
    final step = math.max(12.0, size.width * 0.035).toDouble();
    for (double distance = step; distance < metric.length; distance += step) {
      final tangent = metric.getTangentForOffset(distance);
      if (tangent == null) continue;
      canvas.save();
      canvas.translate(tangent.position.dx, tangent.position.dy);
      canvas.rotate(tangent.angle + 0.22);
      canvas.drawOval(
        Rect.fromCenter(
          center: Offset.zero,
          width: size.width * 0.030,
          height: size.width * 0.015,
        ),
        paint,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant _ChainPathPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.motionSeed != motionSeed;
}

class _MysticBackdropPainter extends CustomPainter {
  const _MysticBackdropPainter({
    required this.progress,
    required this.motionSeed,
  });

  final double progress;
  final int motionSeed;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final background = Paint()
      ..shader = const RadialGradient(
        center: Alignment(0, -0.20),
        radius: 1.15,
        colors: <Color>[
          Color(0xFF4B2815),
          Color(0xFF24130B),
          Color(0xFF120A06),
        ],
        stops: <double>[0, 0.55, 1],
      ).createShader(rect);
    canvas.drawRect(rect, background);

    final pulse =
        0.28 +
        math.sin(progress * math.pi * 5) * 0.09 +
        math.sin(progress * math.pi * 13) * 0.035;
    final aura = Paint()
      ..shader =
          RadialGradient(
            colors: <Color>[
              const Color(
                0xFFD8A451,
              ).withOpacity(pulse.clamp(0.08, 0.48).toDouble()),
              const Color(0xFFB96E2E).withOpacity(0.08),
              Colors.transparent,
            ],
          ).createShader(
            Rect.fromCircle(
              center: Offset(size.width / 2, size.height * 0.46),
              radius: size.width * 0.52,
            ),
          );
    canvas.drawCircle(
      Offset(size.width / 2, size.height * 0.46),
      size.width * 0.52,
      aura,
    );

    final random = math.Random(motionSeed ^ 0x6F41A);
    for (var index = 0; index < 46; index += 1) {
      final baseX = random.nextDouble() * size.width;
      final baseY = random.nextDouble() * size.height;
      final drift = 5 + random.nextDouble() * 18;
      final x =
          baseX +
          math.sin(progress * math.pi * (2 + random.nextDouble() * 4) + index) *
              drift;
      final y = baseY - progress * (8 + random.nextDouble() * 24);
      final wave = (math.sin(progress * math.pi * 10 + index) + 1) / 2;
      final alpha = 0.035 + wave * 0.20;
      final radius = 0.7 + random.nextDouble() * 2.1;
      canvas.drawCircle(
        Offset(x, y),
        radius,
        Paint()..color = FaIaColors.gold.withOpacity(alpha),
      );
    }

    final vignette = Paint()
      ..shader = RadialGradient(
        radius: 0.78,
        colors: <Color>[Colors.transparent, Colors.black.withOpacity(0.48)],
      ).createShader(rect);
    canvas.drawRect(rect, vignette);
  }

  @override
  bool shouldRepaint(covariant _MysticBackdropPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.motionSeed != motionSeed;
}
