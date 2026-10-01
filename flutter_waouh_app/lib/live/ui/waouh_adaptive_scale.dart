import 'package:flutter/material.dart';

/// Échelle de texte adaptative WAOUH (UI uniquement).
///
/// Petit téléphone : 1,0 · téléphone : 1,0 → 1,04 · tablette : 1,08 → 1,14.
/// La préférence d'accessibilité de l'appareil est toujours respectée :
/// l'échelle choisie par l'utilisateur est multipliée, puis bornée pour que
/// les écrans restent lisibles sans casser la mise en page.
double waouhAdaptiveTextFactor(Size size) {
  final shortest = size.shortestSide;
  if (shortest >= 600) {
    // Tablettes : de 600 à 900 dp de petit côté.
    return 1.08 + ((shortest - 600) / 300).clamp(0.0, 1.0) * 0.06;
  }
  if (shortest <= 360) return 1.0;
  return 1.0 + ((shortest - 360) / 60).clamp(0.0, 1.0) * 0.04;
}

/// Combine l'échelle de l'utilisateur et l'échelle adaptative.
TextScaler waouhAdaptiveTextScaler(MediaQueryData media) {
  final user = media.textScaler.scale(14) / 14;
  final combined = (user * waouhAdaptiveTextFactor(media.size)).clamp(1.0, 1.6);
  return TextScaler.linear(combined.toDouble());
}

/// À placer dans `MaterialApp.builder`.
Widget waouhAdaptiveScaleBuilder(BuildContext context, Widget? child) {
  final media = MediaQuery.of(context);
  return MediaQuery(
    data: media.copyWith(textScaler: waouhAdaptiveTextScaler(media)),
    child: child ?? const SizedBox.shrink(),
  );
}
