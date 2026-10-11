import 'package:flutter/material.dart';

import 'live_theme.dart';

/// Écran d'erreur — parité Web `MobileErrorFallback` (🙏, « Une erreur
/// s'est produite », Réessayer / Accueil).
class LiveErrorFallback extends StatelessWidget {
  const LiveErrorFallback({super.key, this.onRetry, this.onHome});
  final VoidCallback? onRetry;
  final VoidCallback? onHome;

  @override
  Widget build(BuildContext context) => Material(
        color: WaouhPalette.pearl,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🙏', style: TextStyle(fontSize: 44)),
                const SizedBox(height: 12),
                const Text('Une erreur s’est produite',
                    textAlign: TextAlign.center,
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
                const SizedBox(height: 6),
                const Text('Votre travail est sauvegardé. Réessayez.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: WaouhPalette.muted)),
                const SizedBox(height: 18),
                if (onRetry != null)
                  FilledButton(
                      onPressed: onRetry, child: const Text('Réessayer')),
                if (onHome != null) ...[
                  const SizedBox(height: 8),
                  OutlinedButton(
                      onPressed: onHome, child: const Text('Accueil')),
                ],
              ],
            ),
          ),
        ),
      );
}
