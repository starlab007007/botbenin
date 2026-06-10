---
name: WhatsApp & App End-to-End Flow (LOCKED v9)
description: Parcours WAOUH A/B/C × Chat/Partenaire/Radar — vendeur↔acheteur, WhatsApp et/ou App, idempotent. Scénario B validé en production réelle 2026-06-10. LOCKED.
type: feature
---

# Parcours WAOUH bout-en-bout — LOCKED v8 (2026-06-10)

🔒 **Scénario B (Vendeur App + Acheteur WA) validé en condition réelle le 2026-06-10 : mise en relation, contre-offres bilatérales (acheteur ↔ vendeur), accord OUI/OUI et notifications "achat conclu / vente conclue" routés sur le bon canal pour chaque partie. Toute modification est interdite sans nouvelle approbation utilisateur explicite.**

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

### v6 — Bug fixes scénarios B/C en situation réelle (2026-06-10)

- **Bug 1 (vendeur reçoit "📩 Nouvel acheteur intéressé" 2 fois)** :
  `resolveVendorContacts` (waouh-webhook) dédupe désormais par IDENTITÉ
  destinataire (`waouh_users.id` / `auth_user_id`) au lieu de seulement par
  numéro canonique. Un vendeur App qui possède aussi un compte partner
  (business + partner phones) ne reçoit qu'**une seule** notification.
  Le `dedupe_key` du `pushToOther` match_seller inclut désormais
  `seller?.id` pour bloquer les rebonds concurrents.

- **Bug 2 ("Aucune négociation en cours" quand l'acheteur propose un prix)** :
  Pour les articles partners (`pickSource === "partner"`), `waouh-webhook`
  appelle `promoteCatalogToArticle(sb, pick.id)` AVANT l'INSERT
  `waouh_negotiations`, et remplace `pick.id` par le `waouh_articles.id`
  promu. Sans cette promotion, `article_id` pointait vers
  `waouh_unified_catalog.id` (FK invalide) et la négo était soit rejetée,
  soit orpheline, d'où le message d'erreur à l'offre suivante.

## Verrou runtime (v6)

Invariants ajoutés :
- `webhookPromotesCatalogBeforeNegotiation` (waouh-webhook contient
  `promoteCatalogToArticle` + `pickSource === "partner"` + commentaire
  `Bug 2 fix`).
- `vendorContactsSingleRecipient` (waouh-webhook contient `Bug 1 fix`,
  `seenUserKey`, `auth_user_id` dans `resolveVendorContacts`).

### v7 — Contre-offre vendeur multi-identités (2026-06-10)

**Bug** : en situation réelle scénario B, quand le vendeur (App) répondait
"je propose X" depuis WhatsApp, `waouh-negotiation-router` répondait
"🤔 Aucune négociation en cours". Cause : le sender WA (`<lid>@lid` non
résolu) créait une nouvelle ligne `waouh_users` différente du
`seller_user_id` stocké sur `waouh_negotiations` (qui pointe vers le compte
App ou le compte WA canonique). Le filtre
`or(buyer_user_id.eq.user.id,seller_user_id.eq.user.id)` retournait `null`.

**Fix** : nouveau helper partagé
`supabase/functions/_shared/waouh-identity.ts` —
`resolveSiblingUserIds(sb, user)` retourne tous les `waouh_users.id` qui
appartiennent à la même personne (même `auth_user_id`, même
`phone_number`, LID ↔ phone via `waouh_lid_phone_map`).
- `waouh-channel-in` : lookup négo via `siblingOrFilter(ids)`, `negUserId`
  ré-aligné sur l'id sibling qui correspond effectivement à buyer/seller.
- `waouh-negotiation-router` : lookup négo via `siblingOrFilter(ids)`,
  `isBuyer = siblingIds.includes(neg.buyer_user_id)`.

## Verrou runtime (v7)
- `channelInUsesSiblingIds` (channel-in contient `resolveSiblingUserIds` + `siblingOrFilter`)
- `routerUsesSiblingIds` (router contient `resolveSiblingUserIds` + `siblingIds.includes(neg.buyer_user_id)`)

### v8 — Verrouillage scénario B validé en production (2026-06-10)

Scénario B (Vendeur App + Acheteur WA) validé bout-en-bout en condition
réelle. Les correctifs v6/v7 + le rattachement LID inbound via
`waouh_outbound_queue.last_error = "delivered via <lid>@lid"` ont
définitivement résolu :
- la double notification "📩 Nouvel acheteur intéressé" côté vendeur,
- la promotion catalog→article AVANT l'insert `waouh_negotiations`,
- la résolution multi-identités (App + WA + LID) du vendeur,
- le routage des contre-offres vendeur ↔ acheteur sur leur canal natif,
- la livraison du "✅ Achat conclu" à l'acheteur WA et de la "🎉 Vente
  conclue" au vendeur App, sans inversion ni doublon.

**Règle invariante** : ne jamais retirer le fallback queue→identité de
`_shared/waouh-identity.ts` (`identityUsesDeliveredLidQueue`) ni les
filtres `siblingOrFilter` des trois edge functions
(`waouh-channel-in`, `waouh-negotiation-router`, `waouh-webhook`).

## Verrou runtime (v8)
- `identityUsesDeliveredLidQueue` (waouh-identity.ts contient
  `waouh_outbound_queue` + `delivered via` + `to_user_id`).
- Tous les invariants v1→v7 restent actifs.

### v9 — Flux B/C jouables directement depuis l'App (2026-06-10)

**Bug** : depuis `WaouhMatchChatWindow`, les contre-offres et acceptations
envoyées par un utilisateur App (vendeur scénario B, acheteur scénario C)
renvoyaient "🤔 Aucune négociation en cours". Le send invoquait
`waouh-channel-in` avec `authUserId: null` — la ligne `waouh_users` créée
n'avait ni `auth_user_id` ni `phone_number`, donc `resolveSiblingUserIds`
(v7) ne pouvait pas la lier au `seller_user_id`/`buyer_user_id` (compte App)
stocké sur `waouh_negotiations`.

**Fix** : `src/components/waouh/WaouhMatchChatWindow.tsx::send()` transmet
désormais `authUserId: authUserId ?? null` (prop déjà reçu et utilisé par
`fetchHistory`). `waouh-channel-in` enrichit alors la ligne web avec
`auth_user_id` (lignes 347-348) et le sibling resolver retrouve la négo.

**Règle invariante** : toute invocation client de `waouh-channel-in` DOIT
transmettre `authUserId` quand l'utilisateur est authentifié. Le pattern
`authUserId: null,` est interdit dans `WaouhMatchChatWindow.tsx`
(`mustNotContain` v9).

## Verrou runtime (v9)
- `chatWindow.mustNotContain` inclut `authUserId: null,` dans
  `WaouhMatchChatWindow.tsx`.
- Tous les invariants v1→v8 restent actifs.
