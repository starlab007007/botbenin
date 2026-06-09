## Diagnostic des Fails affichés

⚠️ **Bonne nouvelle d'abord** : les **2 runs les plus récents** (`4b11e533` à 18:51:34 et `9ea6607c` à 18:49:45) sont **9/9 OK ✅**. Les Fails que tu vois sont **historiques** — ils correspondent à la progression des correctifs appliqués lors du débogage. Le tableau du bas affiche le tout premier run (`2aaaca0e` à 18:41:52) parce que tu l'as cliqué manuellement, et le composant ne ré-sélectionne pas automatiquement le dernier run après "Exécuter tests".

### Frise chronologique des 7 runs Fail

| Run | Heure | OK/Warn/Fail | Cause racine | Statut |
|---|---|---|---|---|
| `2aaaca0e` | 18:41:52 | 0/0/9 | Colonne `name` inexistante sur `waouh_users` — schéma attend `display_name` | ✅ corrigé |
| `89fe1f14` | 18:45:50 | 0/0/1 | Même bug `display_name` (test partiel, 1 cellule) | ✅ corrigé |
| `a4b814f6` | 18:47:07 | 0/0/9 | `waouh_articles.category` NOT NULL violé (insert sans category) | ✅ corrigé |
| `1b0d8e26` | 18:47:49 | 0/6/3 | Category `"divers"` rejetée par CHECK constraint (`smartphone\|ordinateur\|vetement\|vehicule\|electromenager\|meuble\|autre`) — partner/radar passent (warn) car ils utilisent une autre voie | ✅ corrigé → `"autre"` |
| `c5a17128` | 18:48:26 | 6/0/3 | Partenaire seul KO : enum `waouh_catalog_type` n'accepte pas `"produit"` (valeurs valides : `offer`, `demand`) | ✅ corrigé → `"offer"` |
| `b5d21c0d` | 18:48:51 | 6/0/3 | Partenaire seul KO : `waouh_unified_catalog.source_ref_id` NOT NULL + promoter sélectionnait `image_url` (colonne inexistante) → silently `null` row | ✅ corrigé (UUID injecté + select assaini) |
| `9ea6607c` | 18:49:45 | **9/0/0** | — | ✅ vert |
| `4b11e533` | 18:51:34 | **9/0/0** | — | ✅ vert |

### Ce qui reste à corriger (UX, pas backend)

**Problème 1** — Sélection figée sur l'ancien run après "Exécuter tests"
`loadRuns()` ne met à jour `selected` que si `!selected`. Résultat : après un nouveau run, tu vois encore l'ancien run sélectionné.

**Problème 2** — Pollution visuelle : 7 runs Fail historiques en haut de la liste alors qu'ils n'ont plus aucune valeur diagnostique.

**Problème 3** — Quand un run est OK, on n'affiche aucun détail "preuve" (ex: combien d'entrées dans `waouh_outbound_queue`, IDs de deal/négociation), ce qui rend difficile la confiance.

**Problème 4** — Pas de message clair quand la run sélectionnée est obsolète vs. dernière run réussie.

## Plan de correction

### 1. UX du tableau Runs récents (`WaouhE2ETestsTab.tsx`)
- Après `runAll()`, **forcer** `setSelected(data[0])` (le dernier run) au lieu de garder l'ancien.
- Idem dans `loadRuns()` : si la run sélectionnée n'existe plus dans la liste, basculer sur la première.
- Ajouter un bouton **"🗑 Purger les anciens runs Fail"** qui supprime de `waouh_e2e_test_runs` les runs antérieurs au dernier run OK (préserve le dernier OK + les Fail des dernières 24h).
- Ajouter un bandeau vert/rouge en haut : *"Dernier run : OK · 9/9 cellules · il y a 3 min"*.

### 2. Affichage des cellules OK
Les cellules qui passent affichent déjà leurs étapes (publish, buyer_interest, counters, accept, queue_audit). Ajouter dans le tableau une **colonne "Artefacts"** condensée affichant `article_id`, `negotiation_id`, `deal_id` (8 premiers caractères, cliquables → ouvrent la trace WAOUH si on a la route).

### 3. Lien direct vers la trace
Sous chaque cellule, ajouter un mini-lien *"Voir trace dans `/admin/waouh/historique?article_id=…`"* pour permettre d'inspecter visuellement.

### 4. Export rapport amélioré
Inclure dans le `.md` exporté la section "Artefacts" et le détail JSON brut des étapes warn/fail pour audit.

### 5. Pas de changement backend
Les 3 edge functions clés (`waouh-e2e-test`, `waouh-notify-dispatch`, `waouh-buyer-interest`) sont à jour et passent 9/9. Pas de migration nécessaire.

### Coût estimé
1 fichier modifié (`src/components/admin/WaouhE2ETestsTab.tsx`), pas de nouvelle table, pas d'edge function, pas de migration. ~80 lignes ajoutées.

### Question rapide

Veux-tu :
- **A.** Tout : forcer sélection latest + bandeau résumé + purge + artefacts + lien historique (recommandé)
- **B.** Juste le strict minimum : forcer sélection latest + bandeau "Dernier run OK"
- **C.** Juste purger les anciens Fail et garder l'UI actuelle
