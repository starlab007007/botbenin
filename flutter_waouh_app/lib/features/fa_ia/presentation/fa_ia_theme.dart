import 'package:flutter/material.dart';

class FaIaColors {
  const FaIaColors._();

  static const background = Color(0xFFF4EFE8);
  static const surface = Color(0xFFFFFCF7);
  static const deepBrown = Color(0xFF24150C);
  static const brown = Color(0xFF4A2A17);
  static const copper = Color(0xFFB96E2E);
  static const gold = Color(0xFFD8A451);
  static const ivory = Color(0xFFF6E9D2);
  static const ink = Color(0xFF211A15);
  static const muted = Color(0xFF756A62);
  static const line = Color(0xFFE4D8C9);
  static const green = Color(0xFF496A53);
  static const danger = Color(0xFFA3483D);
}

class FaIaText {
  const FaIaText._();

  static const display = TextStyle(
    color: FaIaColors.ink,
    fontSize: 30,
    height: 1.08,
    fontWeight: FontWeight.w900,
    letterSpacing: -0.8,
  );

  static const h1 = TextStyle(
    color: FaIaColors.ink,
    fontSize: 24,
    height: 1.15,
    fontWeight: FontWeight.w900,
    letterSpacing: -0.5,
  );

  static const h2 = TextStyle(
    color: FaIaColors.ink,
    fontSize: 19,
    height: 1.2,
    fontWeight: FontWeight.w900,
  );

  static const body = TextStyle(
    color: FaIaColors.ink,
    fontSize: 14.5,
    height: 1.48,
    fontWeight: FontWeight.w500,
  );

  static const muted = TextStyle(
    color: FaIaColors.muted,
    fontSize: 13,
    height: 1.42,
    fontWeight: FontWeight.w500,
  );

  static const label = TextStyle(
    color: FaIaColors.ink,
    fontSize: 12,
    fontWeight: FontWeight.w800,
  );
}

class FaIaCard extends StatelessWidget {
  const FaIaCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.margin,
    this.color = FaIaColors.surface,
    this.borderColor = FaIaColors.line,
  });

  final Widget child;
  final EdgeInsets padding;
  final EdgeInsets? margin;
  final Color color;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor),
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: FaIaColors.deepBrown.withOpacity(0.06),
            blurRadius: 18,
            offset: const Offset(0, 9),
          ),
        ],
      ),
      child: child,
    );
  }
}

class FaIaSectionTitle extends StatelessWidget {
  const FaIaSectionTitle({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
  });

  final IconData icon;
  final String title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: FaIaColors.ivory,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: FaIaColors.copper, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(title, style: FaIaText.h2),
              if (subtitle != null) ...<Widget>[
                const SizedBox(height: 3),
                Text(subtitle!, style: FaIaText.muted),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

ButtonStyle faPrimaryButtonStyle() => FilledButton.styleFrom(
  minimumSize: const Size.fromHeight(54),
  backgroundColor: FaIaColors.deepBrown,
  foregroundColor: Colors.white,
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(17)),
  textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
);

ButtonStyle faSecondaryButtonStyle() => OutlinedButton.styleFrom(
  minimumSize: const Size.fromHeight(50),
  foregroundColor: FaIaColors.deepBrown,
  side: const BorderSide(color: FaIaColors.line),
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
  textStyle: const TextStyle(fontWeight: FontWeight.w800),
);

class FaIaPrimaryButton extends StatelessWidget {
  const FaIaPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    if (icon == null) {
      return FilledButton(
        style: faPrimaryButtonStyle(),
        onPressed: onPressed,
        child: Text(label),
      );
    }
    return FilledButton.icon(
      style: faPrimaryButtonStyle(),
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
    );
  }
}
