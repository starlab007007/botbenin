# Certification parcours WAOUH — 26/11/2026 (rapport intermédiaire)

Compte acheteur testé : compte fourni (Web, aperçu local, données de production). Android : non testé (pas de téléphone ni compilation ici).

| # | Étape | Web | Android | Constat |
|---|---|---|---|---|
| 1 | Expression du besoin | Conforme | Non testé | Saisie et envoi OK |
| 2 | Recherche NEXUS | **Corrigé** | Non testé | BLOQUANT trouvé : le Web coupait la demande à 12 s alors que la recherche prend ~15 s → « Envoi échoué », résultats perdus. Délai porté à 60 s. Après correction : résultats en ~20–36 s |
| 3 | Résultats | À corriger | Non testé | 5 résultats avec photo/prix/provenance, mais : téléphone classé 1er pour « ordinateur portable » ; produit de test encore visible (« test Partenaire WA↔WA ») ; « Support d'ordinateur » hors sujet ; offre à 600 F avec photo de téléphone choisie par Bot malgré l'alerte prix ; ville saisie affichée « Zone non précisée » |
| 4 | Intéressé / Confier à Bot | Conforme | Non testé | 4 boutons « Intéressé », bouton « Confier les 4 à Bot » visibles |
| 5 | Deal Room automatique | Non testé | Non testé | Non cliqué : ouvrirait un vrai échange avec un vendeur réel |
| 6–9 | Négociation → clôture | Bloqué | Bloqué | Nécessite un second compte vendeur réel distinct (le compte fourni est l'acheteur) |

## Autres constats serveur
- Erreurs intermittentes « recherche indisponible » dans le moteur de recherche de fond (veille et missions Bot) — à analyser.
- WhatsApp : session en redémarrage, messages en attente (hors périmètre).

## Corrections prioritaires
1. (Fait) Délai d'attente du chat Web.
2. Pertinence : exclure les téléphones/accessoires d'une recherche « ordinateur portable » ; retirer le produit de test restant.
3. Choix de Bot : ne jamais retenir une offre signalée « prix très inférieur, à vérifier ».
4. Reprendre la ville saisie dans l'analyse du marché.
5. Analyser les erreurs intermittentes de la recherche de fond.

## Pour finir la certification
- Un compte vendeur distinct avec un article « CERTIF_WAOUH » → test étapes 5 à 9 sur Web.
- Fiche Android : refaire les mêmes étapes sur le téléphone avec l'APK à jour et envoyer les captures.
