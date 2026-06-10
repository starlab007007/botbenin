# Scénario B miroir — Acheteur App ↔ Vendeur WA scrapé par Radar IA

## Contexte

Le v10 a câblé le retour **Radar IA acheteur** (signal `BUY` → outreach WA → réponse "OUI" → négo avec vendeur App). Il manque le miroir : quand Radar IA capture une **annonce de vente** (signal `SELL` avec `contact_phone` identifié) postée sur un groupe/page WA, un acheteur **App** doit pouvoir cliquer sur ce résultat depuis sa recherche / radar feed et **engager une négociation** avec ce vendeur WA non encore enregistré sur la plateforme.

## Diagnostic

État actuel :

1. `waouh_radar_signals (intent = 'SELL', contact_phone = '229...')` existe et est promu en `waouh_external_listings` (et parfois copié dans `waouh_unified_catalog` côté recherche acheteur).
2. Quand l'acheteur App tape *"je veux X"* dans son chat App, le webhook construit `last_matches` depuis `waouh_articles` (vendeurs App uniquement) + éventuellement `waouh_unified_catalog`. Les hits de type `external` (Radar SELL) :
   - n'ont **pas** de `seller_id` interne (vendeur WA non enregistré → pas de `waouh_users.auth_user_id`),
   - n'ont **pas** d'`article_id` dans `waouh_articles` → `CONFIRM`/`NEGOTIATE` ne peut pas créer la `waouh_negotiations` (FK + sibling resolution échouent),
   - donc la branche acheteur App s'arrête sur *"désolé, ce vendeur n'est pas joignable"* ou ignore le hit.
3. Aucun template WA `radar_seller_outreach` n'existe pour ouvrir le canal côté vendeur WA, et aucune `waouh_users` "shell" n'est créée pour matérialiser ce vendeur.

Résultat : la matrice marque B (App buyer ↔ Radar WA seller) ✅ mais le retour n'est pas câblé — symétrique exact du bug v10 corrigé pour l'autre sens.

## Plan

### 1. Helper partagé — `_shared/waouh-radar.ts` (étendu)

Ajouter à côté de `findRadarOutreachContext` :

```ts
// promoteRadarSellerToShellUser(sb, signal): garantit qu'un waouh_users existe
// pour le vendeur WA scrapé (phone + waouh_user créé minimal, auth_user_id = null,
// kind = 'wa_shell', source = 'radar'). Idempotent via UPSERT sur phone.

// promoteRadarSellerToArticle(sb, signal, sellerUserId): garantit qu'un
// waouh_articles existe (status = 'active', seller_id = sellerUserId,
// source = 'radar', origin_signal_id = signal.id). Idempotent via lookup
// (origin_signal_id, seller_id). Retourne { article, sellerUserId, signalId }.

// findRadarSellerContextForBuyer(sb, query): pour l'acheteur App, cherche
// les SELL signals matchant (title/category/city/price) parmi ceux non encore
// promus, et renvoie les top-K candidats prêts à être insérés dans last_matches.
```

Tag de log : `[radar-seller-hydrate]`. Réutilise `addPhoneVariants` de `waouh-identity.ts`.

### 2. Hydratation côté `waouh-webhook` (acheteur App)

Dans la construction de `combinedMatches` (ligne ~894), APRÈS le merge `waouh_articles` + `waouh_unified_catalog`, si `channel === 'app'` et que le buyer recherche un produit :

- Appeler `findRadarSellerContextForBuyer(sb, { keywords, category, city, priceRange })`.
- Pour chaque hit retenu (top 3 max), appeler à la volée `promoteRadarSellerToShellUser` + `promoteRadarSellerToArticle` → l'article devient un `waouh_articles` standard avec `seller_id` valide.
- L'insérer dans `last_matches` avec `source: 'radar_seller'` pour traçabilité (mais structure identique aux articles natifs : `{ id, title, price, seller_id, photos }`).

### 3. Outreach vendeur WA — nouveau template

Quand l'acheteur App confirme (`CONFIRM` index N → `waouh_negotiations` insert), juste après le `pushToOther("match_seller")` existant :

- Si `seller.kind === 'wa_shell'` (vendeur Radar promu), enfile dans `waouh_outbound_queue` :

