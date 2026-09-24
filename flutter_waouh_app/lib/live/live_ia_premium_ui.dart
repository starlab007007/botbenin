import 'package:flutter/material.dart';

/// Visual language used only inside the IA area. It does not contain routes,
/// repository calls, business rules or backend configuration.

/// Returns a presentation-only label for a WhatsApp session.
/// It intentionally does not alter WAHA identifiers or backend calls.
String waouhIaSessionLabel(dynamic session) {
  try {
    final displayName = session.displayName;
    if (displayName is String && displayName.trim().isNotEmpty) {
      return displayName.trim();
    }
  } catch (_) {}

  try {
    final name = session.name;
    if (name is String && name.trim().isNotEmpty) {
      return name.trim();
    }
  } catch (_) {}

  return 'Ligne WhatsApp';
}

/// Converts technical error text into a concise customer-facing summary.
/// Full text remains available in the existing technical detail expander.
String waouhIaReadableError(String raw) {
  final value = raw.trim().toLowerCase();
  if (value.contains('permission') ||
      value.contains('forbidden') ||
      value.contains('not authorized') ||
      value.contains('unauthorized')) {
    return 'Vous n’avez pas encore accès à cette session WhatsApp.';
  }
  if (value.contains('timeout') || value.contains('timed out')) {
    return 'Le service met trop de temps à répondre. Réessayez.';
  }
  if (value.contains('network') || value.contains('socket')) {
    return 'La connexion réseau est indisponible. Vérifiez Internet puis réessayez.';
  }
  return 'Cette action ne peut pas être finalisée pour le moment.';
}

class WaouhIaPalette {
  static const primary = Color(0xFF087A69);
  static const primaryDeep = Color(0xFF045D52);
  static const primarySoft = Color(0xFFE6F8F2);
  static const mint = Color(0xFFCEF5E5);
  static const canvas = Color(0xFFF7FAF9);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF102A25);
  static const muted = Color(0xFF6F817C);
  static const line = Color(0xFFE1E9E6);
  static const success = Color(0xFF159B65);
  static const warning = Color(0xFFE8A121);
  static const danger = Color(0xFFC65353);
  static const info = Color(0xFF2F6BFF);
  static const purple = Color(0xFF7B56D8);
  static const amber = Color(0xFFE69716);
  static const teal = Color(0xFF087A69);
}

class WaouhIaSpacing {
  static const page = 20.0;
  static const section = 28.0;
  static const card = 14.0;
  static const small = 8.0;
  static const radiusSmall = 14.0;
  static const radius = 22.0;
  static const radiusLarge = 30.0;
}

class WaouhIaThemeScope extends StatelessWidget {
  const WaouhIaThemeScope({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context);
    final scheme = base.colorScheme.copyWith(
      primary: WaouhIaPalette.primary,
      onPrimary: Colors.white,
      secondary: WaouhIaPalette.primary,
      surface: WaouhIaPalette.surface,
      onSurface: WaouhIaPalette.ink,
      outline: WaouhIaPalette.line,
      error: WaouhIaPalette.danger,
    );

    return Theme(
      data: base.copyWith(
        colorScheme: scheme,
        scaffoldBackgroundColor: WaouhIaPalette.canvas,
        appBarTheme: base.appBarTheme.copyWith(
          backgroundColor: WaouhIaPalette.surface,
          foregroundColor: WaouhIaPalette.ink,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: const TextStyle(
            color: WaouhIaPalette.ink,
            fontSize: 20,
            fontWeight: FontWeight.w900,
          ),
        ),
        cardTheme: base.cardTheme.copyWith(
          color: WaouhIaPalette.surface,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(WaouhIaSpacing.radius),
            side: const BorderSide(color: WaouhIaPalette.line),
          ),
        ),
        inputDecorationTheme: base.inputDecorationTheme.copyWith(
          filled: true,
          fillColor: WaouhIaPalette.surface,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 17,
          ),
          hintStyle: const TextStyle(color: WaouhIaPalette.muted),
          labelStyle: const TextStyle(
            color: WaouhIaPalette.ink,
            fontWeight: FontWeight.w700,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: WaouhIaPalette.line),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(
              color: WaouhIaPalette.primary,
              width: 1.7,
            ),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: WaouhIaPalette.danger),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: WaouhIaPalette.primary,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(52),
            padding: const EdgeInsets.symmetric(horizontal: 18),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(17),
            ),
            textStyle: const TextStyle(
              fontSize: 15.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: WaouhIaPalette.primary,
            minimumSize: const Size.fromHeight(48),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            side: const BorderSide(color: Color(0xFFC9E7DC)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(17),
            ),
            textStyle: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        switchTheme: SwitchThemeData(
          thumbColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.selected)
                ? WaouhIaPalette.primary
                : const Color(0xFF87958F),
          ),
          trackColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.selected)
                ? WaouhIaPalette.mint
                : const Color(0xFFE5EBE8),
          ),
        ),
        dividerColor: WaouhIaPalette.line,
        snackBarTheme: base.snackBarTheme.copyWith(
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
      child: child,
    );
  }
}

class WaouhIaScreenTitle extends StatelessWidget {
  const WaouhIaScreenTitle({
    super.key,
    required this.title,
    required this.subtitle,
    this.action,
  });

  final String title;
  final String subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        WaouhIaSpacing.page,
        18,
        WaouhIaSpacing.page,
        14,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: WaouhIaPalette.ink,
                    fontSize: 28,
                    height: 1.05,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: WaouhIaPalette.muted,
                    fontSize: 14.5,
                    height: 1.3,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          if (action != null) ...[
            const SizedBox(width: 12),
            action!,
          ],
        ],
      ),
    );
  }
}

