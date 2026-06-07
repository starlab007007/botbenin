# WAOUH — Photos de recherche + robustesse & performance du chat

## Diagnostic

### 1. Photos absentes dans les résultats de recherche
- `waouh-webhook` (lignes ~817-840) construit déjà `replyAttachments` à partir de `photos[]`, mais filtre via `isPublicImageUrl` qui rejette tout ce qui contient `waha.bot.bj` ou `/api/files/`.
- En BD, les photos des articles web sont des URLs publiques Supabase Storage : elles passeraient le filtre… **mais** la réponse texte est sortie via `core.reply` et les `attachments` ne sont propagés que si `waouh-webhook` les retourne dans son JSON. À vérifier : la branche "search" met `replyAttachments` en variable locale mais le retour final doit inclure `attachments: replyAttachments`. Si la réponse JSON ne contient pas `attachments`, `waouh-channel-in` enregistre `attachments: []` ⇒ aucune image dans la bulle.
- `waouh-buy-handler` (chemin alternatif appelé directement par le mobile) ne retourne pas non plus de `matches[].photos[0]` sous forme d'attachments exploitables par le chat.
- Le `WaouhWebChat` rend déjà `m.attachments` en grille (lignes 610-621) : il suffit de garantir que les attachments arrivent.

### 2. Lenteur du chargement (réponses + photos)
- `waouh-webhook` exécute en **séquentiel** dans la boucle "officialList" : `marketNote()` (appel IA Gateway) + `rpc("waouh_point_distance_km")` par article. Pour 5 articles ⇒ ~5 appels IA sérialisés (déjà `Promise.all` côté map mais chaque `marketNote` peut prendre 1-3s).
- `radarSellers` outreach + `promoteRadarSeller` sont aussi exécutés **avant** la réponse alors qu'ils peuvent être différés via `EdgeRuntime.waitUntil`.
- Côté client, `WaouhWebChat` charge les images sans `loading="lazy"` ni `decoding="async"` ni dimensions explicites.

### 3. Persistance fragile par article
- Les photos sont bien en BD (`waouh_articles.photos`) mais l'historique chat (`waouh_messages.attachments`) ne stocke pas systématiquement les URLs de la liste de résultats. Au refresh, les images disparaissent de l'historique.

### 4. Flux chat (déjà verrouillé)
- Le contrat `WAOUH Chat Sync Flow (Locked)` interdit de toucher au mapping principal ↔ `WaouhMatchChatWindow`. Les modifications ci-dessous sont **additives** (attachments, lazy-loading, `waitUntil`) et ne changent pas la logique de routage/ownership déjà testée.

## Plan

### A. `supabase/functions/waouh-webhook/index.ts`
1. **Garantir que `replyAttachments` est inclus dans la réponse JSON** pour TOUTES les branches (search, sale_published, etc.). Vérifier la sérialisation finale et ajouter `attachments: replyAttachments` si manquant.
2. **Assouplir `isPublicImageUrl`** : autoriser aussi les URLs Supabase Storage signées + les URLs `waha.bot.bj` rehébergées (ou les rehéberger via le bucket `waouh-uploads` au moment du match). Concrètement, ne filtrer que les blobs/data URIs et les schémas non-http.
3. **Paralléliser** les `marketNote()` et `rpc("waouh_point_distance_km")` via un seul `Promise.all` global sur `[...partnerTop, ...matchesTop]` au lieu de séquences imbriquées.
4. **Différer l'outreach Radar IA** (`waouh_enqueue_outbound_v2` + `promoteRadarSeller`) via `EdgeRuntime.waitUntil(...)` pour ne pas retarder la réponse au chat.

### B. `supabase/functions/waouh-buy-handler/index.ts`
1. Ajouter dans la réponse `matches[]` la clé `cover_photo` (= `photos[0]`) et un tableau `attachments` parallèle au format `{url, type:"image/jpeg", caption:title}` pour les 5 premiers résultats, afin que le frontend puisse l'afficher de la même manière que le chat principal.
2. Différer `dispatchAsync` est déjà fait — OK.

### C. `supabase/functions/waouh-channel-in/index.ts`
1. Vérifier que `core.attachments` (renvoyé par `waouh-webhook`) est bien propagé dans :
   - l'insert `waouh_messages.attachments` (pour la persistance)
   - la réponse JSON au client (déjà fait via `attachments: negAttachments` côté négociation, à généraliser au core path).
2. S'assurer que `waouh-match-history` retourne `attachments` (la colonne est déjà sélectionnée) — RAS, juste vérifier qu'on ne les filtre pas.

### D. `src/components/waouh/WaouhWebChat.tsx`
1. Sur les `<img>` des attachments (lignes 610-621), ajouter :
   - `loading="lazy"` `decoding="async"`
   - `width`/`height` explicites (placeholder ratio 1:1) pour éviter le CLS
   - `srcSet` Supabase transform (`?width=320` pour thumbnail, plein écran via gallery existante)
2. Sur la prévisualisation des résultats inline (lignes ~650+ "Pas d'image"), utiliser `photos[0]` comme cover en `<img loading="lazy">`.
3. Ajouter une intersection-observer cache pour éviter de re-décoder une image déjà vue dans la session.

### E. `src/components/waouh/WaouhMatchChatWindow.tsx`
1. Mêmes optimisations d'`<img>` (lazy + dimensions).
2. Pas de modification de la logique de sync (verrou en place).

### F. Performance globale
- Aucun changement DB requis (les photos sont déjà persistées dans `waouh_articles.photos` et `waouh_messages.attachments`).
- Pas de migration.

## Détails techniques

```text
Flux corrigé :
client → channel-in → webhook (search)
                      ├─ Promise.all([marketNote × N, distance × N])
                      ├─ replyAttachments = photos[] filtrés (URLs http(s) valides)
                      ├─ EdgeRuntime.waitUntil(radarOutreach + promote)
                      └─ return { reply, attachments: replyAttachments }
        ← channel-in insert waouh_messages(attachments=...) + return { attachments }
client ← rend bulle texte + grille d'images (lazy)
```

## Hors périmètre
- Pas de refonte du contrat de sync chat principal ↔ WaouhMatchChatWindow (verrouillé).
- Pas de changement de schéma BD.
- Pas de modification de la géolocalisation (déjà OK selon dernier passage).
- Pas de touchage aux edge functions de paiement / négociation core (uniquement propagation d'`attachments`).
