# Audit — pourquoi la recherche affiche « autre chose »

Trois défauts confirmés par lecture du code et des logs edge (`[BUY] { text: "je cherche un terrain", ai_keywords: [], kws: ["terrain"], category: "meuble" }`).

### 1. Catégorie forcée et souvent fausse (cause principale)
`normalizeCategory()` (waouh-webhook l.24-33) ne renvoie **jamais null** : elle retourne `"autre"` par défaut, et elle est appelée sur `criteria.category || text`, donc le texte brut déclenche des règles regex hasardeuses (« terrain » → `meuble`, « machine à coudre » → `electromenager`).
Ce résultat est ensuite appliqué en filtre dur : `q.eq("category", criteriaCategory)`.
Conséquence : les vrais produits correspondant aux mots-clés sont exclus, et seuls des produits de la catégorie devinée remontent → « ce n'est pas le produit cherché ». Même schéma dans `waouh-buy-handler` (`q.category` de l'IA appliqué en `eq`).

### 2. Numérotation « intéressé N » désynchronisée
Dans waouh-webhook, la liste affichée est `partnerTop (≤5) + matchesTop (reste) + radarTop`, mais `last_matches` est construit avec `partnerTop + (matches)` — **toute** la liste articles, pas `matchesTop` — puis les articles radar promus sont ajoutés dans un ordre différent de l'affichage.
Conséquence : dès qu'un partenaire est présent, « intéressé 2 » ouvre la négociation sur un **autre produit** que celui affiché au n°2.

### 3. Pertinence trop laxiste
- `matchesAnyKeyword` fait un `includes()` de sous-chaîne : « sac » matche « sachet », « pc » matche « pcs ».
- Le post-filtre strict n'est appliqué **que si** au moins un token ≥3 caractères existe : sans mot-clé mais avec catégorie devinée, toute la catégorie est renvoyée.
- Les mots-clés sont combinés en **OU** sans scoring : « iPhone 12 Pro » remonte n'importe quoi contenant « pro », et l'ordre final n'est trié que par distance/date, jamais par pertinence.
- Le haystack radar inclut `city`, donc un mot-clé ville fait matcher des annonces hors-sujet.

---

# Plan de correction (backend recherche uniquement)

### A. `_shared/waouh-keywords.ts`
- Ajouter un matching **par frontière de mot** (`\b` sur texte désaccentué) au lieu du `includes`, avec tolérance pluriel/stem.
- Ajouter `scoreRelevance(fields, keywords)` : nombre de tokens distincts trouvés + bonus si le titre contient le token (poids fort) + bonus si **tous** les tokens sont présents.
- Ajouter `normalizeCategorySafe()` : renvoie `null` quand la détection est incertaine ou vaut `autre`, et ne s'applique **jamais** au texte brut, uniquement à la catégorie renvoyée par l'IA.

### B. `waouh-webhook` (branche BUY)
- Utiliser `normalizeCategorySafe(criteria.category)` ; la catégorie devient un **signal de tri**, plus un filtre `eq` (sauf si l'utilisateur nomme explicitement la catégorie).
- Appliquer le post-filtre strict **toujours** (articles, catalogue unifié, radar, external), en retirant `city` du haystack radar.
- Trier chaque source par `scoreRelevance` décroissant, puis distance/date, avant slicing.
- **Corriger la numérotation** : construire `last_matches` à partir exactement de `partnerTop`, `matchesTop`, `radarTop` dans l'ordre affiché ; les promotions radar réutilisent l'ordre de `radarTop`.
- Si aucun résultat n'atteint un score minimal, renvoyer le message « aucun résultat, profil enregistré » plutôt que des approximations.

### C. `waouh-buy-handler`
- Mêmes règles : catégorie non bloquante, post-filtre toujours actif, tri par pertinence puis distance, cohérence des index d'attachements.

### D. Tests / validation
- Test unitaire (vitest) sur `matchesAnyKeyword` / `scoreRelevance` : « zara » ne matche pas « bazar », « sac » ne matche pas « sachet », « iPhone 12 » classe l'iPhone 12 avant l'iPhone 11.
- Tests end-to-end via `curl_edge_functions` sur `waouh-webhook` : requêtes « je cherche Zara », « je cherche un terrain », « iPhone 12 à Cotonou » — vérifier que les titres retournés contiennent le mot-clé et que `last_matches[N-1]` correspond bien à l'élément n°N affiché.
- Vérification des logs edge après déploiement.

### Périmètre exclu
Aucune modification de l'UI chat, du flux de négociation/CONFIRM, du dispatch de notifications, des deals, ni des modules Radar/Diffusion/Agents (hors filtrage de pertinence décrit ci-dessus). Le flux de synchronisation chat verrouillé (`waouh-chat-sync-flow`) n'est pas touché.
