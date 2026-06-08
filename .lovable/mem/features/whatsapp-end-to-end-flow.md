---
name: WhatsApp End-to-End Flow (LOCKED v1)
description: Vendor↔Buyer 100% WhatsApp flow — LID privacy resolution + outbound notifications/counters/accord. Locked, do not regress.
type: feature
---

# Parcours WhatsApp bout-en-bout — LOCKED v1 (2026-06-08)

Couvre le scénario où **vendeur ET acheteur sont sur WhatsApp** (pas de chat web). Le flux doit fonctionner identiquement quel que soit le mode de privacy WAHA (LID anonyme inclus).

## Étapes garanties

1. **Vendeur** : `Je vends X` → article créé + bulle "✅ Annonce publiée" sur WhatsApp.
2. **Acheteur** : `Je cherche X` → liste résultats → `intéressé 1`.
3. **Vendeur** reçoit `📩 Nouvel acheteur intéressé` sur WhatsApp (template `match_seller`).
4. **Acheteur** ou **Vendeur** : `Je propose 50000` → contre-offre transmise via `negotiation_open` template (les deux sens).
5. **OUI / NON** → `deal_created` ou `negotiation_closed` → notifications WhatsApp bilatérales.

## Verrou technique — résolution LID

WAHA livre certains contacts sous `<lid>@lid` (privacy mode). Sans résolution, `waouh_users.phone_number` stocke `@lid` et toutes les sorties WhatsApp échouent avec `lid unresolved (no phone)`.

**Helper canonique** : `lidToPhoneInline()` dans `supabase/functions/_shared/waouh-format.ts`
- Cache DB `waouh_lid_phone_map` (lid → phone_e164).
- Fallback live `GET /api/contacts/all?session=...` puis upsert dans la map.
- Retourne les chiffres E.164 (sans `+`) ou null.

**Points d'application** :
- `waouh-channel-in/index.ts` (inbound) : résout `@lid` → vrai numéro AVANT l'upsert `waouh_users`, et backfille les `waouh_users.phone_number = <lid>@lid` historiques.
- `waouh-outbound-dispatch/index.ts` : dernière chance avant envoi WAHA — résout encore via `lidToPhoneInline` et backfille le user destinataire.

## Verrou runtime

`src/components/waouh/waouhChatSyncLock.ts` v2 documente les invariants :
- `whatsappLidResolution` : `waouh-channel-in` doit contenir `lidToPhoneInline` + log `lid resolved`.
- `whatsappOutboundDispatch` : `waouh-outbound-dispatch` doit contenir `lidToPhoneInline` + branche `lid unresolved`.

## Tables impliquées (lecture seule pour ce flux)

- `waouh_users` (phone_number ré-écrit lors d'une résolution LID)
- `waouh_lid_phone_map` (cache LID ↔ E.164, upsert idempotent par `lid`)
- `waouh_articles`, `waouh_negotiations`, `waouh_deals`, `waouh_messages`, `waouh_outbound_queue`

## Règles invariantes

- **Ne jamais** stocker un `@lid` durablement dans `waouh_users.phone_number` si une résolution est possible.
- **Toujours** persister la résolution LID dans `waouh_lid_phone_map` pour les appels suivants.
- **Toujours** réessayer la résolution LID dans le dispatcher juste avant l'envoi WAHA.
- Le flux chat web (WaouhMatchChatWindow) reste verrouillé tel que défini dans `mem://features/waouh-chat-sync-flow`.
