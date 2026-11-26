# Recherche assistée : un parcours adapté à chaque besoin, et toujours un résultat

## Diagnostic (données réelles vérifiées)

Offres collectées et encore valides, par type :
- Produits à vendre : environ 400 valides. Les sites commerciaux sont la meilleure source (80 % ont photo et prix). Les résultats Internet ont rarement une photo (39 %) et un prix (25 %).
- Réseaux sociaux (Facebook, Instagram, TikTok) : presque tout est expiré ou sans prix ni photo.
- Demandes d'achat (« je cherche ») : 0 encore valide. Le parcours Vendre n'a donc aucun acheteur extérieur à proposer.
- Services et prestations : environ 50 fiches (plomberie, formation, « autres services »), concentrées à Cotonou, sans tarif.
- Emplois et opportunités : environ 35, dont la plupart sont des avis publics clos.
- Contact WhatsApp connu : 1 seule offre extérieure sur près de 1 000.
- Catégories : la même chose a plusieurs noms (« Smartphone », « Smartphones », « Téléphonie », « Téléphones & Tablettes »…). 93 offres n'ont aucune catégorie.

Causes :
1. Six parcours, mais un seul moteur. Bot a une stratégie par parcours, mais la recherche, le classement et l'affichage restent ceux d'un achat de produit (prix, photo, « Bon prix »). Pour un service, un emploi ou une opportunité, ces critères sont vides ou trompeurs.
2. Aucune recherche ne se lance au moment où la personne demande. Si la réserve d'offres ne contient rien, la réponse est « 0 résultat ». Les outils disponibles (recherche Internet, sites, annuaires de lieux, réseaux sociaux, appels d'offres) ne sont pas sollicités pour cette demande.
3. Les sources sont souvent indisponibles : crédit de collecte épuisé pour Facebook et la recherche Internet, 24 sites jamais validés.
4. Le parcours Vendre n'a pas d'acheteurs réels : les demandes d'achat expirent et ne sont pas renouvelées.
5. Les offres sont mal décrites : catégories en double, vendeurs sans contact, avis clos encore comptés.

## Ce qu'il faut viser : 6 parcours, chacun avec sa recherche et son résultat

```text
Parcours     | Où chercher (dans l'ordre)                            | Ce qu'on montre                        | Action
Acheter      | Catalogue WAOUH > sites e-commerce > Internet > réseaux | photo, prix, ville, Bon prix/Cher      | Je veux / Bot négocie
Vendre       | Demandes WAOUH > demandes sur réseaux et groupes > alertes | acheteurs, budget, ville, récence      | Proposer / Bot diffuse
Trouver      | Tout, en élargissant aux villes voisines              | mélange classé, « le plus proche »     | Je veux / Bot cherche
Service      | Prestataires WAOUH > annuaires de lieux > Internet    | métier, quartier, avis, joignable      | Demander un devis / Bot compare
Prestation   | Prestataires disponibles + zone                       | dispo, zone, tarif indicatif           | Réserver / Bot planifie
Opportunité  | Appels d'offres, emplois, bourses, BCEAO/BOAD          | date limite, éligibilité, organisme    | Préparer / Bot rappelle
```

Règle commune : jamais de « 0 résultat » sec. On essaie dans cet ordre :
1. On montre les résultats exacts.
2. Sinon, des résultats proches, signalés comme tels : ville voisine, catégorie proche ou budget un peu plus haut.
3. On lance une recherche en direct pour cette demande sur les sources du parcours. La personne voit « Bot cherche encore… » et reçoit une notification à l'arrivée des offres.
4. On enregistre une alerte. La demande devient visible des vendeurs ou prestataires WAOUH du domaine, ce qui alimente le parcours Vendre.

## Étapes de réalisation

1. **Reconnaître le parcours.** Repérer de façon fiable le parcours visé dans la phrase (« plombier » = service, « recrute » = opportunité). La même règle sert au site et à l'application Android, avec un test par parcours.
2. **Choisir les sources selon le parcours.** Chaque parcours a ses sources, son nombre minimal de résultats et ses villes voisines (Cotonou ↔ Abomey-Calavi ↔ Porto-Novo, etc.).
3. **Chercher en direct quand la réserve ne suffit pas.** La demande déclenche une recherche Internet ciblée, l'annuaire de lieux pour les services et une lecture des sites validés du domaine. Délai limité : au-delà, la suite arrive en notification.
4. **Classer selon le parcours.**
   - Achat : prix, photo, fraîcheur.
   - Service et prestation : proximité, joignabilité, avis.
   - Opportunité : date limite à venir (les avis clos sont exclus), éligibilité.
   - Vente : récence de la demande et budget.
5. **Adapter la carte de résultat.** Il y a une carte par parcours, avec le même gabarit sur le site et sur Android, peu de texte et deux boutons.
6. **Donner des acheteurs au parcours Vendre.** Les « je cherche » des réseaux et des groupes deviennent des demandes. Les recherches WAOUH sans résultat deviennent aussi des demandes anonymes. Les demandes trop anciennes sont relancées ou retirées.
7. **Nettoyer les offres.** Une seule liste de catégories, avec reclassement des offres existantes et de celles sans catégorie. Les avis clos sont exclus. Le contact est complété en priorité pour les offres les plus consultées.
8. **Surveiller les sources.** Une alerte prévient quand une source tombe (crédit épuisé, site bloqué). Une page indique, pour chaque parcours, le taux de recherches avec résultat.
9. **Valider.** On rejoue 5 recherches réelles par parcours sur le site et sur Android, et on rédige un rapport avec le taux de résultats avant et après.

## Ce qui dépend de vous
- Recharger le crédit du service de collecte : réseaux sociaux et recherche Internet.
- Valider un par un les sites « à valider » utiles : Pages Jaunes, emploi, immobilier…
- La règle de contact : peut-on écrire sur WhatsApp à un numéro trouvé dans une annonce publique ?

## Détails techniques
- Reconnaissance du parcours : étendre `waouh-need-domain.ts` (domaines job/training/service/property…) avec une correspondance vers `BotTrack`, et la recopier en Dart (`live/`), avec des tests Deno et Dart.
- Sources par parcours : un tableau de configuration partagé `_shared/waouh-track-sources.ts` (sources, seuil minimal, délai, villes voisines).
- Recherche en direct : depuis la recherche NEXUS, appeler `waouh-serpapi-scout`, `waouh-radar-nearby` (lieux) et `waouh-radar-site-scraper` (cibles validées du domaine) en parallèle, avec un délai global d'environ 8 s. Le reste passe par `waouh-nexus-followup`, qui notifie à l'arrivée des offres.
- Classement : `rankArticle` dans `waouh-nexus.ts` reçoit des poids par parcours. Le filtre `expires_at` et une échéance obligatoire pour les opportunités s'y ajoutent.
- Demandes d'achat : alimenter les signaux `intent BUY/RFQ` avec une durée de vie et un renouvellement, plus une conversion anonymisée des recherches vides.
- Catégories : une table de correspondance plus un reclassement par lot. Aucune donnée réelle n'est supprimée.
- Indicateur : le taux de recherches avec résultat par parcours, calculé à partir des traces de recherche existantes.

## Idées optionnelles
- Recherche vocale par parcours (en fon et en yoruba) avec reformulation automatique.
- Classement « vendeurs de confiance » à partir des accords conclus.
