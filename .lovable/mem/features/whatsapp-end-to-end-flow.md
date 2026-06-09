---
name: WhatsApp End-to-End Flow (LOCKED v2)
description: Vendor↔Buyer 100% WhatsApp flow — LID resolution + idempotent deal_created/deal_dispatch. LOCKED, do not modify.
type: feature
---

# Parcours WhatsApp bout-en-bout — LOCKED v2 (2026-06-09)

🔒 **Ce flux est validé et figé. Toute modification est interdite sans nouvelle approbation utilisateur explicite.**
Couvre le scénario où **vendeur ET acheteur sont sur WhatsApp** (pas de chat web), peu importe le mode privacy WAHA (LID inclus).

## Étapes garanties (immuables)

1. **Vendeur** : `Je vends X` → article créé + bulle "✅ Annonce publiée" sur WhatsApp.
2. **Acheteur** : `Je cherche X` → liste résultats → `intéressé 1`.
3. **Vendeur** reçoit `📩 Nouvel acheteur intéressé` (template `match_seller`), **une seule fois**.
4. Contre-offres bilatérales via template `negotiation_open`.
5. **OUI/OUI** → exactement **1 `deal_created` logique** + **1 `deal_dispatch` par partie** (vendeur "vente conclue", acheteur "achat confirmé"). Aucun doublon.

## Verrous techniques

### 1. Résolution LID (v1 — toujours en vigueur)
- Helper canonique `lidToPhoneInline()` (`supabase/functions/_shared/waouh-format.ts`) + cache `waouh_lid_phone_map`.
- Appliqué dans `waouh-channel-in` (inbound) ET `waouh-outbound-dispatch` (dernière chance avant WAHA).

### 2. Idempotence acceptation (v2 — nouveau)
- `waouh-negotiation-router` branche `yes` :
  - Court-circuit si `waouh_deals` existe déjà pour `negotiation_id` OU `neg.state IN ('accepted','closed')`.
  - Catch `23505` sur insert deal → bascule sur la branche idempotente.
  - Réponse directe neutre `"✅ Accord enregistré..."` avec flag `suppress_direct_reply: true`.
- `waouh-channel-in` : si `suppress_direct_reply === true`, **ne pousse PAS** de réponse WAHA directe (laisse `waouh-deal-dispatch` être l'unique source du message final).
- Migration : `UNIQUE INDEX waouh_deals_unique_per_negotiation ON waouh_deals(negotiation_id) WHERE status <> 'cancelled'`.

### 3. Idempotence queue (v2 — nouveau)
- RPC `waouh_enqueue_outbound_v2` : `pg_advisory_xact_lock(hash(event_type, to_user_id, deal_id))` + dédup sur `payload->>'deal_id'` pour `deal_dispatch`/`deal_created` en statut `pending|sending|sent`.
- Index `idx_waouh_queue_deal_event_user_lookup`.
- `_shared/waouh-sync.ts` : `dedupBase` inclut `dealId` → `sync:${art}:${intent}:${user}:${neg}:${deal}${suffix}`.

## Verrou runtime

`src/components/waouh/waouhChatSyncLock.ts` v3 documente les invariants. Le test
`src/components/waouh/__tests__/waouh-chat-sync-flow.lock.test.ts` échoue si un
des marqueurs ci-dessous est supprimé.

Invariants ajoutés en v2 (au-delà de v1 LID) :
- `whatsappAcceptanceIdempotence` (`waouh-negotiation-router`) : doit contenir `deal_already_accepted`, `suppress_direct_reply`, et le catch `23505`.
- `whatsappChannelInSuppress` (`waouh-channel-in`) : doit contenir `suppress_direct_reply`.
- `whatsappQueueDedup` (`_shared/waouh-sync.ts`) : `dedupBase` doit inclure `${dealId ?? "nodeal"}`.
- `whatsappEnqueueLock` (migration `waouh_enqueue_outbound_v2`) : doit contenir `pg_advisory_xact_lock` et le check `deal_id`.

## Règles invariantes (NE JAMAIS violer)

- Ne jamais stocker `@lid` durablement dans `waouh_users.phone_number` si résolvable.
- Ne jamais réinsérer un `waouh_deals` pour la même `negotiation_id`.
- Ne jamais envoyer `deal_created` ET `deal_dispatch` avec le même contenu — `deal_dispatch` est la seule source de la notif finale.
- Ne jamais retirer la dédup `dealId` du `dedupBase`.
- Ne jamais supprimer l'index unique ou l'advisory lock.
- Le flux chat web (`mem://features/waouh-chat-sync-flow`) reste également verrouillé.
