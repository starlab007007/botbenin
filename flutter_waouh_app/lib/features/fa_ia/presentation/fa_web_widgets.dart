import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../domain/fa_web_models.dart';
import 'fa_web_generated_assets.dart';
import 'fa_web_theme.dart';

class FaWebBubble extends StatelessWidget {
  const FaWebBubble({super.key, required this.message});

  final FaWebChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.isUser;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.86,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 17, vertical: 14),
        decoration: BoxDecoration(
          color: isUser
              ? FaWebColors.brown
              : message.error
                  ? const Color(0xFFFFF4F2)
                  : Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(27),
            topRight: const Radius.circular(27),
            bottomLeft: Radius.circular(isUser ? 27 : 8),
            bottomRight: Radius.circular(isUser ? 8 : 27),
          ),
          border: Border.all(
            color: message.error
                ? const Color(0xFFE0A29B)
                : isUser
                    ? FaWebColors.brown
                    : FaWebColors.line,
          ),
          boxShadow: const [
            BoxShadow(
              blurRadius: 16,
              offset: Offset(0, 6),
              color: Color(0x0A28180E),
            ),
          ],
        ),
        child: Text.rich(
          TextSpan(
            children: [
              if (!isUser)
                const TextSpan(
                  text: '✦  ',
                  style: TextStyle(
                    color: Color(0xFFB27B35),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              TextSpan(text: message.text),
            ],
          ),
          style: TextStyle(
            color: isUser ? Colors.white : FaWebColors.ink,
            fontSize: 16.5,
            height: 1.38,
            fontWeight: isUser ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class FaWebTypingBubble extends StatefulWidget {
  const FaWebTypingBubble({super.key});

  @override
  State<FaWebTypingBubble> createState() => _FaWebTypingBubbleState();
}

class _FaWebTypingBubbleState extends State<FaWebTypingBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 900),
  )..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.centerLeft,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 17, vertical: 15),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(color: FaWebColors.line),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(22),
              topRight: Radius.circular(22),
              bottomRight: Radius.circular(22),
              bottomLeft: Radius.circular(8),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _controller,
                builder: (_, __) => Row(
                  children: List.generate(3, (index) {
                    final phase = (_controller.value + index * 0.18) % 1;
                    final opacity = 0.25 +
                        0.75 * (0.5 + 0.5 * math.sin(phase * math.pi * 2));
                    return Container(
                      width: 7,
                      height: 7,
                      margin: const EdgeInsets.only(right: 5),
                      decoration: BoxDecoration(
                        color: FaWebColors.muted.withValues(alpha: opacity),
                        shape: BoxShape.circle,
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(width: 7),
              const Flexible(
                child: Text(
                  'FA IA approfondit l’interprétation…',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      );
}

/// Chaîne complète : huit cauris visibles, quatre positions par colonne.
///
/// Le composant n'utilise plus une GridView imbriquée à ratio fixe. Les quatre
/// lignes reçoivent chacune exactement un quart de la hauteur disponible, ce
/// qui empêche le dernier cauri et son signe I/II d'être rognés sur téléphone.
class FaWebChainCard extends StatefulWidget {
  const FaWebChainCard({
    super.key,
    required this.faces,
    required this.phase,
    this.throwing = false,
    this.showTraits = false,
    this.height = 640,
    this.showHeader = true,
  });

  final List<FaWebFace> faces;
  final String phase;
  final bool throwing;
  final bool showTraits;
  final double height;
  final bool showHeader;

  @override
  State<FaWebChainCard> createState() => _FaWebChainCardState();
}

class _FaWebChainCardState extends State<FaWebChainCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 2500),
  );

  @override
  void initState() {
    super.initState();
    _sync();
  }

  @override
  void didUpdateWidget(covariant FaWebChainCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.throwing != widget.throwing) _sync();
  }

  void _sync() {
    if (widget.throwing) {
      _controller.repeat();
    } else {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  List<FaWebFace> get _safeFaces {
    if (widget.faces.length == 8) return widget.faces;
    return List<FaWebFace>.generate(
      8,
      (index) =>
          index < widget.faces.length ? widget.faces[index] : FaWebFace.open,
      growable: false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final faces = _safeFaces;
    final headerHeight = widget.showHeader ? 116.0 : 20.0;
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: SizedBox(
        height: widget.height.clamp(560.0, 780.0).toDouble(),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: const Color(0xFF170B06),
            image: DecorationImage(
              image: FaWebGeneratedAssets.chain,
              fit: BoxFit.cover,
              opacity: 0.30,
            ),
          ),
          child: Stack(
            children: [
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0x24000000),
                        Color(0x50170B06),
                        Color(0xC6170B06),
                      ],
                    ),
                  ),
                ),
              ),
              if (widget.throwing)
                Positioned.fill(
                  child: AnimatedBuilder(
                    animation: _controller,
                    builder: (_, __) => CustomPaint(
                      painter: _FaHaloPainter(_controller.value),
                    ),
                  ),
                ),
              if (widget.showHeader) ...[
                const Positioned(
                  top: 14,
                  left: 0,
                  right: 0,
                  child: Text(
                    'CHAÎNE DU FÂ',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      letterSpacing: 4,
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                    ),
                  ),
                ),
                Positioned(
                  top: 48,
                  left: 24,
                  right: 24,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 17,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: FaWebColors.brown.withValues(alpha: 0.82),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        widget.phase,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ),
                const Positioned(
                  top: 88,
                  left: 36,
                  right: 36,
                  child: Row(
                    children: [
                      Expanded(child: _ColumnLabel(label: 'A')),
                      SizedBox(width: 28),
                      Expanded(child: _ColumnLabel(label: 'B')),
                    ],
                  ),
                ),
              ],
              Positioned(
                top: headerHeight,
                left: 18,
                right: 18,
                bottom: 16,
                child: Column(
                  children: List.generate(4, (row) {
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Row(
                          children: [
                            Expanded(
                              child: _AnimatedCowrieSlot(
                                dataIndex: row,
                                visualIndex: row * 2,
                                face: faces[row],
                                throwing: widget.throwing,
                                showTrait: widget.showTraits,
                                controller: _controller,
                              ),
                            ),
                            const SizedBox(width: 28),
                            Expanded(
                              child: _AnimatedCowrieSlot(
                                dataIndex: row + 4,
                                visualIndex: row * 2 + 1,
                                face: faces[row + 4],
                                throwing: widget.throwing,
                                showTrait: widget.showTraits,
                                controller: _controller,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ColumnLabel extends StatelessWidget {
  const _ColumnLabel({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) => Text(
        label,
        textAlign: TextAlign.center,
        style: const TextStyle(
          color: Color(0xFFE5BD6A),
          fontWeight: FontWeight.w900,
          fontSize: 14,
          letterSpacing: 2,
        ),
      );
}

class _AnimatedCowrieSlot extends StatelessWidget {
  const _AnimatedCowrieSlot({
    required this.dataIndex,
    required this.visualIndex,
    required this.face,
    required this.throwing,
    required this.showTrait,
    required this.controller,
  });

  final int dataIndex;
  final int visualIndex;
  final FaWebFace face;
  final bool throwing;
  final bool showTrait;
  final AnimationController controller;

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: controller,
        builder: (_, __) {
          final phase = controller.value * math.pi * 2;
          final wave = math.sin(
            phase * (1.1 + visualIndex * 0.07) + visualIndex,
          );
          final side = math.cos(
            phase * (0.8 + visualIndex * 0.04) + visualIndex * 0.7,
          );
          final mixed = ((controller.value * 15).floor() + visualIndex).isEven
              ? FaWebFace.open
              : FaWebFace.closed;
          final displayedFace = throwing ? mixed : face;
          return Transform.translate(
            offset: throwing ? Offset(side * 12, wave * 10) : Offset.zero,
            child: Transform.rotate(
              angle: throwing ? wave * 0.42 : 0,
              child: _CowrieSlot(
                dataIndex: dataIndex,
                face: displayedFace,
                trait: showTrait ? face.trait : '',
              ),
            ),
          );
        },
      );
}

class _CowrieSlot extends StatelessWidget {
  const _CowrieSlot({
    required this.dataIndex,
    required this.face,
    required this.trait,
  });

  final int dataIndex;
  final FaWebFace face;
  final String trait;

  @override
  Widget build(BuildContext context) {
    final provider = face == FaWebFace.open
        ? FaWebGeneratedAssets.openCowrie
        : FaWebGeneratedAssets.closedCowrie;
    return Container(
      key: ValueKey<String>('fa-cowrie-$dataIndex'),
      margin: const EdgeInsets.symmetric(horizontal: 2),
      padding: const EdgeInsets.fromLTRB(5, 2, 5, 3),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.10)),
      ),
      child: Column(
        children: [
          Container(
            width: 3,
            height: 12,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(3),
              gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0xFFBFB7AD), Color(0xFF6E665E)],
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 1),
              child: Image(
                image: provider,
                fit: BoxFit.contain,
                filterQuality: FilterQuality.high,
                gaplessPlayback: true,
              ),
            ),
          ),
          SizedBox(
            height: 26,
            child: Center(
              child: Text(
                trait,
                key: ValueKey<String>('fa-trait-$dataIndex'),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 21,
                  height: 1,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FaHaloPainter extends CustomPainter {
  _FaHaloPainter(this.progress);

  final double progress;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final pulse = 0.55 + 0.18 * math.sin(progress * math.pi * 2);
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          FaWebColors.gold.withValues(alpha: 0.20 * pulse),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(center: center, radius: size.shortestSide * 0.55),
      );
    canvas.drawCircle(center, size.shortestSide * 0.55, paint);
  }

  @override
  bool shouldRepaint(covariant _FaHaloPainter oldDelegate) =>
      oldDelegate.progress != progress;
}
