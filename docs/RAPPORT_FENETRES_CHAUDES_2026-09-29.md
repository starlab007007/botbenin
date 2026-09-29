# Rapport — E10, E11 et fenêtres « chaudes » (29/09/2026)

Branche `claude/harmonisation-phase-0-1` (PR #64). **Rien n'est déployé en production.** Serveur vérifié sur le projet de test `botbj-test-e2e` avec les vraies edge functions ; Web et Flutter vérifiés par tests automatiques uniquement (aucune interface n'a été ouverte ni exécutée).

## 1. E10 — acheteurs évincés (corrigé)
Quand le vendeur conclut avec un acheteur, les autres restaient en attente sans rien recevoir.
- Nouveau module `supabase/functions/_shared/waouh-evict.ts`, appelé par `waouh-negotiation-router` après un **nouvel** accord (pas sur un rejeu idempotent) :
  - les autres négociations ouvertes de l'article passent à `closed` (raison `article_reserved`), le fil passe à `waiting_availability` ;
  - chaque acheteur reçoit « Article réservé — Un autre acheteur l'a réservé. Vous serez prévenu s'il revient. » (WhatsApp compris si son numéro est connu) ;
  - les boutons périmés du fil (« Accepter » du vendeur, « Modifier mon offre » de l'acheteur) sont retirés ;
  - une action tardive sur cette négociation répond « réservé » / « vendu » (jamais « Action indisponible »), sauf si le fil a rouvert une négociation depuis.
- Reprise : si l'accord tombe (annulation dans `waouh-deal-ops`) et que l'article redevient `active`, les acheteurs évincés reçoivent « De nouveau disponible » avec « Je le veux à X / Proposer un prix / Poser une question », une seule fois.

## 2. E11 — offre sur un article réservé (corrigé)
`waouh-commerce-action` refuse une offre quand l'article est réservé, vendu, archivé ou supprimé (`article_reserved` / `article_sold`) : plus de « Nouvelle offre » que le vendeur ne pourrait pas accepter. Dans ce cas, aucun bouton qui échouerait n'est proposé.

## 3. Fenêtres chaudes
### Serveur (`waouh-commerce-contract.ts`, `waouh-commands.ts`)
Avant, `nextActions` renvoyait **une liste vide** dès que ce n'était pas votre tour. Maintenant :
| État | Acheteur | Vendeur |
|---|---|---|
| Négociation, en attente de l'autre | Modifier mon offre · Poser une question | Poser une question |
| Accord, son action faite | Poser une question · Annuler la commande | Poser une question |
| Préparation / livreur en route | Poser une question | Poser une question |
| Livré | Confirmer le paiement | Poser une question |
| Accord tombé (commande annulée) | Je le veux à X · Proposer un prix · Poser une question | — |
Ces identifiants (`poser-question:`, `proposer-prix:`, `annuler:`) sont déjà traités par le Web et Flutter dans le fil.

### Cartes produit et boutons « contacter »
- **Web** (`WaouhProductCard`) : sans boutons fournis par le serveur, la carte synthétise « Je le veux à X » + prix suggéré + « Poser une question » dès que l'identité du produit est connue (jamais pour une demande d'achat ni une fiche `action: null`). Le bouton de prix devient **intelligent** : « Proposer 270 000 FCFA » (−10 %, arrondi), un seul geste vers la fenêtre de négociation, avec « Autre montant » pour saisir librement.
- **Libellés froids supprimés** dans Web (`WaouhNexusContactSheet`, `nexus.ts`), Flutter (Nexus, Radar carte/liste/fiche, carte Avatar, widgets partagés, modèle radar) et `waouh-agentic-core`. Vocabulaire commun `docs/contracts/chat/hot-labels-fixtures.json`, implémenté en `src/lib/waouh/hotLabels.ts` et `flutter_waouh_app/lib/live/live_hot_labels.dart` :
  C5 « Négocier dans WAOUH » · C4 « Suivre la réponse » · C3/C2 « Proposer mon offre » · C1 « Vérifier puis proposer » · C0 « Lancer la démarche » · envoi « Envoyer mon offre » · radar : « Je le veux » (offre) ou « Proposer mon article » (demande d'achat).
  Le bouton « 💬 Contacter » des demandes d'achat (doublon de « Proposer ») devient « 💰 Proposer mon prix ».
- **Garde-fou** : un test échoue si un libellé froid revient dans le code Web, Flutter ou `waouh-agentic-core`.

## 4. Preuves
| Contrôle | Résultat |
|---|---|
| Tests unitaires serveur `_shared` (Deno) | 206 OK (dont evict 10, contrat 3, catalogue) |
| Vérification de types Deno | OK sur les fichiers modifiés |
| Batterie de scénarios sur le projet de test (vraies fonctions) | **73/73** (avant : 62/64) — E10 (2c, 2d, 4d), E11 (3a), boutons d'attente (7bis), « aucune fenêtre froide » sur toutes les actions |
| Tests Web (vitest) | 186 OK (dont cartes chaudes 7, vocabulaire, garde-fou) |
| Tests Flutter | 151 OK (dont vocabulaire + garde-fou) ; un test existant mis à jour (« Transmettre via WAOUH » → « Proposer mon offre ») |
| Régressions trouvées pendant la correction | 2, corrigées : (a) 2b — un accord concurrent voyait « Action indisponible » ; (b) 4c — une action portant l'ancien identifiant de négociation était bloquée alors que le fil en avait une nouvelle |

## 5. Limites — à lire avant la prod
1. **Aucune interface exécutée.** Les cartes Web sont testées en rendu statique (présence des libellés) ; les clics, l'ouverture de la fenêtre de négociation, les écrans Flutter (radar, Nexus, carte Avatar) ne sont vérifiés que par compilation et tests de libellés. Il faut les regarder sur écran.
2. **Sous-système Nexus (contact d'opportunités externes C0–C5)** : les libellés sont chauds, mais le comportement est inchangé — les résultats qui n'ont qu'un `fabric_id` (sans article, ni `catalog_id`, ni `source_id`) passent toujours par la fiche de contact de l'Avatar, pas directement par `open_deal`. Les entrer directement dans la Deal Room demande de matérialiser ces signaux côté serveur : non fait.
3. **Bouton de prix en un geste** : uniquement sur la carte Web. Les boutons de fiche produit de Flutter viennent du serveur et n'ont pas de prix suggéré dans leur libellé.
4. **WhatsApp** : les acheteurs évincés reçoivent le message via la file sortante (désactivée sur le projet de test : rien n'a été envoyé). Non testé en réel.
5. `_MapRadarActions` (Flutter) est du code mort : relabellisé, jamais affiché.
6. `waouh-agentic-core` : seule une chaîne modifiée (« Proposer mon offre »), non déployée sur le projet de test.
7. **Déploiement en prod** (non fait) : `waouh-negotiation-router`, `waouh-deal-ops`, `waouh-commerce-action`, `waouh-agentic-core`, puis Web et Flutter 18.21.0. Les E1–E6 attendent le même déploiement.
