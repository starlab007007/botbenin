/// Vocabulaire « chaud » des cartes produit et des fenêtres de négociation.
///
/// Règle : un bouton dit ce qui se passe ensuite (proposer, négocier, suivre),
/// jamais « contacter le propriétaire » : chaque carte mène directement à la
/// fenêtre de négociation. Miroir de `src/lib/waouh/hotLabels.ts` (Web) ; les
/// deux sont vérifiés par `docs/contracts/chat/hot-labels-fixtures.json`.

/// Libellé du bouton principal d'une opportunité selon son niveau de contactabilité (C0–C5).
String liveContactabilityActionLabel(String? level) {
  switch ((level ?? '').toUpperCase()) {
    case 'C5':
      return 'Négocier dans WAOUH';
    case 'C4':
      return 'Suivre la réponse';
    case 'C3':
    case 'C2':
      return 'Proposer mon offre';
    case 'C1':
      return 'Vérifier puis proposer';
    default:
      return 'Lancer la démarche';
  }
}

/// Bouton d'envoi du premier message d'une démarche.
const String liveSendOfferLabel = 'Envoyer mon offre';

/// Bouton qui lance la recherche d'un canal quand le niveau est C0 / C1.
String liveFindChannelLabel(String? level) =>
    (level ?? '').toUpperCase() == 'C0' ? 'Lancer la recherche du vendeur' : 'Vérifier le meilleur canal';

/// Action principale d'une fiche radar : le vendeur répond à une demande d'achat, l'acheteur veut l'article.
String liveRadarPrimaryLabel({required bool buyRequest}) =>
    buyRequest ? 'Proposer mon article' : 'Je le veux';

/// Message pré-rempli quand l'utilisateur lance la démarche depuis une fiche radar.
String liveRadarInterestSeed(String title) =>
    'Je suis intéressé par « $title ». Quel est votre meilleur prix ?';

/// Libellés froids interdits (garde-fou de test) : ils ne mènent à aucune action.
const List<String> liveColdLabels = <String>[
  'Trouver un moyen de contacter',
  'Contacter avec WAOUH',
  'Voir contact',
  'Vérifier le contact',
  'Suivre le contact',
  'Transmettre via WAOUH',
  'contacter le vendeur',
];
