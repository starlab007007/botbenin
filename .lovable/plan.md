## Diagnostic

L'edge function `waouh-price-compare` existe et fait déjà du vrai cross-source (catalogue interne + signaux radar WA + web Firecrawl avec extraction IA, percentiles p25/médiane/p75, verdict IA, cache 6h, snapshot en DB). **Mais elle n'est appelée nulle part** : `rg "waouh-price-compare"` ne renvoie que sa propre définition.

Conséquence dans le chat :
- `waouh-webhook` (ligne 973-985) fabrique `min = m.price * 0.8` / `max = m.price * 1.2` — une fausse "fourchette marché" mécanique, jamais comparée à du réel.
- `marketNote` (l.530) demande à l'IA de qualifier ce prix vs cette fourchette inventée → la phrase paraît crédible mais s'appuie sur 0 comparable.
- `waouh_unified_catalog` (catalogue partenaires + radar consolidé, 34 col., milliers de lignes) **n'est jamais interrogé** comme source de prix comparables. C'est pourtant la source la plus riche et la plus fiable que nous ayons.

## Ce qui est possible (et réaliste)

1. **Brancher pour de vrai `waouh-price-compare` dans le chat** à 3 endroits : liste des résultats acheteur, publication d'annonce vendeur, et négociation. Remplacer le `±20%` par la vraie fourchette p25–p75 calculée sur nos données.
2. **Ajouter `waouh_unified_catalog` comme couche prioritaire** (avant interne/radar/web) dans `fetchInternal` — c'est notre source consolidée la plus dense (titre, brand, model, price, city, category).
3. **Garder un fallback gracieux** : si <3 comparables → message honnête "données limitées" plutôt qu'une fausse certitude.
4. **Format de message ultra-innovant** : tableau ASCII compact, badge de verdict, top-3 comparables réels cliquables, indice de confiance visuel, mini "courbe" du marché.

## Plan d'implémentation

### 1. Élargir `waouh-price-compare` — ajouter la couche unifiée

Dans `supabase/functions/waouh-price-compare/index.ts` :
- Nouvelle fonction `fetchUnified(sb, query, city, category, brand, model)` qui interroge `waouh_unified_catalog` (filtres `category`, `brand`, `city`, ILIKE titre/model), retourne `Sample[]` avec `source = "Catalogue WAOUH"`.
- Inclure cette couche en **première position** (priorité affichage) dans `Promise.all`.
- `computeConfidence` recalculée sur 4 couches (unified + interne + radar + web). Seuil `high` à ≥10 comparables / ≥2 couches.

### 2. Brancher dans `waouh-webhook/index.ts`

Remplacer le bloc `officialList` (l.968-986) :
- Pour chaque match, appel parallèle (`Promise.all`) à `waouh-price-compare` via `fetch` interne ou directement `aggregate(samples)` factorisé dans `_shared/waouh-price.ts`.
- Le rendu ligne devient :

```
*1. iPhone 12 64Go*
💰 *85 000 FCFA*  ← prix vendeur
🏙️ Cotonou · bon état · 📏 3,2 km
📊 Marché réel : 78 000 – 92 000 FCFA (médiane 85 000)
   ↳ basé sur 14 annonces (8 WAOUH · 3 radar WA · 3 Jumia/Coinafrique)
🎯 Verdict : ✅ JUSTE (0% vs médiane) · confiance ★★★★☆
🔎 Comparables proches :
   • Catalogue WAOUH · 82 000 FCFA · Cotonou
   • Radar WA · 90 000 FCFA · Calavi
   • jumia.ci · 88 500 FCFA
🧠 Bon rapport qualité/prix pour Cotonou, marge négo ~5-7%.
```

Idem pour la publication vendeur (l.760-764) : afficher la fourchette réelle issue de `price-compare` au lieu de `inferredPrice * 0.8/1.2`.

### 3. Brancher dans la négociation

`waouh-negotiate-handler/index.ts` (l.29) : appeler `waouh-price-compare` au lieu de prendre `article.market_price_min/max` (souvent null). Le verdict IA s'appuiera alors sur les comparables réels.

### 4. Factorisation

Créer `supabase/functions/_shared/waouh-price.ts` qui exporte `compareMarketPrice({ article_id?, query, city, category, brand, model, askedPrice })` réutilisable par webhook, buy-handler, negotiate-handler, et l'edge `waouh-price-compare`. Cache 6h conservé, dedup via `cache_key`.

### 5. Garde-fous

- Timeout global 4s sur `compareMarketPrice` côté webhook (sinon on tombe sur le format ancien sans bloquer le chat).
- Si `samples.n < 3` → afficher *"📊 Données marché limitées (n=2) — analyse approximative"* au lieu d'un verdict ferme.
- Logs `[price-compare]` avec `{ query, n_unified, n_internal, n_radar, n_web, confidence, ms }` pour observabilité.

### 6. Format type proposé (à confirmer)

```
📊 *ANALYSE MARCHÉ — Samsung A54 5G (Cotonou)*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Votre prix      : 145 000 FCFA
📈 Médiane marché : 138 000 FCFA
🎯 Verdict        : ✅ JUSTE (+5%) · ★★★★☆

📦 Fourchette (p25–p75) : 130 000 – 152 000
📊 Min / Max observés   : 118 000 / 175 000

🔎 14 comparables analysés
   ▸ 6 catalogue WAOUH (Cotonou, Calavi)
   ▸ 4 radar WhatsApp (60 derniers jours)
   ▸ 4 web (jumia.ci, coinafrique.com)

🏆 Top 3 plus proches :
   1. Catalogue WAOUH · 140 000 · Cotonou
   2. Radar WA · 135 000 · Calavi
   3. jumia.ci · 142 900

🧠 *Verdict IA :* Prix dans la médiane haute, négociation possible
   à ~135 000. Conseil : mettez en avant l'état + accessoires.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🕒 Mis à jour il y a 12 min · 🔄 actualisé /prix
```

## Fichiers touchés

- ✏️ `supabase/functions/waouh-price-compare/index.ts` — ajoute `fetchUnified`, recalcule confidence sur 4 couches
- 🆕 `supabase/functions/_shared/waouh-price.ts` — fonction factorisée `compareMarketPrice()`
- ✏️ `supabase/functions/waouh-webhook/index.ts` — branche `compareMarketPrice` dans `officialList` + publication vendeur (remplace ±20%)
- ✏️ `supabase/functions/waouh-negotiate-handler/index.ts` — utilise `compareMarketPrice` au lieu de `market_price_min/max`
- ✏️ `supabase/functions/waouh-buy-handler/index.ts` — option : enrichir les `matches` avec fourchette réelle (mode rapide, 1 appel batch)

## Hors-scope (verrouillé, on n'y touche pas)

- `waouh-chat-sync-flow-locked-v12` (matchKey, counterpart_user_id, fenêtres multi-acheteurs)
- Schéma DB, RLS, UI chat
- Edge functions partenaires/radar autres que la lecture de `waouh_unified_catalog`

## Validation

1. Test manuel : "je cherche iPhone 12" → vérifier que chaque résultat affiche le nouveau bloc avec ≥1 comparable réel et la mention du nombre de sources.
2. Logs `[price-compare]` montrent `n_unified > 0` sur les produits présents au catalogue.
3. Vérifier `waouh_price_snapshots` se remplit avec `n_unified` (nouvelle colonne optionnelle, ou réutiliser `sources`).
4. Si Firecrawl indisponible : le chat continue avec couches unified + interne + radar seulement, confidence dégradée à `medium`/`low`.
