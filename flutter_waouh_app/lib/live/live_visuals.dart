// Reusable visual primitives for the WAOUH Flutter app. These replace ad-hoc
// widgets scattered across screens (raw OutlinedButton.icon for Google,
// inline empty states, etc.) with a single, consistent, on-brand version.
import 'package:flutter/material.dart';

import 'live_theme.dart';

/// The real multi-color Google "G" mark, drawn as SVG-equivalent paths so the
/// sign-in button reads as authentic rather than a generic Material icon.
class GoogleMark extends StatelessWidget {
  const GoogleMark({super.key, this.size = 20});
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _GoogleMarkPainter()),
    );
  }
}

class _GoogleMarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 18;
    final paint = Paint()..style = PaintingStyle.fill;

    paint.color = const Color(0xFF4285F4);
    canvas.drawPath(
      Path()
        ..moveTo(17.64 * s, 9.2045 * s)
        ..cubicTo(17.64 * s, 8.5664 * s, 17.5827 * s, 7.9527 * s, 17.4764 * s, 7.3636 * s)
        ..lineTo(9 * s, 7.3636 * s)
        ..lineTo(9 * s, 10.845 * s)
        ..lineTo(13.8436 * s, 10.845 * s)
        ..cubicTo(13.635 * s, 11.97 * s, 13.0009 * s, 12.9231 * s, 12.0477 * s, 13.5613 * s)
        ..lineTo(12.0477 * s, 15.8195 * s)
        ..lineTo(14.9564 * s, 15.8195 * s)
        ..cubicTo(16.6582 * s, 14.2527 * s, 17.64 * s, 11.9454 * s, 17.64 * s, 9.2045 * s)
        ..close(),
      paint,
    );

    paint.color = const Color(0xFF34A853);
    canvas.drawPath(
      Path()
        ..moveTo(9 * s, 18 * s)
        ..cubicTo(11.43 * s, 18 * s, 13.4673 * s, 17.1941 * s, 14.9564 * s, 15.8195 * s)
        ..lineTo(12.0477 * s, 13.5613 * s)
        ..cubicTo(11.2418 * s, 14.1013 * s, 10.2109 * s, 14.4204 * s, 9 * s, 14.4204 * s)
        ..cubicTo(6.6554 * s, 14.4204 * s, 4.6718 * s, 12.8372 * s, 3.9641 * s, 10.71 * s)
        ..lineTo(0.9573 * s, 10.71 * s)
        ..lineTo(0.9573 * s, 13.0418 * s)
        ..cubicTo(2.4382 * s, 15.9831 * s, 5.4818 * s, 18 * s, 9 * s, 18 * s)
        ..close(),
      paint,
    );

    paint.color = const Color(0xFFFBBC05);
    canvas.drawPath(
      Path()
        ..moveTo(3.9641 * s, 10.71 * s)
        ..cubicTo(3.7841 * s, 10.17 * s, 3.6818 * s, 9.5932 * s, 3.6818 * s, 9 * s)
        ..cubicTo(3.6818 * s, 8.4068 * s, 3.7841 * s, 7.83 * s, 3.9641 * s, 7.29 * s)
        ..lineTo(3.9641 * s, 4.9582 * s)
        ..lineTo(0.9573 * s, 4.9582 * s)
        ..cubicTo(0.3477 * s, 6.1732 * s, 0 * s, 7.5477 * s, 0 * s, 9 * s)
        ..cubicTo(0 * s, 10.4523 * s, 0.3477 * s, 11.8268 * s, 0.9573 * s, 13.0418 * s)
        ..lineTo(3.9641 * s, 10.71 * s)
        ..close(),
      paint,
    );

    paint.color = const Color(0xFFEA4335);
    canvas.drawPath(
      Path()
        ..moveTo(9 * s, 3.5795 * s)
        ..cubicTo(10.3214 * s, 3.5795 * s, 11.5077 * s, 4.0336 * s, 12.4405 * s, 4.9255 * s)
        ..lineTo(15.0218 * s, 2.3441 * s)
        ..cubicTo(13.4632 * s, 0.8918 * s, 11.4259 * s, 0 * s, 9 * s, 0 * s)
        ..cubicTo(5.4818 * s, 0 * s, 2.4382 * s, 2.0168 * s, 0.9573 * s, 4.9582 * s)
        ..lineTo(3.9641 * s, 7.29 * s)
        ..cubicTo(4.6718 * s, 5.1627 * s, 6.6554 * s, 3.5795 * s, 9 * s, 3.5795 * s)
        ..close(),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// A neutral, full-width social sign-in button with consistent height/radius
/// matching the rest of the form controls (52px, 16px radius).
class SocialSignInButton extends StatelessWidget {
  const SocialSignInButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.loading = false,
  });

  final String label;
  final Widget icon;
  final VoidCallback? onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: OutlinedButton(
        onPressed: loading ? null : onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          side: const BorderSide(color: WaouhPalette.line),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(WaouhRadius.control),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (loading)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2.2),
              )
            else
              icon,
            const SizedBox(width: 12),
            Text(
              label,
              style: WaouhText.bodyStrong.copyWith(color: WaouhPalette.ink),
            ),
          ],
        ),
      ),
    );
  }
}

