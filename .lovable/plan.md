## Diagnostic — Recherche "je cherche Zara" renvoie TOUS les produits

### Reproduction (test mental basé sur le code)

L'utilisateur tape `je cherche Zara` dans le chat WAOUH. Le flux est :

```
WaouhWebChat → waouh-channel-in → waouh-webhook (intent: "BUY")
                                       │
                                       └─► AI extrait criteria { keywords, category, price_max, ... }
                                            puis filtre waouh_articles + waouh_unified_catalog
                                            + waouh_radar_signals + waouh_external_listings
```

### Cause racine (fichier `supabase/functions/waouh-webhook/index.ts`, branche `intent === "BUY"`, lignes 818-870)

```ts
const kws = Array.isArray(criteria.keywords)
  ? criteria.keywords.filter(k => typeof k === "string" && k.length > 1)
  : [];
if (kws.length > 0) {
  const orFilter = kws.map(k => `title.ilike.%${k}%,brand.ilike.%${k}%,description.ilike.%${k}%`).join(",");
  q = q.or(orFilter);
}
```

Trois bugs combinés expliquent le symptôme :

1. **`kws` souvent vide pour une requête mono-mot type marque.** L'IA Gemini, sur prompt « Extrais les critères d'achat », range fréquemment `Zara` dans `brand` ou `category` et renvoie `keywords: []`. Aucun filtre texte n'est alors appliqué — la requête redevient `SELECT … WHERE status='active'` (cappée à 5 par `.limit(5)` puis affichée comme « voici tous les produits disponibles »).
2. **Pas de fallback texte brut.** Le mot tapé par l'utilisateur (`text`) n'est jamais réinjecté en keyword si l'IA en oublie. Idem dans `waouh-buy-handler/index.ts` (lignes 103-107) qui désactive le filtre dès que `q.keywords` est vide.
3. **Branche "category seul" trop large.** Si `criteria.category = "vetement"` et `kws = []`, la requête retourne les 5 derniers vêtements actifs au lieu de zéro. Même problème sur `waouh_unified_catalog`, `waouh_radar_signals`, `waouh_external_listings` (toutes les 4 sources OR-filtrent uniquement quand `kws.length > 0`).

Conséquence : pour `je cherche Zara` → IA renvoie `{ category: "vetement", brand: "Zara", keywords: [] }` → 5 vêtements aléatoires sont retournés et la notification "Nouvel acheteur trouvé !" est dispatchée à tous les vendeurs de ces 5 articles non pertinents.

### Plan de correction

**Objectif** : ne jamais lancer une recherche "ouverte" et toujours inclure les tokens significatifs du message brut.

1. **Helper partagé `extractFallbackKeywords(text)`** dans `supabase/functions/_shared/waouh-keywords.ts`
   - Tokenise le message, retire stop-words FR (`je`, `cherche`, `recherche`, `besoin`, `acheter`, `un`, `une`, `des`, `pour`, `de`, `à`, `le`, `la`, …) et chiffres seuls.
   - Garde tokens ≥ 3 caractères, normalise casse et accents.
   - Retourne max 6 tokens.

2. **`waouh-webhook/index.ts` (branche BUY, ~ligne 830)**
   - Construire `const finalKws = kws.length > 0 ? kws : extractFallbackKeywords(text);`
   - Si `finalKws.length === 0` ET pas de `criteriaCategory` ciblée → `reply = "🤔 Précisez votre recherche (ex: « je cherche iPhone 12 à Cotonou »)"` et retourner SANS dispatcher de matches ni notifications.
   - Sinon utiliser `finalKws` dans les 4 OR-filtres (articles, unified_catalog, radar_signals, external_listings).
   - Ajouter `brand.ilike` au OR-filter du `waouh_unified_catalog` (actuellement absent).

3. **`waouh-buy-handler/index.ts` (lignes 103-107)**
   - Même fallback : si `q.keywords` est vide, réutiliser `extractFallbackKeywords(message)` avant le `.filter(...)`.
   - Si toujours vide après fallback → retourner `matches: []` au lieu de retourner les 20 premiers articles.

4. **Garde "tous-articles" en dernier rempart** dans la branche BUY du webhook : si `finalKws.length === 0 && !criteriaCategory && !criteria.price_max` → ne PAS exécuter la query, court-circuit immédiat avec message d'incitation à préciser. Empêche tout dispatch de notifications non sollicitées.

5. **Logs de diagnostic** (1 ligne `console.log("[BUY]", { text, criteria, finalKws, totalCount })`) pour vérifier dans les Edge Function logs après déploiement.

6. **Test de validation post-déploiement**
   - `je cherche Zara` → finalKws=["zara"] → filtre `title/brand/description ilike %zara%` → 0 ou N résultats *réellement* liés à Zara.
   - `je cherche iPhone 12` → finalKws=["iphone","12"] (le "12" passe car ≥3 caractères seulement, donc en réalité kws=["iphone"]) → résultats iPhone.
   - `je cherche` (sans rien) → court-circuit, message d'incitation, aucune notification dispatchée.
   - Vérifier via `supabase__edge_function_logs` qu'aucune notif `kind=match` n'est envoyée sur les cas vides.

### Hors-scope (à ne PAS toucher)

- `waouh-chat-sync-flow-locked-v12` (matchKey, counterpart_user_id, fenêtres multi-acheteurs) — non concerné par ce bug.
- Schéma DB, RLS, edge functions de négociation / partenaire / radar.
- UI `WaouhWebChat` / `WaouhMatchChatWindow` — la correction est 100 % côté backend (3 fichiers : 1 helper neuf + 2 edge functions patchées).
