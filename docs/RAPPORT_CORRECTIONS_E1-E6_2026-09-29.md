# Rapport de correction — E1 à E6 (29/09/2026)

Branche `claude/harmonisation-phase-0-1` (PR #64). **Rien n'est déployé en production.** Les corrections sont vérifiées sur le projet de test `botbj-test-e2e` avec les vraies edge functions ; la prod n'est pas touchée.

## Résumé
| # | Sujet | Correction | Tests unitaires | Vérification réelle (projet de test) |
|---|---|---|---|---|
| E1 | Notification « Nouvel acheteur » sans boutons | `waouh-notify-dispatch` lit `actions`, `thread_id`, `negotiation_id` et les transmet au message du fil, à la file WhatsApp et à la carte de notification ; `waouh-sync` n'écrase plus `actions` par `[]` | 5 (`waouh-notify-actions-test.ts`) | **Avant** : `boutons=[]`. **Après** : `["accepter","contre-proposition","refuser"]` |
| E2 | « Le vendeur est prévenu » sans vérification | `waouh-deal-open` : `sellerNotified` = réponse HTTP réellement OK (`dispatchSucceeded`) ; le catalogue affiche « Le vendeur n'est pas encore prévenu. » en cas d'échec ; propagé à commerce-action, webhook, channel-in | 5 (deal-open) + 2 (catalogue) | Dispatcheur retiré : `« Le vendeur n'est pas encore prévenu. »` |
| E3 | Ordre de la chronologie inversé | `waouh-commerce-action` écrit l'écho de l'action **avant** l'exécution du moteur quand le fil existe (`shouldEchoBeforeExecute`) | 3 (`waouh-internal-call-test.ts`) | J14 : 3 échecs → 3 réussites (écho #8 < réponse #10, #13 < #14, #5 < #6) |
| E4 | Article vendu = « Article déjà réservé » | Clé `article_sold` (« Article vendu ») + `unavailableKey(status)` dans commerce-action (3 sites), negotiation-router (expose `article_status`), channel-in, webhook | 2 + suite « chaque message » étendue à `article_sold` | Re-achat d'un article vendu : `clé=article_sold`, titre « Article vendu » |
| E5 | Identité du lecteur prise dans le corps | `waouh-match-history` : identité = jeton (JWT) ; `authUserId` différent → 403 ; `authUserId` sans jeton → 401 ; session au format strict (fin de l'injection dans le filtre `.or()`) | 8 (`waouh-viewer-identity-test.ts`) | 403 usurpation, 401 sans jeton, 403 « viewer not linked », 400 injection, 200 lecteur légitime |
| E6 | Fonction interne absente = « Action indisponible » | `classifyInternalFailure` : 404 `NOT_FOUND`, réseau, 502/504 → erreur technique tracée (`console.error`) et relançable ; 4xx métier inchangé ; `callInternal` ne lève plus | 5 | Routeur retiré : `technical_error` « Rien n'a été validé » (avant : `out_of_stage`) |

## Preuves
- Tests unitaires : 192 tests `_shared` OK (Deno, carte d'import locale pour `deno.land`), dont 44 nouveaux ou étendus ; 167 tests Web OK, garde-fou `waouh-chat-sync-flow.lock` compris.
- Vérification de types (`deno check`) : OK sur les 12 fichiers modifiés.
- Parcours acheteur → contre-proposition → livraison → paiement sur le projet de test : **29/29** étapes (avant corrections : 19/23), script `scripts/waouh-chat/test-project/journey-buyer-seller-counter.mjs` (étendu : E4, E5a-e).
- E2 et E6 : vérifiés en retirant temporairement `waouh-notify-dispatch` puis `waouh-negotiation-router` du projet de test ; les deux fonctions ont été redéployées, les 8 fonctions sont `ACTIVE`.

## Limites et points d'attention (à lire avant tout déploiement en prod)
1. **E5 peut changer le comportement de clients existants.** Ni le Web ni Flutter n'envoient l'en-tête `x-waouh-session` : j'ai donc conservé le mode invité par `sessionId` seul. Conséquence : un utilisateur connecté dont le jeton a expiré est traité comme invité (il ne voit plus les lignes rattachées à son compte tant que la session n'est pas rafraîchie). **Non testé avec l'application Web ni Flutter réelles** : à valider sur le projet de test avant la prod.
2. **Résidu E5** : le `sessionId` reste un secret porteur (quiconque le connaît lit l'historique de cette session). Le durcir demanderait d'exiger l'en-tête signé côté clients : décision à prendre.
3. **E1 — vérifié dans l'historique servi par `waouh-match-history` (côté vendeur)**, pas dans le contenu de `waouh_outbound_queue` ni de `waouh_notifications` (connecteur SQL indisponible, connexion directe à la base bloquée). Le code écrit les boutons dans ces deux endroits (payload).
4. **Nouvelle observation (non corrigée) — E9 (sécurité)** : `waouh-notify-dispatch` n'authentifie pas son appelant (`verify_jwt = false`, aucun contrôle). Tous ses appelants dans le dépôt sont des edge functions internes ; avec E1 il transmet maintenant des boutons fournis par l'appelant (nettoyés : 5 boutons, longueurs bornées, `id`/`label` obligatoires), mais `extra_text` reste libre, comme avant. Correction proposée : exiger `Authorization: Bearer <clé service>`. Elle n'est pas faite car elle touche l'ensemble des appelants (radar, diffusion, webhook…).
5. E7 (fire-and-forget de `waouh-status-publish`) et E8 (`waouh-sell-handler` historique) ne faisaient pas partie de la demande : **non traités**.
6. Écho (E3) : au premier contact (pas encore de fil), l'écho reste écrit après l'ouverture, comme avant ; l'ordre y était déjà correct.
7. `waouh-channel-in` et `waouh-webhook` (WhatsApp) modifiés mais **non déployés ni exécutés** sur le projet de test (vérification de types et lecture seulement).
8. Le message d'échec E2 est dans le catalogue partagé : il sera lu identiquement sur Web, Flutter et WhatsApp. Flutter n'a pas besoin de changement (il affiche `reply` du serveur).

## Fichiers
Nouveaux : `_shared/waouh-notify-actions.ts`, `waouh-internal-call.ts`, `waouh-viewer-identity.ts` (+ 3 fichiers de tests). Modifiés : `waouh-notify-dispatch`, `waouh-commerce-action`, `waouh-match-history`, `waouh-negotiation-router`, `waouh-channel-in`, `waouh-webhook`, `_shared/waouh-deal-open.ts`, `waouh-message-catalog.ts`, `waouh-sync.ts` (+ tests catalogue et deal-open).

## Pour passer en production (proposition, non exécutée)
1. Valider E5 avec l'application Web et Flutter contre le projet de test.
2. Fusionner la PR #64 (déclenche les déploiements) ou déployer explicitement les fonctions modifiées, dans cet ordre : `waouh-notify-dispatch`, `waouh-negotiation-router`, `waouh-commerce-action`, `waouh-match-history`, puis `waouh-channel-in` et `waouh-webhook`.
3. Rejouer le parcours de bout en bout sur un article de test après déploiement.
