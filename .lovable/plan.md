
# Rapport de test E2E — Marketplace WAOUH (3 scénarios)

Audit complet du parcours acheteur ↔ vendeur via l'application et WhatsApp, de la publication jusqu'à la conclusion de l'affaire. Voici ce qui marche, ce qui ne marche pas, et le plan de correction.

---

## Matrice de couverture des notifications

| Étape | WhatsApp Vendeur | WhatsApp Acheteur | In-app Vendeur | In-app Acheteur |
|---|---|---|---|---|
| Annonce publiée | ✅ | n/a | ✅ | n/a |
| Match mot-clé (à la publication) | ❌ (volontaire) | ✅ | ❌ | ✅ |
| 1er message acheteur dans l'article | ✅ | ✅ (réponse chat) | ✅ | ✅ |
| « intéressé N » → négociation | ✅ | ✅ | ✅ | ✅ |
| Contre-offre / OUI / NON | ✅ | ✅ | ✅ | ✅ |
| Deal accepté (création deal) | ✅ | ✅ | ✅ | ✅ |
| Livreur assigné / livré / payé | ✅ | ✅ | ✅ | ✅ |
| **Article passé à `sold`** | ❌ | ❌ | ❌ | ❌ |

---

## Scénario 1 — C2C standard (vendeur app → acheteur app)

**Parcours observé** : `waouh-sell-handler` → insert `waouh_articles` → `waouh-notify-dispatch` (WhatsApp + in-app vendeur) → `waouh-notify-buyers` matche les profils → dispatch WhatsApp + in-app à chaque acheteur match. Le 1er message acheteur dans l'article déclenche un `new_buyer` vers le vendeur. Négociation OUI/NON via `waouh-negotiation-router` → `waouh-deal-dispatch` notifie les 2 parties + ops. Suite (assign / delivered / payment) gérée par `waouh-deal-ops` avec notifications symétriques.

**Anomalies** :
- **S1-G4 (Critique)** : à la création du deal, `waouh_articles.status` reste `active` → un autre acheteur peut continuer à manifester son intérêt sur un article déjà vendu.
- **S1-G2 (Moyenne)** : un acheteur avec `source_channel='waouh_app'` mais possédant un numéro WhatsApp ne reçoit PAS le push WhatsApp (resolveContact ne tombe pas dans la branche `whatsapp`).

---

## Scénario 2 — Produit partenaire (module Partenariat)

**Parcours observé** : ajout via UI → trigger SQL `sync_partner_product_to_catalog` insère dans `waouh_unified_catalog (source='partner')`. La recherche acheteur dans `waouh-webhook` (BUY) lit bien le catalogue unifié et propose les produits partenaires. « intéressé N » crée une négociation, stub vendeur via `ensureWaouhVendorStub`, push WhatsApp vers numéro du business partenaire OK. Deal/dispatch identique au scénario 1.

**Anomalies** :
- **S2-G1/G2 (Critique)** : `waouh-notify-buyers` ne scanne QUE `waouh_articles`. Quand un partenaire publie un produit, **aucun acheteur en veille n'est notifié** (ni in-app, ni WhatsApp). Le matching est cassé pour tout le module partenariat.
- **S2-G3 (Haute)** : `waouh-partner-attribute-sale` n'est jamais appelée automatiquement à la conclusion du deal → commission partenaire jamais attribuée.
- **S2-G4 (Haute)** : pour les résultats partenaires, la réponse BUY ne déclenche pas de push WhatsApp côté acheteur (seulement réponse texte dans le chat).

---

## Scénario 3 — Radar IA

**Parcours observé** : `waouh-radar-apify` / `waouh-serpapi-scout` peuplent `waouh_radar_signals` et `waouh_external_listings`, syncés vers `waouh_unified_catalog`. `waouh-radar-process` traite les SELL signals → article + outreach WhatsApp au vendeur radar + match contre `waouh_buyer_profiles` avec push WhatsApp + in-app. BUY path : `waouh-webhook` lit `waouh_radar_signals`, `promoteRadarSeller` crée un article. Deal/dispatch identique.

**Anomalies** :
- **S3-G1 (Haute)** : `waouh-webhook` BUY interroge `waouh_radar_signals` directement, **jamais `waouh_unified_catalog WHERE source='radar'`** → tous les listings SerpAPI sont invisibles côté recherche acheteur.
- **S3-G2 (Haute)** : pas de path d'outreach WhatsApp pour les vendeurs SerpAPI (`waouh_external_listings.seller_phone` ignoré).
- **S3-G3 (Moyenne)** : `promoteRadarSeller` inline ne renseigne pas `origin_signal_id` → la branche `radar_ia` de `resolveContact` retombe sur `rowWa` qui peut être null.
- **S3-G5 (Moyenne)** : notifications `radar_match` créées sans `article_id` → la cloche frontale peut mal rendre.
- **S3-G4** : même bug que S1-G4 (article jamais marqué `sold`).

---

## Plan de correction (proposé, par priorité)

