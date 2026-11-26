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

## Vérification multi-écrans (26/11/2026, soir)

| Étape | Web ordinateur | Web tablette (768 px) | Web téléphone (390 px) | Application Android |
|---|---|---|---|---|
| Besoin + recherche NEXUS | OK | OK (16–24 s) | OK (20–24 s) | Corrigé (ville envoyée), non testé sur téléphone |
| Résultats prix/photos | OK | OK, aucun débordement | OK, aucun débordement | Non testé |
| Choix de Bot (prix suspect écarté) | OK | OK | OK (200 000 F choisi, pas 600 F) | Règle copiée + test ajouté, non exécuté |
| « Intéressé » → Deal Room | OK | OK après correctif | OK après correctif | Même serveur, non testé |
| Accord → réception → clôture | OK (2 comptes) | Même parcours serveur | Même parcours serveur | Même serveur, non testé |

Corrections de cette passe :
- Les annonces expirées n'apparaissent plus dans les résultats (elles faisaient échouer « Intéressé »).
- Comptes avec beaucoup de sessions : la recherche d'un échange existant ne bloque plus.
- Téléphone : « Intéressé » ouvrait l'accueil au lieu de la fenêtre de l'article ; il ouvre maintenant la Deal Room.
- Offre sans prix : message clair invitant à confier l'offre à Bot, au lieu d'un échec.
- Application : messages d'erreur génériques en français, ville transmise avec la demande.

Reste à faire : test sur un vrai téléphone Android et exécution des tests de l'application ; une livraison marquée « livré » par un vrai livreur.

## Audit : offres trouvées hors WAOUH → WhatsApp → accord (26/11/2026)

| Étape | Verdict | Constat |
|---|---|---|
| Collecte (sites, Facebook, Internet, annuaires, partenaires, appels d'offres) | OK partiel | Collectes actives aujourd'hui (sites commerciaux, Facebook, annuaires, appels d'offres). Certaines sources n'ont rien collecté depuis plus d'un mois (offres WhatsApp en mai, partenaires en octobre). |
| Contact retrouvé | FAIBLE | 2 254 vendeurs ont un contact, mais seuls **84** ont un numéro utilisable pour WhatsApp. Les autres numéros n'ont ni preuve d'activité publique ni accord du vendeur. |
| Présentation | OK | Prix, ville et provenance sont affichés. « Joignables 0/3 » est indiqué honnêtement. |
| Envoi de l'intérêt | BLOQUÉ | Le WhatsApp central de la plateforme est bloqué en démarrage depuis 05:51 : 62 messages WhatsApp attendent. |
| File des messages | CORRIGÉ | Les messages WhatsApp en attente bloquaient aussi 28 notifications dans l'application. Ils sont maintenant reportés et laissent passer les autres. |
| Réponse du vendeur → Deal Room → accord → clôture | NON TESTÉ | Il faut d'abord que WhatsApp soit reconnecté et qu'un numéro de test soit fourni. Le seul envoi extérieur jamais fait a bien été lu. |

Propositions (par priorité) :
1. Reconnecter le WhatsApp central (nouveau scan du QR code), puis rejouer le test avec un numéro de test.
2. Avant 24 h, prévenir l'acheteur si le message n'est pas parti, au lieu de le laisser expirer sans rien dire (105 messages perdus du 30/10 au 15/11).
3. Rechercher davantage de numéros depuis les fiches publiques (site, page Facebook de l'entreprise) pour dépasser 84 vendeurs joignables.
4. Mettre en avant les offres joignables dans les résultats, et proposer « Confier à Bot » pour les autres.
5. Relancer les sources sans collecte depuis plus de 30 jours, ou les marquer « en pause ».

## Audit des sources de collecte (26/11, 20 h)

| Source | État constaté | Cause | Action |
|---|---|---|---|
| CoinAfrique (6 catégories) | 5 annonces lues par passage, toujours les mêmes → « rien de nouveau » | Limite fixe à 5 et lecture du haut de liste | Corrigé : jusqu'à 15 par passage, nouvelles annonces d'abord. Vérifié : Services 0 → 15 nouvelles annonces avec photo, ville, prix |
| Groupes Facebook (7) | Bloqués | Crédit du service de collecte épuisé | À recharger côté fournisseur |
| Recherche Internet | Bloquée depuis le 25/11 | Crédit épuisé | À recharger côté fournisseur |
| Gouvernement — Emploi / Marchés | 60 et 33 avis lus, 0 retenu | Tous les avis sont clos (dernière échéance 18/11) | Comportement correct |
| BCEAO | Échec ponctuel | Site momentanément indisponible | Nouvel essai automatique |
| 24 sites « à valider » / « non vérifiés » | Jamais collectés | Droits d'usage non confirmés | Décision de l'exploitant |
| Numéros étrangers (+33…) | Ignorés | Reconnaissance limitée au Bénin | Corrigé |
