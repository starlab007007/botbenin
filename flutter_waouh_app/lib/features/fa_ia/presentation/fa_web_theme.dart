import 'package:flutter/material.dart';

class FaWebColors {
  const FaWebColors._();

  static const background = Color(0xFFF6F2EA);
  static const surface = Color(0xFFFFFDF9);
  static const dark = Color(0xFF170B07);
  static const brown = Color(0xFF24150C);
  static const brown2 = Color(0xFF3A2114);
  static const ink = Color(0xFF241710);
  static const muted = Color(0xFF75675D);
  static const gold = Color(0xFFE4AA3F);
  static const gold2 = Color(0xFFF2C66F);
  static const copper = Color(0xFFA86B2C);
  static const green = Color(0xFF0B7367);
  static const line = Color(0xFFE6DDD3);
  static const ivory = Color(0xFFF7EAD1);
  static const danger = Color(0xFFA33B32);
}

AppBar faWebAppBar({
  required String title,
  String? subtitle,
  VoidCallback? onBack,
  List<Widget>? actions,
}) {
  return AppBar(
    automaticallyImplyLeading: false,
    backgroundColor: FaWebColors.dark,
    foregroundColor: Colors.white,
    elevation: 0,
    toolbarHeight: 64,
    leading: onBack == null
        ? null
        : IconButton(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_rounded),
          ),
    titleSpacing: onBack == null ? 16 : 0,
    title: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          title,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            fontSize: 22,
            height: 1.05,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.5,
          ),
        ),
        if (subtitle != null && subtitle.trim().isNotEmpty) ...[
          const SizedBox(height: 3),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFFD9AA52),
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ],
    ),
    actions: actions,
  );
}

class FaWebPrimaryButton extends StatelessWidget {
  const FaWebPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon = Icons.adjust_rounded,
    this.dark = false,
    this.busy = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData icon;
  final bool dark;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: dark ? 70 : 56,
      child: FilledButton.icon(
        onPressed: busy ? null : onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: dark ? FaWebColors.brown : FaWebColors.gold,
          foregroundColor: dark ? Colors.white : const Color(0xFF1B0D07),
          disabledBackgroundColor: dark
              ? FaWebColors.brown.withOpacity(0.72)
              : FaWebColors.gold.withOpacity(0.72),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(dark ? 27 : 18),
          ),
          textStyle: TextStyle(
            fontSize: dark ? 19 : 17,
            fontWeight: FontWeight.w900,
          ),
        ),
        icon: busy
            ? const SizedBox.square(
                dimension: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2.2,
                  color: Colors.white,
                ),
              )
            : Icon(icon),
        label: Text(label),
      ),
    );
  }
}
