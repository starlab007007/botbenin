import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../domain/fa_web_models.dart';
import 'fa_web_generated_assets.dart';
import 'fa_web_theme.dart';

class FaWebBubble extends StatelessWidget {
  const FaWebBubble({
    super.key,
    required this.message,
  });

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

class FaWebTypingBubble extends StatelessWidget {
  const FaWebTypingBubble({super.key});

  @override
  Widget build(BuildContext context) {
    return const Align(
      alignment: Alignment.centerLeft,
      child: _TypingContainer(),
    );
  }
}

class _TypingContainer extends StatefulWidget {
  const _TypingContainer();

  @override
  State<_TypingContainer> createState() => _TypingContainerState();
}

class _TypingContainerState extends State<_TypingContainer>
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
  Widget build(BuildContext context) {
    return Container(
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
            builder: (_, __) {
              return Row(
                children: List.generate(3, (index) {
                  final phase = (_controller.value + index * 0.18) % 1;
                  final opacity =
                      0.25 + 0.75 * (0.5 + 0.5 * math.sin(phase * math.pi * 2));
                  return Container(
                    width: 7,
                    height: 7,
                    margin: const EdgeInsets.only(right: 5),
                    decoration: BoxDecoration(
                      color: FaWebColors.muted.withOpacity(opacity),
                      shape: BoxShape.circle,
                    ),
                  );
                }),
              );
            },
          ),
          const SizedBox(width: 7),
          const Text(
            'FA IA approfondit l’interprétation…',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class FaWebChainCard extends StatefulWidget {
  const FaWebChainCard({
    super.key,
    required this.faces,
    required this.phase,
    this.throwing = false,
    this.showTraits = false,
    this.height = 560,
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

  @override
  Widget build(BuildContext context) {
    const visualOrder = <int>[0, 4, 1, 5, 2, 6, 3, 7];
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: Container(
        height: widget.height,
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
                  builder: (_, __) {
                    return CustomPaint(
                      painter: _FaHaloPainter(_controller.value),
                    );
                  },
                ),
              ),
            if (widget.showHeader) ...[
              const Positioned(
                top: 16,
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
                top: 62,
                left: 25,
                right: 25,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 17,
                      vertical: 9,
                    ),
                    decoration: BoxDecoration(
                      color: FaWebColors.brown.withOpacity(0.78),
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
            ],
            Positioned(
              top: widget.showHeader ? 108 : 42,
              left: 28,
              right: 28,
              bottom: 22,
              child: GridView.builder(
                padding: EdgeInsets.zero,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 5,
                  crossAxisSpacing: 58,
                  childAspectRatio: 1.15,
                ),
                itemCount: 8,
                itemBuilder: (context, visualIndex) {
                  final dataIndex = visualOrder[visualIndex];
                  return AnimatedBuilder(
                    animation: _controller,
                    builder: (_, __) {
                      final phase = _controller.value * math.pi * 2;
                      final wave = math.sin(
                          phase * (1.1 + visualIndex * 0.07) + visualIndex);
                      final side = math.cos(phase * (0.8 + visualIndex * 0.04) +
                          visualIndex * 0.7);
                      final mixed =
                          ((_controller.value * 15).floor() + visualIndex)
                                  .isEven
                              ? FaWebFace.open
                              : FaWebFace.closed;
                      final face =
                          widget.throwing ? mixed : widget.faces[dataIndex];
                      return Transform.translate(
                        offset: widget.throwing
                            ? Offset(side * 18, wave * 17)
                            : Offset.zero,
                        child: Transform.rotate(
                          angle: widget.throwing ? wave * 0.62 : 0,
                          child: _CowrieSlot(
                            face: face,
                            trait: widget.showTraits
                                ? widget.faces[dataIndex].trait
                                : '',
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CowrieSlot extends StatelessWidget {
  const _CowrieSlot({required this.face, required this.trait});

  final FaWebFace face;
  final String trait;

  @override
  Widget build(BuildContext context) {
    final provider = face == FaWebFace.open
        ? FaWebGeneratedAssets.openCowrie
        : FaWebGeneratedAssets.closedCowrie;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 3,
          height: 25,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(3),
            gradient: const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFFBFB7AD), Color(0xFF6E665E)],
            ),
          ),
        ),
        Flexible(
          child: Image(
            image: provider,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
          ),
        ),
        SizedBox(
          height: 25,
          child: Text(
            trait,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 23,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
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
          FaWebColors.gold.withOpacity(0.20 * pulse),
          Colors.transparent,
        ],
      ).createShader(
        Rect.fromCircle(center: center, radius: size.shortestSide * 0.55),
      );
    canvas.drawCircle(center, size.shortestSide * 0.55, paint);

    final random = math.Random(52);
    final particle = Paint()..color = FaWebColors.gold2.withOpacity(0.38);
    for (var index = 0; index < 18; index++) {
      final baseX = random.nextDouble() * size.width;
      final baseY = random.nextDouble() * size.height;
      final y =
          (baseY - progress * (70 + random.nextDouble() * 130)) % size.height;
      canvas.drawCircle(
          Offset(baseX, y), 1 + random.nextDouble() * 1.4, particle);
    }
  }

  @override
  bool shouldRepaint(covariant _FaHaloPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
