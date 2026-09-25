// WAOUH AIR design system — a light, spatial, AI-first visual language.
// Business semantics stay untouched; this file only centralizes visual tokens
// used across Flutter so every module inherits the same premium shell.
import 'package:flutter/material.dart';

import '../main.dart' as legacy;

/// Extra color roles that sit on top of [legacy.WaouhColors]. Kept in a
/// separate class so the historic palette stays the single source of truth
/// for hex values; this only adds composition (gradients, overlays, tints).
class WaouhPalette {
  const WaouhPalette._();

  static const Color ink = legacy.WaouhColors.ink;
  static const Color deep = legacy.WaouhColors.deep;
  static const Color green = legacy.WaouhColors.green;
  static const Color jade = legacy.WaouhColors.jade;
  static const Color neon = legacy.WaouhColors.neon;
  static const Color mint = legacy.WaouhColors.mint;
  static const Color paper = legacy.WaouhColors.paper;
  static const Color pearl = legacy.WaouhColors.pearl;
  static const Color line = legacy.WaouhColors.line;
  static const Color muted = legacy.WaouhColors.muted;
  static const Color blue = legacy.WaouhColors.blue;
  static const Color sky = legacy.WaouhColors.sky;
  static const Color orange = legacy.WaouhColors.orange;
  static const Color amber = legacy.WaouhColors.amber;
  static const Color red = legacy.WaouhColors.red;

  /// Soft destructive tint for empty/error surfaces (not the raw red).
  static const Color redTint = Color(0xFFFFEEF1);

  /// Warm tint for "negotiate" intent surfaces.
  static const Color orangeTint = Color(0xFFFFF6EA);

  /// Cool tint for "buy" intent surfaces.
  static const Color blueTint = Color(0xFFEEF4FF);

  /// Hairline border on dark gradients.
  static const Color onDarkBorder = Color(0x42FFFFFF);
  static const Color onDarkSurface = Color(0x24FFFFFF);
  static const Color onDarkMuted = Color(0xFFEAF4FF);

  static const Color airBlue = Color(0xFF4F7FFF);
  static const Color airCyan = Color(0xFF55DDF2);
  static const Color airViolet = Color(0xFF8B7CFF);
  static const Color airLavender = Color(0xFFF3F0FF);
  static const Color airIce = Color(0xFFF5FAFF);
  static const Color glass = Color(0xF2FFFFFF);
}

/// Named gradients — the brand's signature move. Use [brand] for anything
/// that wants to feel like "the app" (headers, hero cards, primary CTA);
/// reach for the intent gradients only on chips/badges tied to that intent.
class WaouhGradients {
  const WaouhGradients._();

  // Primary CTA gradient. It stays saturated enough for white labels while
  // feeling much lighter than the former dark-green identity.
  static const LinearGradient brand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF4F7FFF), Color(0xFF6A8CFF), Color(0xFF47CAE7)],
  );

  static const LinearGradient brandSoft = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF76A8FF), Color(0xFF69DDD8)],
  );

  // Main screen/background wash.
  static const LinearGradient air = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFF8FBFF), Color(0xFFF2F7FF), Color(0xFFFBF8FF)],
  );

  static const LinearGradient airHero = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFEAF3FF), Color(0xFFF0F8FF), Color(0xFFF4F0FF)],
  );

  static const LinearGradient muse = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFEAF3FF), Color(0xFFF1F3FF), Color(0xFFFFF4E8)],
  );

  static const LinearGradient missions = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFE9F7FF), Color(0xFFEDFBF7), Color(0xFFFFF7EC)],
  );

  static const LinearGradient sell = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFF8C9B), Color(0xFFFFB078)],
  );

  static const LinearGradient buy = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF5F8EFF), Color(0xFF58D6E9)],
  );

  static const LinearGradient announce = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFC26F), Color(0xFFFF9D6C)],
  );

  static LinearGradient forStatusType(String type) => switch (type) {
        'buy' => buy,
        'announce' => announce,
        _ => sell,
      };
}

/// Soft, tinted shadows replace default Material grey shadows so elevated
/// surfaces feel like part of the same green-tinted world instead of generic
/// drop shadows.
class WaouhShadows {
  const WaouhShadows._();

  static List<BoxShadow> card = [
    BoxShadow(
      color: const Color(0xFF5578B8).withOpacity(0.10),
      blurRadius: 30,
      offset: const Offset(0, 14),
      spreadRadius: -10,
    ),
  ];

  static List<BoxShadow> floating = [
    BoxShadow(
      color: const Color(0xFF36558A).withOpacity(0.14),
      blurRadius: 36,
      offset: const Offset(0, 18),
      spreadRadius: -12,
    ),
  ];

  static List<BoxShadow> brandGlow = [
    BoxShadow(
      color: WaouhPalette.airCyan.withOpacity(0.30),
      blurRadius: 30,
      offset: const Offset(0, 12),
      spreadRadius: -10,
    ),
  ];
}

/// Strict type scale. Display/heading weights stay at w900 (the app's
/// existing signature); body copy relaxes to w400/w600 for readability.
/// Always read sizes from here instead of inlining TextStyle literals.
class WaouhText {
  const WaouhText._();

  static const String _display = 'Roboto';

  static const TextStyle display = TextStyle(
    fontFamily: _display,
    fontSize: 30,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.7,
    height: 1.12,
    color: WaouhPalette.ink,
  );

  static const TextStyle h1 = TextStyle(
    fontSize: 23,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.4,
    height: 1.18,
    color: WaouhPalette.ink,
  );

  static const TextStyle h2 = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w800,
    height: 1.22,
    color: WaouhPalette.ink,
  );

  static const TextStyle h3 = TextStyle(
    fontSize: 15.5,
    fontWeight: FontWeight.w700,
    height: 1.25,
    color: WaouhPalette.ink,
  );

  static const TextStyle body = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: WaouhPalette.ink,
  );

  static const TextStyle bodyStrong = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    height: 1.32,
    color: WaouhPalette.ink,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 11.5,
    fontWeight: FontWeight.w600,
    height: 1.3,
    color: WaouhPalette.muted,
  );

  static const TextStyle eyebrow = TextStyle(
    fontSize: 10.5,
    fontWeight: FontWeight.w800,
    letterSpacing: 0.6,
    color: WaouhPalette.muted,
  );

  static const TextStyle button = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.1,
  );

  static TextStyle onDark(TextStyle base) => base.copyWith(color: Colors.white);
  static TextStyle onDarkMuted(TextStyle base) =>
      base.copyWith(color: WaouhPalette.onDarkMuted);
}

/// Spacing scale (4px baseline). Prefer these over magic numbers so rhythm
/// stays consistent across screens written at different times.
class WaouhSpace {
  const WaouhSpace._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 14;
  static const double lg = 20;
  static const double xl = 28;
  static const double xxl = 40;
}

/// Corner radii. 26 is the brand's "premium card" radius; smaller values are
/// for compact inline elements (chips, thumbnails).
class WaouhRadius {
  const WaouhRadius._();
  static const double sheet = 28;
  static const double card = 24;
  static const double control = 16;
  static const double chip = 999.0;
  static const double thumb = 12;
}
