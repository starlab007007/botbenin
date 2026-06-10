# Scénario B avec source Radar IA — reconnecter l'acheteur WA scrapé au vendeur App

## Contexte

Le flux Radar IA existe déjà côté outreach (webhook ligne 674-703) :

- Quand un vendeur App publie un article, on contacte automatiquement chaque acheteur Radar IA (signaux `BUY` avec `contact_phone` identifié) via le template WhatsApp `radar_buyer_outreach`. Le payload inclut `article_id` et `radar_signal_id`.
- L'envoi est tracé dans `waouh_outbound_queue (template = "radar_buyer_outreach", to_phone, payload)`.

## Diagnostic

Mais **aucun retour** n'est branché : quand l'acheteur Radar répond *"OUI"* (ou *"Je propose X"*) sur WhatsApp :

1. `waha-webhook` → `waouh-channel-in` → un `waouh_users` est créé pour ce numéro (sans `auth_user_id`, sans contexte).
2. Aucune `meta.article_id` n'est attachée (inbound WA brut), aucune négociation ouverte → `siblingOrFilter` ne trouve rien.
3. Le message part au `waouh-webhook` (core). La conversation est neuve : pas de `last_matches`, pas de `current_article_id`.
4. Le classifieur d'intent voit *"OUI"* mais n'a aucun article candidat → soit `CONFIRM` répond *"🤔 Je n'ai plus la liste"*, soit le message est ignoré.
5. Conséquence : la mise en relation Radar IA → App seller n'aboutit jamais, alors que la donnée est là.

Le scénario B avec Radar IA (B3 marqué ✅ dans la matrice) est en réalité **non câblé sur le retour**. C'est ce que l'utilisateur demande de corriger.

## Plan

### 1. Helper partagé — `_shared/waouh-radar.ts` (nouveau)

```ts
// findRadarOutreachContext(sb, phone): retourne le contexte radar le plus récent
// pour un numéro acheteur, ou null. Cherche dans waouh_outbound_queue les envois
// `radar_buyer_outreach` des 7 derniers jours, valide que payload.article_id pointe
// vers un waouh_articles actif, et retourne { article, radarSignalId, sentAt }.
```

- Filtre : `template = 'radar_buyer_outreach'`, `to_phone IN (variantes E.164 + locales)` (réutilise `addPhoneVariants` de `waouh-identity.ts`), `created_at >= now() - 7 days`, `status IN ('sent','queued')`.
- Charge `waouh_articles` (id, title, price, seller_id, photos, status, market_price_min, market_price_max) et écarte les `sold/closed`.
- Renvoie l'entrée la plus récente pour éviter les collisions multi-articles.

### 2. Hydratation dans `waouh-webhook`

Juste APRÈS le chargement de `conv`/`nextContext` et AVANT la classification d'intent :

- Si `channel === 'whatsapp'`, `phone` présent, `!nextContext?.current_article_id` ET `!nextContext?.last_matches?.length`, appeler `findRadarOutreachContext(sb, phone)`.
- Si trouvé :
  - Insérer l'article comme `last_matches[0]` (forme alignée avec `combinedMatches` ligne 894 : `{ id, title, price, seller_id, photos, source: 'chat' }` — on garde `source: 'chat'` car l'article a déjà été promu en `waouh_articles` lors de la publication par le vendeur App, donc pas de `promoteCatalogToArticle` à refaire).
  - Renseigner `nextContext.current_article_id = article.id`.
  - Marquer `nextContext.radar_buyer_context = { signal_id, hydrated_at }` (traçabilité).
- Tag de log : `[radar-buyer-hydrate]`.

Effet en cascade :

- *"OUI"* → branche `alreadyOnArticle` (ligne 959) ou `CONFIRM index 1` → crée la négociation entre buyer WA (radar) et seller App, puis `pushToOther("match_seller")` qui mirroite dans `WaouhMatchChatWindow` côté App (verrou v5 `appRouterChannel`).
- *"Je propose X"* → `NEGOTIATE` trouve `current_article_id` → contre-offre routée normalement (verrou v6 promotion already done).
- Suite des contre-offres et acceptation : le buyer WA et le seller App sont déjà attachés à la négo → flux B identique aux v6-v9.

### 3. Marquer le signal radar comme converti

Une fois la négociation créée (dans la branche CONFIRM après l'insert `waouh_negotiations`), si `nextContext.radar_buyer_context?.signal_id` existe :

```sql
UPDATE waouh_radar_signals
SET status = 'converted', converted_negotiation_id = $1, updated_at = now()
WHERE id = $2
```

Ajout d'une colonne `converted_negotiation_id uuid` si absente (migration). Ça évite de re-contacter le buyer sur la même annonce et fournit un signal métrique pour `/admin/waouh/whatsapp-ops`.

### 4. Verrou runtime + mémoire

`src/components/waouh/waouhChatSyncLock.ts` — bump **v9 → v10**, nouveau invariant :

```ts
radarBuyerHydration: {
  file: "supabase/functions/waouh-webhook/index.ts",
  mustContain: [
    "findRadarOutreachContext",
    "radar_buyer_context",
    "[radar-buyer-hydrate]",
  ],
},
radarHelperShared: {
  file: "supabase/functions/_shared/waouh-radar.ts",
  mustContain: ["findRadarOutreachContext", "radar_buyer_outreach"],
},
```

Test de lock `expect(... version).toBe("v10")`.

Ajouter section **v10 — Radar IA → Scénario B opérationnel** dans `.lovable/mem/features/whatsapp-end-to-end-flow.md` :
- Bug : `radar_buyer_outreach` envoyé mais aucun retour câblé.
- Fix : hydratation `last_matches`/`current_article_id` via `waouh_outbound_queue` + promotion `waouh_radar_signals.status = 'converted'`.
- Règle invariante : ne jamais retirer l'hydratation `findRadarOutreachContext` du webhook.

### 5. Vérification

1. `bunx vitest run` sur le lock test.
2. SQL d'inspection : insérer un `radar_buyer_outreach` factice dans `waouh_outbound_queue` pour un numéro test + un article actif d'un vendeur App, simuler un inbound *"OUI"* via `supabase--curl_edge_functions` POST sur `waouh-channel-in`.
3. Vérifier dans la DB : `waouh_negotiations` créée avec `buyer_user_id = test phone user`, `seller_user_id = app user`, `state = 'proposed'`, et `waouh_radar_signals.status = 'converted'`.
4. Vérifier les logs `waouh-webhook` (`[radar-buyer-hydrate]`) et `waouh-notify-dispatch` (push App `new_buyer` au vendeur).

## Risque / portée

- 1 fichier shared créé, 1 edge function modifiée (`waouh-webhook`), 1 lock + 1 mémoire mis à jour, 1 migration (colonne `converted_negotiation_id`).
- Pas de changement front, pas de régression sur les chemins existants (l'hydratation ne s'active que si **aucun** contexte article n'existe).
- Backwards-compatible avec les flux A/B/C déjà verrouillés v6-v9.
