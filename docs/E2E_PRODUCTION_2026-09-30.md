# Test de bout en bout en PRODUCTION — 30/09/2026 (A = acheteur, B = vendeur, admin)

Données réelles (autorisées) : article « ZZ TEST E2E », comptes songbianzime@gmail.com (A), zime@africanschoolofeconomics.com (B), bot.bjdata@gmail.com (admin). Script : `scripts/waouh-chat/prod/journey-prod.mjs`.

## Résultat : 10/20 — le parcours s'arrête à la contre-proposition de B
Passé : publication, ouverture de l'article, « Intéressé » (fil X créé, thread = X), notification vendeur avec boutons, réouverture sans doublon (même X), proposition 80 000 (thread = X), réception par B avec boutons, historiques sur X.
Échec : **J6 B contre-propose → HTTP 403** ; tout ce qui suit en découle (pas de contre-proposition, pas d'accord, pas de deal, pas de livreur ni de paiement).

## Cause (confirmée par les données)
`resolveSiblingUserIds` (`_shared/waouh-identity.ts`) ne lisait que **50** identités (`waouh_users`) par compte. En production, **chaque session Web crée une ligne** : B en a **96**, A en a **177**. La ligne vendeur du fil (créée à 07:36, la plus récente) était hors des 50 → `roleIn` ne reconnaît pas B → `not_a_participant` (403). L'acheteur A s'en sort par chance (sa ligne figure dans les 50).
Conséquence en production : tout utilisateur avec plus de 50 identités peut être refusé comme « non participant » sur ses propres fils. Risque voisin : la recherche du fil par article construisait une URL avec toutes les identités (limite de longueur PostgREST).

## Correctif (prêt, NON déployé)
- lecture **paginée** des identités (pages de 1000, 3 pages au plus) ;
- recherche du fil par article **par lots de 100** identités ;
- 3 tests Deno (96 / 177 identités, pagination, compte sans auth) ; 303 tests Deno au total.
Reste à traiter en amont : pourquoi une ligne `waouh_users` par session pour un utilisateur connecté (les hooks Web lisent aussi `.limit(50)`).

## Nettoyage
L'article de test est passé en `paused` (plus visible). Fil, négociation (80 000, en attente) et 2 messages WhatsApp en file (pending/sending) laissés tels quels — WhatsApp conservé sur votre demande. À annuler avec le compte A si besoin.

## À rejouer après déploiement du correctif
`journey-prod.mjs` (parcours 1, 2, 3 avec livreur, livraison, paiement et thread_id vérifié à chaque étape).

## Correctif général (même famille d'erreurs) et doublons — 30/09
**Identités tronquées / ambiguës**
- `waouh-status-publish` : `.eq(auth_user_id).maybeSingle()` sur un compte à plusieurs lignes renvoie une erreur (donc « aucune ligne ») et **créait une nouvelle ligne `waouh_users` à chaque publication** : c'est ainsi que B a eu la ligne vendeur n° 96 au moment de publier. Remplacé par « la plus ancienne ligne » (`order created_at, limit 1`). Même motif corrigé dans `waouh-payment` (2 endroits), `waouh-buyer-interest` et `waouh-commerce-action` (choix de la ligne déterministe).
- Lecture des identités : paginée côté serveur (`waouh-identity.ts`) ; les lectures plafonnées à 50/100 (Web : notifications, fenêtres de chat, chat ; serveur : `waouh-match-history`, `waouh-deal-ops`) lisent désormais **les plus récentes d'abord**.
- Recherche du fil par article : par lots de 100 identités (longueur d'URL).
**Doublons de messages / notifications (identifiés en production, 14 jours)**
- 29 `buyer_interest` et 17 `new_buyer` écrits deux fois à 0,4–1,3 s d'écart, sans clé de dédoublonnage (double tap / double requête sur le chemin historique `waouh-deal-open`), + 1 écho « Intéressé » répété à la réouverture d'une annonce (`action_open_deal`). Les autres cas (paiement choisi, disponibilité confirmée, match) : 1 chacun.
- Correctif : `_shared/waouh-dedupe.ts` (`recentDuplicateExists`) — `waouh-deal-open` ne renotifie pas le vendeur ni ne réécrit l'écho acheteur dans la minute ; `waouh-commerce-action` n'écrit pas deux fois la même bulle en 15 s. 3 tests dédiés (306 Deno au total).
- Notifications dans l'application : clé de dédoublonnage par jour, déjà en place (`dedupe_key`) ; aucun doublon exact constaté hors ces `new_buyer`.
**Reste (structurel, non traité)** : une ligne `waouh_users` par session Web pour un utilisateur connecté (A : 177, B : 96). Nettoyage / fusion à planifier ; les lectures ci-dessus ne dépendent plus du nombre de lignes.
