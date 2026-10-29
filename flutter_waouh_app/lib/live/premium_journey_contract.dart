/// Twelve-screen WAOUH premium journey contract.
//// UI must derive verification badges and delivery receipts from server evidence.
enum PremiumJourneyScreen {
  liveSearch,
  selection,
  offerDetail,
  sellerRequest,
  dealRoom,
  agreement,
  serviceQuote,
  opportunity,
  mandate,
  externalInvite,
  fulfillment,
  completion,
}

enum PremiumVerification { unknown, declared, verified }
enum PremiumDelivery { prepared, queued, sent, received, replied, failed }
enum PremiumAgreement { draft, proposed, accepted, completed, disputed }

class PremiumJourneyState {
  const PremiumJourneyState({
    required this.screen,
    this.verification = PremiumVerification.unknown,
    this.delivery = PremiumDelivery.prepared,
    this.agreement = PremiumAgreement.draft,
    this.ownerAccepted = false,
    this.providerAccepted = false,
    this.ownerCompleted = false,
    this.providerCompleted = false,
    this.counterpartReached = false,
    this.contactAuthorized = false,
  });

  final PremiumJourneyScreen screen;
  final PremiumVerification verification;
  final PremiumDelivery delivery;
  final PremiumAgreement agreement;
  final bool ownerAccepted;
  final bool providerAccepted;
  final bool ownerCompleted;
  final bool providerCompleted;
  final bool counterpartReached;
  final bool contactAuthorized;

  bool get canSayStockConfirmed => verification == PremiumVerification.verified;
  bool get canSayDelivered =>
      delivery == PremiumDelivery.received || delivery == PremiumDelivery.replied;
  bool get canStartContact => contactAuthorized;
  bool get canStartBilateralNegotiation => counterpartReached;
  bool get canShowAccepted =>
      ownerAccepted && providerAccepted &&
      (agreement == PremiumAgreement.accepted ||
       agreement == PremiumAgreement.completed);
  bool get canShowCompleted =>
      canShowAccepted && ownerCompleted && providerCompleted &&
      agreement == PremiumAgreement.completed;
}

const premiumJourneyTitles = <PremiumJourneyScreen, String>{
  PremiumJourneyScreen.liveSearch: 'Je cherche pour vous',
  PremiumJourneyScreen.selection: 'Votre sélection',
  PremiumJourneyScreen.offerDetail: 'Votre offre',
  PremiumJourneyScreen.sellerRequest: 'Nouvelle demande',
  PremiumJourneyScreen.dealRoom: 'Votre échange',
  PremiumJourneyScreen.agreement: 'Votre accord',
  PremiumJourneyScreen.serviceQuote: 'Votre prestation',
  PremiumJourneyScreen.opportunity: 'Votre opportunité',
  PremiumJourneyScreen.mandate: 'Bot, à votre rythme',
  PremiumJourneyScreen.externalInvite: 'Une demande vous attend',
  PremiumJourneyScreen.fulfillment: 'Votre remise',
  PremiumJourneyScreen.completion: 'Votre échange',
};

const premiumJourneyPrimaryActions = <PremiumJourneyScreen, String>{
  PremiumJourneyScreen.liveSearch: 'Me prévenir',
  PremiumJourneyScreen.selection: 'Voir le choix de Bot',
  PremiumJourneyScreen.offerDetail: 'Laisser Bot contacter',
  PremiumJourneyScreen.sellerRequest: 'Ouvrir l’échange',
  PremiumJourneyScreen.dealRoom: 'Examiner l’accord',
  PremiumJourneyScreen.agreement: 'Confirmer cet accord',
  PremiumJourneyScreen.serviceQuote: 'Demander un devis complet',
  PremiumJourneyScreen.opportunity: 'Préparer mon dossier',
  PremiumJourneyScreen.mandate: 'Activer ce mandat',
  PremiumJourneyScreen.externalInvite: 'Continuer par code',
  PremiumJourneyScreen.fulfillment: 'Confirmer la réception',
  PremiumJourneyScreen.completion: 'Voir le récapitulatif',
};
