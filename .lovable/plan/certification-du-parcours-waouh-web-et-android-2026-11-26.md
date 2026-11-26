# Certification du parcours WAOUH — Web et Android

## Objectif
Vérifier de bout en bout, sur Web (bot.bj/app/chat) et sur Android (application Flutter), les 9 étapes du parcours commercial. Pour chaque étape : un verdict (Conforme / À corriger / Bloqué), une preuve (capture, donnée enregistrée), et la correction à faire si besoin. Rien n'est déclaré « certifié » sans test réel réussi.

## Prérequis (à fournir par vous)
- Deux comptes distincts : un acheteur et un vendeur (le compte déjà fourni sert d'acheteur ; il faut un second compte vendeur, ou j'en crée un de test avec votre accord).
- Un téléphone Android avec la dernière version de l'application installée (je ne peux pas compiler ni piloter un téléphone : vous ferez les captures selon une fiche de test que je fournis).
- WhatsApp : hors périmètre de cette certification (contact via l'application uniquement), sauf reconnexion de votre part.

## Grille de certification (les 9 étapes)

| # | Étape | Ce qui est vérifié | Preuve attendue |
|---|---|---|---|
| 1 | Expression du besoin | Saisie texte, ville, budget ; besoin bien compris (achat, vente, service, opportunité) | Capture + mission enregistrée |
| 2 | Recherche NEXUS | Recherche lancée seule, sources interrogées, aucune page bloquée « en cours » | Durée < 20 s, provenance des fiches |
| 3 | Résultats | Pertinents (le produit cherché, pas autre chose), avec photo, prix, ville, provenance, « vu il y a… » ; propre annonce marquée « Votre annonce » | Contrôle de 5 recherches types (ex. « un bic », « Zara », « ordinateur Abomey-Calavi », un service, une opportunité) |
| 4 | Intéressé / Confier à Bot | Bouton visible sur chaque carte ; écran mandat prérempli pour Bot | Capture Web + Android |
| 5 | Deal Room automatique | Ouverture directe, une fenêtre par article et par interlocuteur, pas de mélange | Identifiant d'échange unique, notifications ouvrant la bonne fenêtre |
| 6 | Analyse marché et négociation | Verdict prix (bonne affaire / juste / trop cher), comparables, offre et contre-offre, Bot respecte plafond/plancher | Échange réel acheteur ↔ vendeur |
| 7 | Contact autorisé | Coordonnées visibles seulement après accord de mise en relation | Vérification des droits d'accès côté serveur |
| 8 | Accord commercial | Les deux parties valident ; notification « Accord à valider » | Accord enregistré « accepté » |
| 9 | Réception et clôture | Paiement déclaré/reçu, livraison (assignation livreur dans /admin/waouh/deals), clôture des deux côtés | Transaction « clôturée », visible en administration |

## Déroulé
1. **Diagnostic de l'existant** (lecture du code Web et Flutter, des données de production et des journaux serveur) pour chaque étape : repérer les écarts Web/Android et les points cassés avant de tester.
2. **Test Web réel à deux comptes** sur l'aperçu, étapes 1 à 9, avec un article de test « CERTIF_WAOUH » supprimé à la fin.
3. **Fiche de test Android** : les mêmes 9 étapes, écran par écran, avec ce qu'il faut voir ; vous la déroulez et m'envoyez les captures, je les analyse.
4. **Vérification serveur** : chaque action du test est contrôlée dans les données (mission, échange, offres, accord, paiement, clôture) et dans les journaux d'erreurs.
5. **Rapport de certification** : tableau des 9 étapes × Web/Android, anomalies classées (bloquante / majeure / mineure), corrections proposées et ordre de priorité.
6. **Corrections** : réalisées seulement après votre validation du rapport, puis nouveau test des étapes concernées.

## Critère de « prêt pour l'exploitation commerciale »
Les 9 étapes Conformes sur Web ET Android, avec au moins un parcours complet acheteur → vendeur jusqu'à la clôture, et aucune anomalie bloquante ou majeure ouverte.

## Détails techniques
- Web : Playwright sur l'aperçu local, sessions des deux comptes ; contrôle des fonctions deal-room, recherche NEXUS et des tables d'échanges, accords, notifications, livraisons.
- Android : pas de compilation ni d'émulateur disponibles ici ; certification Android basée sur la fiche de test + captures + données serveur produites par vos actions.
- Les données de test sont marquées et supprimées après la certification ; aucun compte réel n'est modifié.
- Le rapport est enregistré dans docs/CERTIFICATION_WAOUH_<date>.md.
