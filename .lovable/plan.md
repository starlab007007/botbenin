
## Objectif

Remplacer l'estimation "vibes IA" actuelle par une vraie analyse marché reposant sur des **données réelles de produits similaires**, collectées en direct par l'IA, puis présentée de façon synthétique et crédible dans le chat WhatsApp.

## Diagnostic du flux actuel

`supabase/functions/waouh-price-compare/index.ts` fait aujourd'hui :
1. Échantillonne 50 annonces internes (`waouh_articles`) même ville + même catégorie.
2. Envoie le tout à Gemini qui "estime" min/max/moyenne.
3. Cache 24h dans `waouh_cache`.

Limites :
- Si le catalogue interne est vide (cas fréquent au lancement), l'IA invente.
- Aucune source externe vérifiable (Jumia, Coinafrique, Jiji, Afrikrea, Facebook Marketplace, groupes WA radar).
- Le message final ne cite **aucune preuve** → l'utilisateur perçoit du flou.

## Approche proposée — "Prix Réel WAOUH"

Une fonction enrichie qui agrège **3 couches de données réelles**, score leur fiabilité, puis demande à l'IA une **synthèse honnête**.

### Couche 1 — Catalogue interne (déjà en place, à garder)
Annonces `waouh_articles` actives, même ville/catégorie, ±30j. Très haute fiabilité quand dispo.

### Couche 2 — Signaux Radar IA (nouveau)
Requête sur `waouh_radar_signals` (déjà alimentée par groupes WA + scrapers) filtrée par mots-clés du titre/marque/modèle + ville. Donne le prix marché informel béninois, ce que les autres sources n'ont pas.

### Couche 3 — Web scraping ciblé via Firecrawl (nouveau, cœur de la demande)
Recherche réelle sur le web béninois/ouest-africain :

```ts
firecrawlSearch(`${brand} ${model} prix Bénin`, {
  country: 'bj', lang: 'fr', limit: 8,
  scrapeOptions: { formats: ['markdown'] }
})
```

Sites ciblés (filtrage par domaine après search) :
- `jumia.com.ci` / `jumia.sn`
- `coinafrique.com`
- `jiji.ci` / `expat.com`
- `afrikrea.com`
- `facebook.com/marketplace` (titre + snippet uniquement)

Pour chaque résultat retenu, on extrait `{ title, price_fcfa, source_domain, url, location? }` via Gemini Flash en mode JSON sur le markdown.

Conversion auto XOF/EUR/USD/NGN → FCFA (taux fixes mis en cache 24h via une mini-table `waouh_fx_rates` ou constantes).

### Couche 4 — Agrégation & scoring
Calcul côté serveur (pas IA) :
- `n_internal`, `n_radar`, `n_web` → total `n`
- `min`, `p25`, `median`, `p75`, `max` (sur l'union des prix)
- `confidence`: high (n≥8 & ≥2 couches), medium (n≥4), low (sinon)
- `sources`: top 3 URLs concrètes pour preuve

### Couche 5 — Synthèse IA honnête
Prompt révisé (extrait) :

> Tu es analyste marché béninois. Voici N comparables RÉELS (interne + radar + web).
> Produis un verdict en 3 lignes max :
> 1) fourchette honnête (p25–p75) en FCFA
> 2) verdict sur le prix demandé (juste / élevé / aubaine) avec %
> 3) 1 conseil de négociation contextuel
> Si confidence=low → dis-le explicitement.

## Format du message WhatsApp (synthétique & crédible)

```
📊 *Analyse prix réel — Samsung A14 (Cotonou)*

💰 Fourchette marché : 78 000 – 95 000 FCFA
   (médiane 85 000 · 11 annonces analysées)

🎯 Votre prix 90 000 FCFA → *Correct* (+6% vs médiane)

🔎 Sources :
• Jumia CI · 89 900 FCFA
• Coinafrique Cotonou · 85 000 FCFA
• Radar WA (groupe Dantokpa) · 80 000 FCFA

💡 Conseil : Acheteur peut viser 82 000. Tenez 85 000 ferme.
```

Si `confidence=low` :
```
⚠️ Peu de comparables (2 annonces) — estimation à confirmer.
```

## Découpage technique

1. **Nouvelle table** `waouh_price_snapshots` : `id, article_id, query, sources jsonb, stats jsonb, confidence, created_at` (audit + rejouabilité).
2. **Refonte** `waouh-price-compare/index.ts` :
   - Étape 1 : interne (déjà fait, garder)
   - Étape 2 : radar signals (nouveau bloc Supabase select)
   - Étape 3 : Firecrawl search + scrape ciblé (parallèle, timeout 8s, tolérant aux échecs)
   - Étape 4 : extraction prix via Gemini Flash JSON par batch
   - Étape 5 : agrégation déterministe en JS
   - Étape 6 : synthèse Gemini sur stats + top sources
   - Étape 7 : insert snapshot + cache 6h (vs 24h, données plus fraîches)
3. **Connecteur Firecrawl** : à activer via `standard_connectors--connect` (clé `FIRECRAWL_API_KEY`).
4. **Format de retour** étendu : `{ stats, confidence, sources[], reply }` — `waouh-webhook` utilise `reply` tel quel.
5. **Fallback** : si Firecrawl indisponible ou 0 résultat web → on tombe sur interne+radar uniquement avec badge `⚠️ confiance limitée`.

## Question avant build

- OK pour activer le connecteur **Firecrawl** (nécessaire pour le scraping réel Jumia/Coinafrique/Jiji) ? Sans lui, on reste limité au catalogue interne + radar WA.
- Veux-tu que je crée aussi la table `waouh_price_snapshots` (audit + historique des analyses) ou je garde juste le cache existant ?
