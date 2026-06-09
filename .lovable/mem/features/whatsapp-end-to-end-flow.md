---
name: WhatsApp & App End-to-End Flow (LOCKED v6)
description: Parcours WAOUH A/B/C × Chat/Partenaire/Radar — vendeur↔acheteur, WhatsApp et/ou App, idempotent. LOCKED.
type: feature
---

# Parcours WAOUH bout-en-bout — LOCKED v6 (2026-06-10)

🔒 **Ce flux est validé et figé pour les 9 cellules A1-A3 / B1-B3 / C1-C3. Toute modification est interdite sans nouvelle approbation utilisateur explicite.**

## Matrice couverte

|                                | Source Chat (1) | Source Partenaire (2) | Source Radar IA (3) |
|--------------------------------|-----------------|-----------------------|---------------------|
| **A** — Vendeur WA + Acheteur WA   | A1 ✅ | A2 ✅ | A3 ✅ |
| **B** — Vendeur App + Acheteur WA  | B1 ✅ | B2 ✅ | B3 ✅ |
| **C** — Vendeur WA + Acheteur App  | C1 ✅ | C2 ✅ | C3 ✅ |

## Étapes garanties (immuables)

1. **Annonce publiée** → confirmation à l'auteur (WA si vendeur WA, in-app si vendeur App).
2. **Mise en relation** → `📩 Nouvel acheteur intéressé` au vendeur + `🎯 Annonce trouvée` à l'acheteur, sur leur canal d'origine.
3. **Négociation bilatérale** via template `negotiation_open` ou bulle in-app.
4. **OUI/OUI** → exactement **1 `deal_created` logique** + **1 `deal_dispatch` par partie**, sur le canal d'origine de chaque partie. Aucun doublon.

## Verrous techniques

### v1 — Résolution LID (WA)
- `lidToPhoneInline()` (`_shared/waouh-format.ts`) + cache `waouh_lid_phone_map`.
- Appliqué dans `waouh-channel-in` et `waouh-outbound-dispatch`.

### v2 — Idempotence acceptation
- `waouh-negotiation-router` branche `yes` : court-circuit `deal_already_accepted`, catch `23505`, `suppress_direct_reply`.
- Migration : `UNIQUE INDEX waouh_deals_unique_per_negotiation`.

### v2 — Idempotence queue
- RPC `waouh_enqueue_outbound_v2` : `pg_advisory_xact_lock` + dédup par `deal_id`.
- `pushSyncedEvent` : `dedupBase` inclut `dealId`.

### v5 — Parcours B et C (in-app mirror)
- **`_shared/waouh-sync.ts`** : le canal d'écriture `waouh_messages` est calculé
  `web > app > whatsapp > system` (`auth_user_id ? "app"` pour les utilisateurs App authentifiés sans session web active). Garantit l'affichage in-app de tous les évènements même sans WhatsApp.
- **`waouh-negotiation-router/pushToOther`** : même calcul de canal (`web > app > system`), pour que les contre-offres et refus apparaissent dans `WaouhMatchChatWindow` côté App.
- **`waouh-notify-dispatch`** : quand la cible est App-only (channel `waouh_app`, pas de numéro WA), on appelle `pushSyncedEvent` pour insérer le `waouh_messages` qui alimente la `WaouhMatchChatWindow`.
- **`waouh-e2e-test`** mode `whatsapp_full` : accepte `scenarios: ("A"|"B"|"C")[]`. Pour B le vendeur est traité comme App-only (insert direct dans `waouh_messages` au lieu de WA send). Idem pour C côté acheteur.

## Verrou runtime (v5)

Nouveaux invariants enforced par `src/components/waouh/waouhChatSyncLock.ts` + test :
- `appChannelInSyncedEvent` (waouh-sync.ts contient `auth_user_id ? "app"`)
- `appNotifyDispatchMirror` (notify-dispatch contient `pushSyncedEvent` + commentaire `App-only target`)
- `appRouterChannel` (router pushToOther contient `target.auth_user_id ? "app"`)
- `e2eScenariosBC` (e2e-test contient `scenarios: Scenario[]`, `sellerIsApp`, `buyerIsApp`)

## Règles invariantes (NE JAMAIS violer)

- Ne jamais retirer le calcul de canal `web > app > whatsapp > system` de `pushSyncedEvent`.
- Ne jamais retirer le miroir `pushSyncedEvent` du branch App-only de `waouh-notify-dispatch` (sinon B/C deviennent silencieux côté App).
- Ne jamais retirer la branche `target.auth_user_id ? "app"` de `pushToOther` (sinon les contre-offres disparaissent du chat App).
- Ne jamais réinsérer un `waouh_deals` pour la même `negotiation_id` (`UNIQUE INDEX` + 23505).
- `deal_dispatch` reste la seule source de la notif finale "vente conclue / achat confirmé".
- Ne jamais supprimer l'index unique ou l'advisory lock.
- Le flux chat web (`mem://features/waouh-chat-sync-flow`) reste également verrouillé.
