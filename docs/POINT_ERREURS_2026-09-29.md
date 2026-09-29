# Point des erreurs après tests — 29/09/2026

Sources : parcours réels sur le projet de test `botbj-test-e2e` (scripts `scripts/waouh-chat/test-project/`), lecture du code, audit de production en lecture seule.
Légende « preuve » : **observé** = constaté à l'exécution ; **code** = lu dans le dépôt, non exécuté en production ; **déduit** = conséquence logique, à confirmer.

## 1. Production
| # | Erreur | État |
|---|---|---|
| P1 | Garde-fou de thread : `min(uuid)` n'existe pas ; 11 insertions de messages en échec en prod le 29/09. | **Corrigé en prod**, définition vérifiée. Pas de vrai message rejoué en prod. |
| P2 | Migration numérotée `20260929131943` en prod, `20260929130000` dans le dépôt. | Ouvert : à aligner avant tout `db push`. |

## 2. Erreurs de code (dépôt, ouvertes)
| # | Gravité | Erreur | Preuve |
|---|---|---|---|
| E1 | majeur | La notification « Nouvel acheteur » reçue par le vendeur n'a aucun bouton (Accepter / Contre-offre / Refuser). **Trois indices concordants** : (a) dans `waouh-notify-dispatch`, `actions: []` est écrit en dur ; (b) `waouh-deal-open` calcule et envoie `actions`, `thread_id`, `negotiation_id`, mais le dispatcheur ne les transmet jamais à `pushSyncedEvent` ni à la file sortante ; (c) l'historique du vendeur affiche `boutons=[]` pour cette notification. Le vendeur ne peut répondre qu'après la première offre de prix. | code + observé |
| E2 | moyen | `waouh-deal-open` met `sellerNotified = true` après un `fetch` sans vérifier `response.ok` ; l'acheteur lit « Le vendeur est prévenu » même si la notification a échoué. | observé (fonction absente) |
| E3 | moyen | Ordre de la chronologie inversé pour `seller_confirm`, `pay_mode`, `confirm_payment` : la réponse du système est écrite avant l'écho de l'action. | observé (3 échecs) |
| E4 | mineur | **Message inexact** : un article **vendu** répond « Article déjà réservé ». Les statuts `sold` et `reserved` partagent la même clé `article_reserved` dans `waouh-deal-open` (jeu `UNAVAILABLE_STATUSES`, l. 71) ; même regroupement dans `waouh-commerce-action` (l. 86) et `waouh-promote` (l. 77). Correction : clé distincte `article_sold` (« vendu »). Non corrigé, en attente de ta décision. | observé + code |
| E5 | sécurité | `waouh-match-history` prend l'identité du lecteur dans `auth_user_id` du corps, avec la clé service. | code + observé |
| E6 | moyen | Une fonction interne absente est masquée en « Action indisponible » (`out_of_stage`) : tout retour non OK du routeur est traité pareil. | observé |
| E7 | moyen | **Échecs silencieux en arrière-plan** : la publication (`waouh-status-publish`) lance `waouh-notify-buyers` en « fire & forget » avec `.catch(() => {})` ; elle répond `ok: true` même si la notification des acheteurs n'a pas eu lieu. | code (déduit pour le résultat) |
| E8 | faible | Chemin de publication historique `waouh-sell-handler` : dépend de `LOVABLE_API_KEY` et d'une colonne `phone` qui n'existe plus (`phone_number`). Il ne semble pas utilisé par le Web ni Flutter. À confirmer puis retirer ou documenter. | code |

Rappel : la publication de l'appli (Web **et** Flutter) passe par `waouh-status-publish` ; c'est elle qui crée l'article (`status: active`, `origin: status`) et le statut 24 h, puis déclenche la notification des acheteurs.

## 3. Limites des tests (à ne pas prendre pour des succès)
| # | Limite | Effet |
|---|---|---|
| L1 | **Offre non réaliste** : offre de 130 000 codée en dur dans le premier script, sur un article à 320 000. Le montant du deal suit bien la dernière offre, mais le scénario n'est pas représentatif. (Le parcours avec contre-proposition, 300 000 → 250 000 → 280 000, est plus réaliste.) | valide le calcul, pas le comportement d'un vrai marchandage |
| L2 | **Acheteurs correspondants non prévenus** : `waouh-notify-buyers`, appelée en arrière-plan à la publication, n'est pas déployée sur le projet de test. | la notification aux acheteurs qui correspondent n'est pas testée |
| L3 | Non testés : interface Web (`/app/chat`), application Flutter, recherche par l'acheteur, WhatsApp réel, publication avec photos. | parité Web/Flutter non mesurée sur ce projet |
| L4 | Simulés : compte admin de test (`has_role` limité), livreur au registre, `waouh_enqueue_outbound_v2` simplifiée, migration command center condensée, pas de FK vers `auth.users`, aucun secret WhatsApp. | écarts avec la production |
| L5 | Vérification SQL par le CLI : connexion au pooler Postgres expirée ; connecteur Supabase déconnecté. | E1 repose sur code + historique, pas sur une lecture de la base |

## 4. Constats de l'audit, toujours ouverts
- Sécurité : `waouh-stock-ingest` (SSRF), `waouh-presence-public-page` (PIN attaquable par force brute), `waouh-chat-health` et `waouh-studio-pair-code-v2145` (imports distants).
- 19 fonctions rapatriées sont retranscrites à la main, non comparées aux versions déployées.
- Migrations : 286 en prod contre 263 dans le dépôt (hors les 2 migrations de prod versionnées).
- Embeddings `gemini-embedding-2` : prêts dans le code, ni déployés ni réindexés.
- Flutter : pagination de l'historique, inbox côté serveur, décision sur pièces jointes / file hors-ligne.

## 5. Risques non tranchés
- Le `supabase/config.toml` du dépôt fait échouer `supabase functions deploy` avec le CLI 2.117 (`CliConfigParseError`) ; le workflow « Deploy WAOUH Chat v2 » utilise la même version. Non vérifié dans le workflow.
- Dépendances de déploiement non documentées : `waouh-commerce-action` exige `waouh-negotiation-router`, `waouh-deal-ops`, `waouh-notify-dispatch` (+ table `waouh_buyer_profiles`).
- Secrets exposés dans la conversation (clé Gemini, jeton Supabase) : à révoquer.

## 6. Erreurs de mes scripts, corrigées
Critère `ok:false` compté comme réussi ; appel d'une fonction SQL inexistante ; 10 tables manquantes annoncées, 12 puis 13 réelles ; échecs J9b/J10a dus à l'auto-assignation normale du livreur, non à un défaut.
