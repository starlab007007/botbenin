## Diagnostic

D'après la capture et le code :

- À 22:43:48 + 22:43:50 → `deal_created` + `deal_dispatch×2` (dedupe `neg:72960c13` / `wa:sync:38838fe9`)
- À 22:44:03 + 22:44:04 → encore `deal_created` + `deal_dispatch×2` (dedupe `neg:a6fc6489` / `wa:sync:96090bf8`)

Deux séries complètes en 15 s pour la même paire acheteur/vendeur. Les dedupe keys diffèrent parce qu'une **nouvelle négociation et un nouveau `waouh_deal`** ont été créés à chaque fois.

### Cause racine

Dans `supabase/functions/waouh-negotiation-router/index.ts` (branche `intent.kind === "yes"`) :

1. Aucune vérification d'idempotence : si l'acheteur répond « oui » puis le vendeur répond « oui » (ou si l'un d'eux le répète), le router :
   - met à jour la même `waouh_negotiation` en `accepted` à nouveau,
   - **insère un nouveau `waouh_deals`** (pas d'unique sur `negotiation_id`),
   - réenvoie `deal_created` à « l'autre » (nouveau `neg.id` → nouvelle dedupe → passe),
   - rappelle `waouh-deal-dispatch` qui réenvoie `deal_dispatch` au vendeur + à l'acheteur.

2. Dans `_shared/waouh-sync.ts`, le `dedupBase` pour `deal_dispatch` n'inclut pas `dealId` ; en pratique deux dispatches pour deux deals distincts donnent deux dedupe keys distinctes → la file ne bloque pas.

3. À la deuxième acceptation, l'article est déjà marqué `sold`, mais le router ne s'en sert pas pour court-circuiter.

## Correctifs

### 1) Idempotence stricte de l'acceptation (`waouh-negotiation-router`)

Au début de la branche `yes` :

- Recharger `neg` (état le plus récent).
- Chercher un `waouh_deals` existant pour `negotiation_id = neg.id` (ou pour `(article_id, buyer_user_id, seller_user_id)` en filet de sécurité, status ≠ `cancelled`).
- Si trouvé **OU** `neg.state IN ('accepted','closed')` **OU** `article.status = 'sold'` :
  - Ne pas réinsérer de deal.
  - Ne pas renvoyer `deal_created`.
  - Ne pas rappeler `waouh-deal-dispatch`.
  - Renvoyer une réponse neutre : « ✅ Accord déjà enregistré. Le livreur WAOUH est en route. »
- Sinon, dérouler le flow actuel.

### 2) Migration : contrainte unique anti-doublon

```sql
CREATE UNIQUE INDEX IF NOT EXISTS waouh_deals_unique_per_negotiation
  ON public.waouh_deals (negotiation_id)
  WHERE status <> 'cancelled';
```

Garantit qu'au pire, l'INSERT échoue avec `23505` (et on retombe sur la branche idempotente).

### 3) Renforcement des dedupe keys (`_shared/waouh-sync.ts`)

Inclure `dealId` dans `dedupBase` quand fourni :

```
sync:${articleId}:${intent}:${user.id}:${negotiationId ?? "noneg"}:${dealId ?? "nodeal"}${suffix}
```

Effet : même si deux dispatches partent pour le même `deal_id`, la file les fusionne.

### 4) Dedupe `deal_created` (router)

Actuellement : `neg:${neg.id}:deal:${otherUserId}`. C'est bon, mais on l'aligne pour aussi inclure `deal.id` :  
`neg:${neg.id}:deal:${deal?.id ?? "nodeal"}:${otherUserId}`.

## Détails techniques

Fichiers modifiés :

- `supabase/functions/waouh-negotiation-router/index.ts` — court-circuit idempotent.
- `supabase/functions/_shared/waouh-sync.ts` — `dealId` dans `dedupBase`.
- Nouvelle migration : `UNIQUE INDEX` partiel sur `waouh_deals(negotiation_id)`.

Aucune modification côté UI (`/admin/waouh/whatsapp-ops` se contentera d'afficher moins de lignes redondantes).

## Vérification

1. Rejouer un scénario : acheteur dit « oui », puis vendeur dit « oui » → une seule ligne `deal_created` et une paire `deal_dispatch (buyer+seller)` dans `waouh_outbound_queue`.
2. Vérifier dans `/admin/waouh/whatsapp-ops` : plus de doublons sur la même négociation.
3. Logs `waouh-negotiation-router` : la 2ᵉ acceptation doit produire « accord déjà enregistré » sans appel à `waouh-deal-dispatch`.
