
# Plan de correction — Vendeur WhatsApp ne reçoit plus les notifications

## Cause racine
Quand WAHA livre un contact en mode privacy `<lid>@lid`, la chaîne suivante corrompt les données :

```text
WAHA contacts.all  →  waouh_lid_phone_map.phone_e164 = "+<lid>" (FAUX, c'est le LID lui-même)
                  →  lidToPhoneInline renvoie ce LID comme "phone"
                  →  waouh-channel-in préfixe "229" → 229<15chiffres> (18 chiffres impossibles)
                  →  waouh_users.phone_number écrasé avec cette valeur
                  →  outbound-dispatch envoie à WAHA → check-exists=false → "no WA contact"
```

Deux victimes confirmées en DB :
- Vendeur `930637cc` → `phone_number = 229196705878298786` (LID réel : `196705878298786@lid`)
- Acheteur `557f3453` → `phone_number = 229273091318042723` (LID réel : `273091318042723@lid`)

Tous les `match_seller`, `negotiation_open`, `deal_seller`, `deal_buyer` pour ces users échouent.

## Correctifs (5 verrous, ordre d'exécution)

### 1. `_shared/waouh-format.ts` — `lidToPhoneInline` strict
Avant de renvoyer un `phone` issu de `waouh_lid_phone_map` ou de WAHA contacts :
- Refuser si `phone == lid` ou `phone_e164 == "+" + lid`.
- Refuser si longueur hors plage E.164 (8 à 13 chiffres).
- Refuser si commence par `1967`, `2730`… (préfixes typiques de LID, non assignés à des pays). Test simple : doit commencer par un indicatif pays connu (`229`, `225`, `234`, `33`, etc.) OU avoir 8 chiffres typiques Bénin.
- Retourner `null` sinon → upstream tombe proprement en `lid unresolved`.

### 2. `waouh-channel-in/index.ts` (ligne 271-288) — pas de préfixe 229 sur >10 chiffres
```ts
if (lidDigits && lidDigits.length >= 8 && lidDigits.length <= 12) {
  const resolved = lidDigits.startsWith("229") ? lidDigits
                 : lidDigits.length <= 10 ? `229${lidDigits.replace(/^0/, "")}`
                 : null;
  if (resolved && /^229\d{8,10}$/.test(resolved)) { … } 
}
```
Si pas résolu valide : **garder `phone = <lid>@lid`** pour que les couches suivantes redéclenchent la résolution (au lieu de pourrir le `phone_number`).

### 3. `waouh-outbound-dispatch/index.ts` — `normalizeBeninPhone` plafonné
```ts
if (digits.length > 13) return null;   // refuse les LID camouflés
if (digits.startsWith("229") && digits.length > 13) return null;
```
Et juste avant `check-exists`, si `to_phone` matche `^229\d{12,}$` : forcer la branche LID resolution (`<digits without 229>@lid`).

### 4. `waouh-waha-sync-contacts` — ne plus écrire `phone_e164 = lid`
Lors du sync :
- Si WAHA ne renvoie qu'un `lid` sans `phoneNumber` réel : insérer la row avec `phone = NULL` et `phone_e164 = NULL`.
- Plus jamais `phone_e164 = "+" + lid`.

### 5. Migration SQL — assainissement + garde-fou
```sql
-- a) Purge mapping corrompu (phone_e164 == "+" || lid)
UPDATE public.waouh_lid_phone_map
   SET phone = NULL, phone_e164 = NULL
 WHERE phone_e164 IS NOT NULL
   AND regexp_replace(phone_e164, '\D','','g') = lid;

-- b) Repair waouh_users corrompus → re-coller @lid
UPDATE public.waouh_users
   SET phone_number = substr(phone_number, 4) || '@lid'
 WHERE phone_number ~ '^229\d{12,}$';

-- c) Re-queue les messages échoués pour ces users (un seul retry)
UPDATE public.waouh_outbound_queue
   SET status='pending', attempts=0, next_attempt_at=now(), last_error=NULL
 WHERE status='failed'
   AND last_error LIKE 'no WA contact for 229%'
   AND length(regexp_replace(to_phone,'\D','','g')) > 13;

-- d) Contrainte préventive
ALTER TABLE public.waouh_lid_phone_map
  ADD CONSTRAINT waouh_lid_phone_map_no_self_phone
  CHECK (phone_e164 IS NULL OR regexp_replace(phone_e164,'\D','','g') <> lid);
```

## Vérification post-déploiement
1. `SELECT phone_number FROM waouh_users WHERE id IN ('930637cc…','557f3453…');` → doit afficher `196705878298786@lid` puis (après inbound) le vrai numéro résolu, OU rester en `@lid` si WAHA n'a vraiment pas le numéro.
2. Lancer un message inbound réel depuis le vendeur. Les logs `waouh-channel-in` doivent montrer soit `lid resolved` avec un vrai numéro 229XXXXXXXXX, soit pas de backfill.
3. Re-trigger `waouh-outbound-dispatch` : les 6 messages re-queue doivent partir en `sent` ou rester en `lid unresolved` (au lieu de la fausse "réussite" précédente).
4. Surveiller `/admin/waouh/whatsapp-ops` : plus aucune ligne `no WA contact for 229\d{12,}`.

## Limite connue
Si WAHA ne livre vraiment jamais le vrai numéro derrière un `@lid` (privacy mode strict, contact pas dans le carnet WhatsApp Business), aucune correction logicielle ne peut envoyer un message — il faut que le vendeur écrive en premier au numéro WAOUH pour révéler son E.164. Le code rendra ce cas visible (`lid unresolved`) au lieu de le masquer en faux 18-chiffres.
