import 'package:flutter/material.dart';

import 'live_models.dart';

/// Parcours unifié v3 — étapes, prix suggéré et barre de progression.
/// Mêmes règles que le serveur (supabase/functions/_shared/waouh-message-catalog.ts
/// et waouh-predictive.ts) et que le Web (src/lib/waouh/commerceAction.ts).

class LiveJourneyStep {
  const LiveJourneyStep(this.key, this.label);
  final String key;
  final String label;
}

const List<LiveJourneyStep> liveJourneySteps = <LiveJourneyStep>[
  LiveJourneyStep('interest', 'Intérêt'),
  LiveJourneyStep('negotiation', 'Négociation'),
  LiveJourneyStep('agreement', 'Accord'),
  LiveJourneyStep('preparation', 'Préparation'),
  LiveJourneyStep('courier', 'Livreur'),
  LiveJourneyStep('delivery', 'Livraison'),
  LiveJourneyStep('payment', 'Paiement'),
];

/// Étape à partir d'un état stocké (négociation / deal) ou d'une étape déjà calculée.
String? liveStageFromWorkflow(Object? value) {
  final v = '${value ?? ''}'.trim().toLowerCase().replaceAll('-', '_');
  if (v.isEmpty) return null;
  if (liveJourneySteps.any((step) => step.key == v)) return v;
  switch (v) {
    case 'completed':
    case 'deal_completed':
    case 'paid':
      return 'payment';
    case 'delivered':
      return 'delivery';
    case 'assigned':
    case 'picked_up':
      return 'courier';
    case 'pending_assignment':
      return 'preparation';
    case 'accepted':
    case 'awaiting_confirmation':
    case 'deal_created':
    case 'deal_accepted':
      return 'agreement';
    case 'proposed':
    case 'countered':
    case 'negotiating':
    case 'awaiting_counterparty':
      return 'negotiation';
    case 'interest_recorded':
      return 'interest';
  }
  return null;
}

/// Dernière étape connue d'un fil.
String? liveLatestStage(List<LiveMessage> messages) {
  for (var i = messages.length - 1; i >= 0; i--) {
    final meta = messages[i].meta;
    final stage = liveStageFromWorkflow(meta['stage']) ??
        liveStageFromWorkflow(meta['workflow_state']);
    if (stage != null) return stage;
  }
  return null;
}

/// Dernier montant proposé dans le fil (fiche produit du message).
num? liveLatestOffer(List<LiveMessage> messages) {
  for (var i = messages.length - 1; i >= 0; i--) {
    final products = messages[i].meta['products'];
    if (products is List && products.isNotEmpty && products.first is Map) {
      final price = (products.first as Map)['price'];
      final value = price is num ? price : num.tryParse('$price');
      if (value != null && value > 0) return value;
    }
  }
  return null;
}

/// Prix suggéré : milieu des offres, sinon 90 % de l'offre en cours, arrondi à 25 FCFA.
int? liveSuggestedCounterPrice({num? currentOffer, num? ownLastOffer, num? listPrice}) {
  num? positive(num? n) => n != null && n > 0 ? n : null;
  final current = positive(currentOffer) ?? positive(listPrice);
  final own = positive(ownLastOffer);
  final raw = current != null && own != null
      ? (current + own) / 2
      : current != null
          ? current * 0.9
          : null;
  if (raw == null) return null;
  final rounded = (raw / 25).round() * 25;
  return rounded > 0 ? rounded : null;
}

/// « 2 450 FCFA » (espace fine insécable entre les milliers).
String liveFormatFcfa(num value) {
  final digits = value.round().abs().toString();
  final buffer = StringBuffer(value < 0 ? '-' : '');
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(' ');
    buffer.write(digits[i]);
  }
  return '${buffer.toString()} FCFA';
}

/// Boutons de fiche produit v3 : « je-veux », « proposer-prix », « poser-question ».
String? liveArticleScopeKind(String payload) {
  final match = RegExp(r'^(je-veux|proposer-prix|poser-question):', caseSensitive: false)
      .firstMatch(payload.trim());
  return match?.group(1)?.toLowerCase();
}

/// Barre de progression 7 étapes. Étape courante en couleur, suivantes en gris.
class LiveDealStepper extends StatelessWidget {
  const LiveDealStepper({super.key, required this.stage});
  final String? stage;

  @override
  Widget build(BuildContext context) {
    final current = liveJourneySteps.indexWhere((step) => step.key == stage);
    if (current < 0) return const SizedBox.shrink();
    return Semantics(
      label: 'Progression de la vente : ${liveJourneySteps[current].label}',
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, 6, 10, 4),
        child: Row(
          children: [
            for (var i = 0; i < liveJourneySteps.length; i++)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 1.5),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        height: 3,
                        decoration: BoxDecoration(
                          color: i < current
                              ? const Color(0xFF34C38F)
                              : i == current
                                  ? const Color(0xFF0E9F6E)
                                  : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        liveJourneySteps[i].label,
                        maxLines: 1,
                        overflow: TextOverflow.fade,
                        softWrap: false,
                        style: TextStyle(
                          fontSize: 9.5,
                          fontWeight: i == current ? FontWeight.w800 : FontWeight.w600,
                          color: i == current
                              ? const Color(0xFF0E7C58)
                              : i < current
                                  ? const Color(0xFF52606D)
                                  : const Color(0xFFA0AEC0),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
