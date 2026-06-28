// WAOUH design system — extends the historic WaouhColors palette with the
// tokens needed for a premium, distinctive marketplace UI: named gradients,
// soft tinted shadows, a strict type scale and small reusable primitives.
//
// Signature: the diagonal "deep teal -> WhatsApp green -> near-black" gradient
// already used on headers is the brand's one bold move. Everywhere else stays
// quiet: white cards, generous radius, a single accent (neon mint) for calls
// to action. Spend boldness once, keep the rest disciplined.
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
  static const Color redTint = Color(0xFFFFE9E9);

  /// Warm tint for "negotiate" intent surfaces.
  static const Color orangeTint = Color(0xFFFFF1E0);

  /// Cool tint for "buy" intent surfaces.
  static const Color blueTint = Color(0xFFEAF1FF);

  /// Hairline border on dark gradients.
  static const Color onDarkBorder = Color(0x29FFFFFF); // white @ 16%
  static const Color onDarkSurface = Color(0x1FFFFFFF); // white @ 12%
  static const Color onDarkMuted = Color(0xFFBFD8CE);
}

/// Named gradients — the brand's signature move. Use [brand] for anything
/// that wants to feel like "the app" (headers, hero cards, primary CTA);
/// reach for the intent gradients only on chips/badges tied to that intent.
class WaouhGradients {
  const WaouhGradients._();

  static const LinearGradient brand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [WaouhPalette.deep, WaouhPalette.green, Color(0xFF031F1A)],
  );

  static const LinearGradient brandSoft = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [WaouhPalette.green, WaouhPalette.jade],
  );

  static const LinearGradient sell = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFE7515B), Color(0xFFB3242E)],
  );

  static const LinearGradient buy = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [WaouhPalette.jade, Color(0xFF075E54)],
  );

  static const LinearGradient announce = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFA83D), WaouhPalette.orange],
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
      color: WaouhPalette.green.withOpacity(0.07),
      blurRadius: 22,
      offset: const Offset(0, 10),
      spreadRadius: -6,
    ),
  ];

  static List<BoxShadow> floating = [
    BoxShadow(
      color: WaouhPalette.ink.withOpacity(0.16),
      blurRadius: 28,
      offset: const Offset(0, 14),
      spreadRadius: -8,
    ),
  ];

  static List<BoxShadow> brandGlow = [
    BoxShadow(
      color: WaouhPalette.neon.withOpacity(0.28),
      blurRadius: 24,
      offset: const Offset(0, 10),
      spreadRadius: -6,
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
    fontSize: 32,
    fontWeight: FontWeight.w900,
    letterSpacing: -0.4,
    height: 1.12,
    color: WaouhPalette.ink,
  );

  static const TextStyle h1 = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w900,
    letterSpacing: -0.2,
    height: 1.18,
    color: WaouhPalette.ink,
  );

  static const TextStyle h2 = TextStyle(
    fontSize: 19,
    fontWeight: FontWeight.w800,
    height: 1.22,
    color: WaouhPalette.ink,
  );

  static const TextStyle h3 = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w800,
    height: 1.25,
    color: WaouhPalette.ink,
  );

  static const TextStyle body = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    height: 1.4,
    color: WaouhPalette.ink,
  );

  static const TextStyle bodyStrong = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w700,
    height: 1.32,
    color: WaouhPalette.ink,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 12.5,
    fontWeight: FontWeight.w600,
    height: 1.3,
    color: WaouhPalette.muted,
  );

  static const TextStyle eyebrow = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w800,
    letterSpacing: 0.6,
    color: WaouhPalette.muted,
  );

  static const TextStyle button = TextStyle(
    fontSize: 15.5,
    fontWeight: FontWeight.w800,
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
