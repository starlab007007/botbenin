# WAOUH Chat — Parcours unifié v3

Référence fonctionnelle : document « WAOUH Chat — Parcours unifié v3 ».
Base : `prod` @ `9be01e74`. Deux lots, chacun réversible par interrupteur,
sans redéploiement.

## Ce qui change pour l'utilisateur

| Avant | Après |
|---|---|
| « Intéressé » puis un prix → « Aucune négociation en cours » (capture 1) | Le message ouvre fil + négociation ; l'offre part au vendeur |
| Bandeau « Mode provisoire actif… Réessayer » dans la Deal Room Flutter | Barre de progression fine, reprises silencieuses |
| « intéressé 1 » → texte figé « Mise en relation déjà ouverte » sans bouton (capture 2) | Vérification de la négociation réelle, fil + boutons renvoyés |
| Trois chemins d'entrée qui ouvraient (ou non) la négociation | Une seule ouverture : `_shared/waouh-deal-open.ts` |
| Un prix pouvait s'appliquer à la négociation d'un autre produit | La négociation DE L'ARTICLE du message est cherchée d'abord |
| Textes longs, emoji, filets, 4 boutons | Titre ≤ 5 mots + une ligne ≤ 90 caractères + 3 boutons (Lot 2) |

## Lot 1 — correctif (actif au déploiement)

| Fichier | Changement |
|---|---|
| `supabase/functions/waouh-channel-in/index.ts` | Ouverture directe (interrupteur `chat_interest_fastpath`), recherche par article, offre identique non renvoyée, `auth_user_id` gardé en mémoire (identités sœurs complètes), `isSeller` corrigé, `thread_id`/`negotiation_id` dans toutes les réponses |
| `supabase/functions/waouh-webhook/index.ts` | « Déjà ouverte » vérifiée + boutons, prix sur article connu → ouverture, `thread_id`/`negotiation_id`/`stage` renvoyés, indice `article_hint` |
| `supabase/functions/waouh-buyer-interest/index.ts` | Appelle l'ouverture commune (réponse identique + `stage`, `created`) |
| `supabase/functions/_shared/waouh-deal-open.ts` | Ouverture commune, idempotente sur article × acheteur |
| `supabase/functions/_shared/waouh-interest-fastpath.ts` | Décision pure (testée) |
| `supabase/functions/_shared/waouh-message-catalog.ts` | Catalogue unifié (utilisé seulement si `chat_catalog_v3`) |
| `supabase/functions/_shared/waouh-commands.ts` | Boutons de fiche `je-veux:` `proposer-prix:` `poser-question:` + libellés v3 |
| `flutter_waouh_app/lib/live/live_match_chat_v2.dart` | Bandeau provisoire et sous-titre « synchronisation… » supprimés |
| `supabase/migrations/20260928092242_waouh_chat_v3_flags.sql` | Interrupteurs v3 |
| `src/components/admin/WaouhAdminCommandCenter.tsx` | Libellés Command Center |
| `src/components/waouh/waouhChatSyncLock.ts` | Verrou v15 (invariants v3) |

## Lot 2 — parcours unifié (déployé coupé à l'origine ; ACTIVÉ en production depuis le 28/09/2026)

> État constaté le 29/09/2026 dans `waouh_admin_module_controls` (projet `mvynepqulhflxtyymtzs`) : `chat_catalog_v3` activé le 28/09 10:59 UTC et `commerce_action_v3` activé le 28/09 12:45 UTC. Voir `docs/AUDIT_HARMONISATION_2026-09-29.md`.

| Brique | Fichiers |
|---|---|
| Point d'entrée unique, idempotent | `supabase/functions/waouh-commerce-action/index.ts`, migration `20260928092245_waouh_commerce_actions.sql` |
| Contrat v3, tour, boutons calculés | `_shared/waouh-commerce-contract.ts` |
| Texte libre strict (règles → contexte → modèle contraint) | `_shared/waouh-free-text.ts` |
| Prédictif (prix suggéré, meilleure action, délai médian, relances, expiration, paiement) | `_shared/waouh-predictive.ts` |
| Catalogue appliqué aux moteurs | `waouh-negotiation-router`, `waouh-deal-ops` (textes historiques si coupé) |
| Web | `src/lib/waouh/commerceAction.ts`, `WaouhDealStepper.tsx`, `WaouhMatchChatWindow.tsx`, `WaouhProductCard.tsx`, `WaouhWebChat.tsx` |
| Flutter | `live_commerce_action_client.dart`, `live_deal_journey.dart`, `live_match_chat_v2.dart`, `live_controller.dart`, `live_widgets.dart`, `live_commerce_workflow.dart` |

Règles garanties par les tests :

- une action d'argent déduite d'un texte libre n'est jamais exécutée sans tap (`pending` + « Confirmer ») ;
- aucune valeur prédictive inventée : délai affiché seulement avec 5 échantillons ou plus, sinon rien ;
- 3 boutons au plus, aucun bouton quand ce n'est pas le tour de l'utilisateur ;
- mêmes identifiants de boutons qu'avant : WhatsApp, Web et Flutter restent compatibles.

## Déploiement

```bash
export SUPABASE_PROJECT_REF=...
./scripts/waouh-chat-v3/deploy.sh          # plan
./scripts/waouh-chat-v3/deploy.sh --apply  # migrations puis 6 fonctions
```

Puis build Web et Flutter habituels. Flutter n'a pas pu être compilé dans
l'environnement de préparation : lancer `flutter analyze` et `flutter test`
(nouveau test : `test/live_deal_journey_v3_test.dart`) avant le build.

## Activation et retour arrière

`scripts/waouh-chat-v3/flags.sql` : étape A (`chat_catalog_v3`), étape B
(`commerce_action_v3`) après 24 h, requêtes de suivi, retour arrière brique par
brique. Couper `chat_interest_fastpath` rétablit le comportement d'avant le Lot 1.

## Vérification

- `./scripts/waouh-chat-v3/smoke.sh` : captures 1 et 2 contre le projet (article de test).
- Deno : `supabase/functions/_shared/*-test.ts` (152 tests).
- Web : `npx vitest run src/components/waouh src/lib` (182 tests).

## Critères d'acceptation

1. Intérêt + prix sur un article : offre envoyée, Deal Room ouverte, jamais « Aucune négociation en cours ».
2. La réponse porte `thread_id` au premier aller-retour ; plus de bandeau provisoire.
3. Pour une même étape, textes identiques sur Web, Flutter et WhatsApp (catalogue actif).
4. Aucune action d'argent exécutée depuis le texte libre sans tap de confirmation.
5. Chaque brique se coupe par interrupteur ; l'ancien comportement revient immédiatement.