### Critiques (à corriger immédiatement)

1. **Marquer l'article comme `sold` à la création du deal**
   - Fichier : `supabase/functions/waouh-negotiation-router/index.ts` (après ligne 165)
   - Ajouter : `UPDATE waouh_articles SET status='sold' WHERE id = neg.article_id` + bloquer toute nouvelle négociation sur un article `sold` côté `waouh-webhook` (BUY + CONFIRM).

2. **Étendre `waouh-notify-buyers` au catalogue unifié (partenaires)**
   - Fichier : `supabase/functions/waouh-notify-buyers/index.ts`
   - Ajouter une 2e branche qui SELECT `waouh_unified_catalog` WHERE `source IN ('partner','radar')` AND `is_active=true`, applique la même logique keyword/prix sur `titre`, dispatche `waouh-notify-dispatch` avec un payload partenaire/radar (vendeur via `waouh_partner_businesses` ou `waouh_external_listings`).
   - Mettre à jour `notified_article_ids` → renommer en `notified_item_ids` ou ajouter un `notified_catalog_ids` pour éviter les doublons.

### Hautes

3. **Auto-attribution de la commission partenaire à la conclusion**
   - Fichier : `supabase/functions/waouh-negotiation-router/index.ts` (après création du deal)
   - Si l'article provient d'un produit partenaire (détecter via `partner_id` ou via catalog), appeler en fire-and-forget `waouh-partner-attribute-sale` avec `deal_id`.

4. **Push WhatsApp à l'acheteur sur résultat BUY partenaire**
   - Fichier : `supabase/functions/waouh-webhook/index.ts` (~ligne 647 après réponse BUY)
   - Pour chaque résultat affiché à l'acheteur disposant d'un numéro WhatsApp, appeler `waouh-notify-dispatch` kind=`match` recipient=`buyer`.

5. **Inclure `waouh_unified_catalog source='radar'` dans la recherche BUY**
   - Fichier : `supabase/functions/waouh-webhook/index.ts` (~ligne 606-620)
   - Ajouter un SELECT sur le catalogue unifié pour les sources radar afin de surfacer les listings SerpAPI dans les résultats acheteur.

6. **Outreach WhatsApp aux vendeurs SerpAPI**
   - Fichier : `supabase/functions/waouh-webhook/index.ts` (~ligne 740-766)
   - Étendre l'outreach aux items dont la source est `waouh_external_listings` (utiliser `seller_phone`).

### Moyennes

7. **`promoteRadarSeller` doit propager `origin_signal_id`**
   - Fichier : `supabase/functions/waouh-webhook/index.ts:729`
   - Passer et stocker `signal_id` sur l'article promu pour que `resolveContact` branche radar fonctionne.

8. **`resolveContact` : fallback WhatsApp pour `source_channel='waouh_app'`**
   - Fichier : `supabase/functions/_shared/waouhContact.ts:43`
   - Si `contact_whatsapp` est présent ET valide, dispatcher WhatsApp même quand `source_channel='waouh_app'`.

9. **Notifications `radar_match` doivent référencer un `article_id`**
   - Fichier : `supabase/functions/waouh-radar-process/index.ts:238`
   - Promouvoir le signal en article AVANT de créer la notification, puis attacher l'`article_id`.

### Améliorations transverses

10. Pagination/limite sur le scan `waouh_buyer_profiles` dans `waouh-notify-buyers`.
11. Documenter explicitement la règle « pas de notification au vendeur sur simple match keyword » dans le code de `waouh-notify-buyers`.
12. Ajouter un test E2E Deno couvrant les 3 scénarios (script `supabase/functions/_tests/e2e_marketplace_test.ts`) avec mocks WAHA.

---

## Fichiers à modifier (résumé)

- `supabase/functions/waouh-negotiation-router/index.ts` (S1-G4, S2-G3, S3-G4)
- `supabase/functions/waouh-notify-buyers/index.ts` (S2-G1, S2-G2)
- `supabase/functions/waouh-webhook/index.ts` (S2-G4, S3-G1, S3-G2, S3-G3)
- `supabase/functions/_shared/waouhContact.ts` (S1-G2)
- `supabase/functions/waouh-radar-process/index.ts` (S3-G5)

Aucun changement de schéma DB requis pour les correctifs critiques ; éventuellement un champ `notified_catalog_ids` sur `waouh_buyer_profiles` pour la déduplication catalogue.

---

## Recommandation d'ordre d'exécution

1. Sprint 1 (1 jour) : corrections critiques #1 et #2 (les deux bugs qui cassent fonctionnellement l'expérience marketplace).
2. Sprint 2 (1-2 jours) : hautes #3 à #6 (complète le parcours partenaire + radar SerpAPI).
3. Sprint 3 (0,5 jour) : moyennes #7 à #9 (robustesse contact/notif).
4. Sprint 4 (0,5 jour) : tests E2E automatisés + observabilité.

Approuvez ce plan pour passer en mode build et appliquer les correctifs dans l'ordre proposé (ou indiquez par où commencer).
