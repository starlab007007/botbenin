import 'package:flutter/material.dart';

/// WAOUH synchronise désormais silencieusement en arrière-plan.
///
/// L'outbox locale, la reprise réseau et Supabase Realtime restent actifs dans
/// [LiveWaouhController], mais aucune bannière globale « Hors connexion » /
/// « Synchronisation en cours » n'encombre plus les écrans. Les erreurs d'une
/// action explicitement déclenchée par l'utilisateur restent gérées au niveau
/// de cette action.
class LiveOfflineBanner extends StatelessWidget {
  const LiveOfflineBanner({super.key});

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}
