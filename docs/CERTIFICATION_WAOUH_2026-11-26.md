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

## Re-test après corrections (26/11/2026, 18 h 15 UTC) — Web / serveur commun

Deux comptes distincts : acheteur `songbianzime@gmail.com`, vendeur de test « CERTIF_WAOUH Vendeur » (`certif.vendeur.waouh@bot.bj`).

| Étape | Verdict | Preuve |
|---|---|---|
| 1. Besoin exprimé | OK | « Je cherche un ordinateur portable à Cotonou », « plombier », « lampe de bureau » |
| 2. NEXUS + sources | OK (corrigé) | La recherche partagée dépassait le délai (8 s) à chaque requête → plus aucune source NEXUS. Ramenée de 5,6 s à 1,1 s. « plombier » : 0 → 15 fiches |
| 3. Résultats pertinents, photos, prix | OK avec réserve | Téléphones/accessoires écartés pour « ordinateur portable » ; un appel d'offres hors sujet peut encore apparaître (mot « bureau ») |
| 4. Intéressé / Confier à Bot | OK | Bot n'élit plus une offre > 50 % sous la médiane |
| 5. Deal Room | OK | ouverture directe depuis la fiche |
| 6. Marché / négociation | OK | offre 18 000 F sur 20 000 F |
| 7. Contact autorisé | OK | le vendeur reçoit et répond |
| 8. Accord | OK | « Accord conclu », vendeur confirme la disponibilité |
| 9. Réception et clôture | OK (corrigé) | « Vente terminée », paiement payé, commission 900 F |

Anomalies corrigées dans ce passage :
- Annonce vendeur par le chat parfois non enregistrée alors que la confirmation s'affichait ; la confirmation était aussi remplacée par la liste d'acheteurs.
- Clôture impossible pour toute commande payée à la livraison (« Rien n'a été validé »).
- Choix du paiement non reporté sur la transaction.
- Deux livreurs de test actifs recevaient les vraies commandes (désactivés).
- Délai du chat Web (12 s) plus court que la recherche.

Réserves restantes :
- Étape livreur simulée (aucun compte livreur disponible pour le test) : le livreur réel doit marquer « livré ».
- Android/Flutter : les corrections serveur s'appliquent aussi à l'application ; la règle « prix suspect » est reportée dans le code Flutter, mais l'application n'a pas été compilée ni testée sur téléphone.