```ts
template: 'radar_seller_outreach',
to_phone: sellerShell.phone,
payload: { article_id, negotiation_id, buyer_display_name, proposed_price, radar_signal_id }
```

- Template texte (FR + Fon court) : *"Bonjour 👋 Un acheteur sur Waouh est intéressé par votre annonce '{title}' à {price} FCFA. Répondez OUI pour discuter, ou proposez un prix."*
- À la réception (`waha-webhook` → `waouh-channel-in` → `waouh-webhook`), le numéro vendeur a maintenant une `waouh_negotiations` ouverte → `siblingOrFilter` la trouve → branche `NEGOTIATE`/`CONFIRM` normale identique au scénario B v9.

### 4. Marquer le signal radar comme converti

Symétrique au v10 buyer : si le signal SELL est promu et qu'une `waouh_negotiations` est créée, update `waouh_radar_signals SET status = 'converted', converted_negotiation_id = $1`. (Colonne déjà ajoutée par la migration v10.)

Ajouter `kind` à `waouh_users` (`text default 'app'`, valeurs : `'app' | 'wa' | 'wa_shell'`) via migration si la colonne n'existe pas — pour distinguer les shells Radar et déclencher l'outreach.

### 5. Verrou runtime + mémoire

`src/components/waouh/waouhChatSyncLock.ts` — bump **v10 → v11**, nouveaux invariants :

```ts
radarSellerHydration: {
  file: "supabase/functions/waouh-webhook/index.ts",
  mustContain: [
    "findRadarSellerContextForBuyer",
    "promoteRadarSellerToShellUser",
    "promoteRadarSellerToArticle",
    "radar_seller_outreach",
    "[radar-seller-hydrate]",
  ],
},
radarSellerHelperShared: {
  file: "supabase/functions/_shared/waouh-radar.ts",
  mustContain: [
    "findRadarSellerContextForBuyer",
    "promoteRadarSellerToShellUser",
    "promoteRadarSellerToArticle",
    "radar_seller_outreach",
  ],
},
```

Test de lock `expect(version).toBe("v11")`. Tous les invariants v6-v10 restent intacts.

Ajouter section **v11 — Radar IA → Scénario B miroir (App buyer ↔ WA seller)** dans `.lovable/mem/features/whatsapp-end-to-end-flow.md` :
- Bug : signaux SELL Radar visibles mais aucun canal de mise en relation côté vendeur WA non enregistré.
- Fix : promotion shell user + article + outreach `radar_seller_outreach` + conversion signal.
- Règle invariante : ne jamais retirer la promotion shell ni l'outreach `radar_seller_outreach`.

### 6. Vérification

1. `bunx vitest run` sur le lock test (60/60 invariants attendus).
2. Insérer un `waouh_radar_signals (intent='SELL', contact_phone='22961234567', product={title:'Tecno Spark 10'}, price=80000)` factice.
3. Simuler un inbound App buyer *"je cherche un Tecno Spark"* via `supabase--curl_edge_functions` POST `waouh-channel-in`.
4. Vérifier en DB :
   - `waouh_users` shell créé avec `kind='wa_shell'`, phone correspondant,
   - `waouh_articles` créé avec `seller_id = shell.id`, `origin_signal_id = signal.id`,
   - `last_matches[0]` contient le hit radar,
   - après CONFIRM : `waouh_negotiations` créée, `waouh_outbound_queue` contient un `radar_seller_outreach` queue/sent,
   - `waouh_radar_signals.status = 'converted'`, `converted_negotiation_id` rempli.
5. Simuler la réponse WA vendeur *"OUI 75000"* → vérifier que la négo passe en `counter` côté vendeur WA et que le push App `counter_buyer` arrive à l'acheteur App.

## Risque / portée

- Helper `_shared/waouh-radar.ts` étendu (+3 fonctions), `waouh-webhook` modifié (hydratation buyer + outreach seller), 1 migration (colonne `kind` sur `waouh_users` si absente), lock v11 + mémoire.
- Pas de changement front (l'acheteur App voit simplement plus de résultats matchés et la négo se comporte normalement).
- Backwards-compatible : les hits Radar SELL sans `contact_phone` exploitable sont ignorés silencieusement (comme aujourd'hui).
- Symétrique exact de v10 → faible risque de régression sur les flux verrouillés v6-v10.