class WaouhIaSurface extends StatelessWidget {
  const WaouhIaSurface({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color = WaouhIaPalette.surface,
    this.borderColor = WaouhIaPalette.line,
    this.radius = WaouhIaSpacing.radius,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color color;
  final Color borderColor;
  final double radius;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: borderColor),
        boxShadow: const [
          BoxShadow(
            color: Color(0x080B332B),
            blurRadius: 20,
            offset: Offset(0, 9),
          ),
        ],
      ),
      child: child,
    );

    if (onTap == null) {
      return content;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: content,
      ),
    );
  }
}

class WaouhIaSectionHeader extends StatelessWidget {
  const WaouhIaSectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: WaouhIaPalette.ink,
                  fontSize: 21,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.2,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: const TextStyle(
                    color: WaouhIaPalette.muted,
                    fontSize: 13.5,
                    height: 1.25,
                  ),
                ),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: 10),
          trailing!,
        ],
      ],
    );
  }
}

class WaouhIaModuleCard extends StatelessWidget {
  const WaouhIaModuleCard({
    super.key,
    required this.icon,
    required this.accent,
    required this.title,
    required this.subtitle,
    required this.actionLabel,
    required this.onTap,
  });

  final IconData icon;
  final Color accent;
  final String title;
  final String subtitle;
  final String actionLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return WaouhIaSurface(
      onTap: onTap,
      padding: const EdgeInsets.all(19),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: accent, size: 25),
          ),
          const SizedBox(height: 18),
          Text(
            title,
            style: const TextStyle(
              color: WaouhIaPalette.ink,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            subtitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: WaouhIaPalette.muted,
              fontSize: 14.5,
              height: 1.3,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  actionLabel,
                  style: TextStyle(
                    color: accent,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Icon(Icons.arrow_forward_rounded, color: accent, size: 20),
            ],
          ),
        ],
      ),
    );
  }
}

class WaouhIaStatusPill extends StatelessWidget {
  const WaouhIaStatusPill({
    super.key,
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.1,
        ),
      ),
    );
  }
}

class WaouhIaMetricTile extends StatelessWidget {
  const WaouhIaMetricTile({
    super.key,
    required this.value,
    required this.label,
    required this.icon,
    this.color = WaouhIaPalette.primary,
  });

  final String value;
  final String label;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return WaouhIaSurface(
      padding: const EdgeInsets.all(14),
      radius: 18,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: WaouhIaPalette.ink,
              fontWeight: FontWeight.w900,
              fontSize: 24,
              height: 1,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: WaouhIaPalette.muted,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class WaouhIaFeedbackCard extends StatefulWidget {
  const WaouhIaFeedbackCard({
    super.key,
    required this.title,
    required this.message,
    required this.color,
    required this.icon,
    required this.actionLabel,
    required this.onAction,
    this.technicalDetails,
  });

  final String title;
  final String message;
  final Color color;
  final IconData icon;
  final String actionLabel;
  final VoidCallback onAction;
  final String? technicalDetails;

  @override
  State<WaouhIaFeedbackCard> createState() => _WaouhIaFeedbackCardState();
}

class _WaouhIaFeedbackCardState extends State<WaouhIaFeedbackCard> {
  bool _showDetails = false;

  @override
  Widget build(BuildContext context) {
    return WaouhIaSurface(
      color: widget.color.withValues(alpha: 0.07),
      borderColor: widget.color.withValues(alpha: 0.28),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: widget.color.withValues(alpha: 0.13),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(widget.icon, color: widget.color, size: 21),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.title,
                  style: TextStyle(
                    color: widget.color,
                    fontSize: 15.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.message,
                  style: const TextStyle(
                    color: WaouhIaPalette.ink,
                    fontSize: 13.5,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: widget.onAction,
                  style: TextButton.styleFrom(
                    foregroundColor: widget.color,
                    padding: EdgeInsets.zero,
                    minimumSize: const Size(0, 36),
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: Text(widget.actionLabel),
                ),
                if ((widget.technicalDetails ?? '').trim().isNotEmpty)
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _showDetails = !_showDetails;
                      });
                    },
                    style: TextButton.styleFrom(
                      foregroundColor: WaouhIaPalette.muted,
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(0, 30),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: Text(
                      _showDetails
                          ? 'Masquer le détail technique'
                          : 'Voir le détail technique',
                    ),
                  ),
                if (_showDetails)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(top: 4),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.72),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: SelectableText(
                      widget.technicalDetails!,
                      style: const TextStyle(
                        color: WaouhIaPalette.muted,
                        fontSize: 11.5,
                        height: 1.3,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class WaouhIaEmptyState extends StatelessWidget {
  const WaouhIaEmptyState({
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
  Widget build(BuildContext context) {
    return WaouhIaSurface(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: WaouhIaPalette.primarySoft,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: WaouhIaPalette.primary, size: 31),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: WaouhIaPalette.ink,
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: WaouhIaPalette.muted,
              fontSize: 13.5,
              height: 1.35,
            ),
          ),
          if (action != null) ...[
            const SizedBox(height: 18),
            action!,
          ],
        ],
      ),
    );
  }
}

class WaouhIaStickyAction extends StatelessWidget {
  const WaouhIaStickyAction({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.secondary,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
  final Widget? secondary;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
        decoration: const BoxDecoration(
          color: WaouhIaPalette.surface,
          border: Border(top: BorderSide(color: WaouhIaPalette.line)),
        ),
        child: Row(
          children: [
            if (secondary != null) ...[
              secondary!,
              const SizedBox(width: 10),
            ],
            Expanded(
              child: FilledButton.icon(
                onPressed: onPressed,
                icon: Icon(icon, size: 19),
                label: Text(label),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