/// A small "eyebrow" section label used above lists (e.g. "CONVERSATIONS
/// PRODUIT"). Centralized so spacing/weight never drift between screens.
class SectionEyebrow extends StatelessWidget {
  const SectionEyebrow({super.key, required this.label, this.trailing});
  final String label;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: WaouhSpace.sm),
      child: Row(
        children: [
          Expanded(child: Text(label.toUpperCase(), style: WaouhText.eyebrow)),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// A friendly, illustrated empty state. Copy is an invitation to act, never a
/// dead end — every empty state carries a primary action when one exists.
class WaouhEmptyPanel extends StatelessWidget {
  const WaouhEmptyPanel({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
    this.tint = WaouhPalette.mint,
    this.iconColor = WaouhPalette.jade,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;
  final Color tint;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(
        horizontal: WaouhSpace.xl,
        vertical: WaouhSpace.xxl,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(WaouhRadius.card),
        boxShadow: WaouhShadows.card,
      ),
      child: Column(
        children: [
          Container(
            width: 76,
            height: 76,
            decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
            child: Icon(icon, size: 34, color: iconColor),
          ),
          const SizedBox(height: WaouhSpace.lg),
          Text(title, style: WaouhText.h1, textAlign: TextAlign.center),
          const SizedBox(height: WaouhSpace.sm),
          Text(
            message,
            textAlign: TextAlign.center,
            style: WaouhText.body.copyWith(color: WaouhPalette.muted),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: WaouhSpace.lg),
            FilledButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}

/// Compact circular countdown ring used on 24h statuses — shows remaining
/// time and recolors as the deadline approaches (green -> amber -> red).
class CountdownRing extends StatefulWidget {
  const CountdownRing({
    super.key,
    required this.expiresAt,
    this.size = 38,
    this.stroke = 3,
    this.totalDuration = const Duration(hours: 24),
  });

  final DateTime expiresAt;
  final double size;
  final double stroke;
  final Duration totalDuration;

  @override
  State<CountdownRing> createState() => _CountdownRingState();
}

class _CountdownRingState extends State<CountdownRing> {
  late DateTime _now = DateTime.now();
  bool _disposed = false;

  @override
  void initState() {
    super.initState();
    _schedule();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  void _schedule() {
    Future.delayed(const Duration(seconds: 30), () {
      if (_disposed || !mounted) return;
      setState(() => _now = DateTime.now());
      _schedule();
    });
  }

  @override
  Widget build(BuildContext context) {
    final remaining = widget.expiresAt.difference(_now);
    final clamped = remaining.isNegative ? Duration.zero : remaining;
    final fraction = (clamped.inMilliseconds / widget.totalDuration.inMilliseconds)
        .clamp(0.0, 1.0);
    final hours = clamped.inHours;
    final minutes = clamped.inMinutes % 60;
    final label = clamped == Duration.zero
        ? '0'
        : hours >= 1
            ? '${hours}h'
            : '${minutes}m';
    final color = clamped == Duration.zero
        ? Colors.white54
        : hours >= 6
            ? WaouhPalette.neon
            : hours >= 1
                ? const Color(0xFFFFC95C)
                : const Color(0xFFFF8A80);

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          SizedBox.expand(
            child: CircularProgressIndicator(
              value: 1,
              strokeWidth: widget.stroke,
              color: Colors.white.withOpacity(0.18),
            ),
          ),
          SizedBox.expand(
            child: CircularProgressIndicator(
              value: fraction,
              strokeWidth: widget.stroke,
              color: color,
              strokeCap: StrokeCap.round,
            ),
          ),
          Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

/// Premium gradient hero card — the brand's signature surface, used sparingly
/// (entry points to WAOUH chat, wallet balance) so it keeps its impact.
class BrandHeroCard extends StatelessWidget {
  const BrandHeroCard({
    super.key,
    required this.child,
    this.gradient = WaouhGradients.brand,
    this.padding = const EdgeInsets.all(WaouhSpace.lg),
  });

  final Widget child;
  final Gradient gradient;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(WaouhRadius.card),
        boxShadow: WaouhShadows.floating,
      ),
      child: child,
    );
  }
}

/// A pill-shaped status badge (e.g. "IA", "Nouveau", "Dispo").
class WaouhPill extends StatelessWidget {
  const WaouhPill({
    super.key,
    required this.label,
    this.background = WaouhPalette.neon,
    this.foreground = WaouhPalette.ink,
    this.icon,
  });

  final String label;
  final Color background;
  final Color foreground;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(WaouhRadius.chip),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11, color: foreground),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: foreground,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}
