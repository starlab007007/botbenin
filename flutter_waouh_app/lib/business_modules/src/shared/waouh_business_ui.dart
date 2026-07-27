import 'package:flutter/material.dart';

import '../../../live/live_ia_premium_ui.dart';

export '../../../live/live_ia_premium_ui.dart';

class WaouhBusinessColors {
  static const green = WaouhIaPalette.primary;
  static const jade = WaouhIaPalette.primary;
  static const ink = WaouhIaPalette.ink;
  static const muted = WaouhIaPalette.muted;
  static const pearl = WaouhIaPalette.canvas;
  static const line = WaouhIaPalette.line;
  static const red = WaouhIaPalette.danger;
  static const orange = WaouhIaPalette.warning;
  static const blue = WaouhIaPalette.info;
}

/// Theme scope shared by BI, Stock, Catalogue Agent and Présence QR.
/// It only changes visual tokens and never changes backend or business logic.
class WaouhBusinessUiScope extends StatelessWidget {
  const WaouhBusinessUiScope({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => WaouhIaThemeScope(child: child);
}

class WaouhBusinessPageIntro extends StatelessWidget {
  const WaouhBusinessPageIntro({
    super.key,
    required this.title,
    required this.subtitle,
    required this.icon,
    this.color = WaouhBusinessColors.jade,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => WaouhIaSurface(
    color: color.withValues(alpha: 0.07),
    borderColor: color.withValues(alpha: 0.18),
    padding: const EdgeInsets.all(18),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(width: 13),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: WaouhBusinessColors.ink,
                  fontSize: 20,
                  height: 1.1,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                subtitle,
                style: const TextStyle(
                  color: WaouhBusinessColors.muted,
                  fontSize: 13.5,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class WaouhMetricCard extends StatelessWidget {
  const WaouhMetricCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.color = WaouhBusinessColors.jade,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) =>
      WaouhIaMetricTile(label: label, value: value, icon: icon, color: color);
}

class WaouhBusinessSurface extends StatelessWidget {
  const WaouhBusinessSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.color = Colors.white,
    this.borderColor = WaouhBusinessColors.line,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color color;
  final Color borderColor;

  @override
  Widget build(BuildContext context) => WaouhIaSurface(
    padding: padding,
    color: color,
    borderColor: borderColor,
    onTap: onTap,
    child: child,
  );
}

class WaouhFailurePanel extends StatelessWidget {
  const WaouhFailurePanel({
    super.key,
    required this.error,
    required this.onRetry,
  });

  final Object error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(20),
    child: WaouhIaFeedbackCard(
      title: 'Chargement impossible',
      message: 'Vérifiez votre connexion puis réessayez.',
      color: WaouhBusinessColors.red,
      icon: Icons.cloud_off_rounded,
      actionLabel: 'Réessayer',
      onAction: onRetry,
      technicalDetails: '$error',
    ),
  );
}

class WaouhEmptyState extends StatelessWidget {
  const WaouhEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) => WaouhIaEmptyState(
    icon: icon,
    title: title,
    message: message,
    action: action,
  );
}

String waouhShortNumber(num value) {
  if (value >= 1000000) {
    return '${(value / 1000000).toStringAsFixed(1)} M';
  }
  if (value >= 1000) {
    return '${(value / 1000).toStringAsFixed(1)} k';
  }
  return value.toStringAsFixed(value % 1 == 0 ? 0 : 1);
}
