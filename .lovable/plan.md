## Diagnostic

- La fonction `waouh-radar-api-config` est joignable : un appel direct retourne `401 Unauthorized`, donc elle ne plante plus au chargement.
- Le vrai problème restant côté navigateur est que les erreurs `401/403` de cette fonction repartent sans headers CORS, car `assertAdmin()` lance une `Response` brute et le `catch` la retourne telle quelle. Résultat : le navigateur masque l’erreur réelle et affiche seulement `Failed to send a request to the Edge Function`.
- La configuration existe en base, mais elle est inactive et sans clés :
  - `apify`: désactivé, aucune clé
  - `serpapi`: désactivé, aucune clé
- Le panneau actuel n’est pas assez exploitable : il liste des champs mais ne guide pas clairement l’admin sur où cliquer pour ajouter/changer une clé, activer le provider, tester puis lancer un scan.

## Plan de correction

1. **Corriger l’erreur “Failed to send…”**
   - Dans `waouh-radar-api-config`, remplacer les retours `Unauthorized` / `Forbidden` bruts par des réponses JSON avec CORS.
   - Exemple de résultat attendu côté UI : `Non autorisé` ou `Accès admin requis`, au lieu de `Failed to send a request to the Edge Function`.
   - Ajouter le même format d’erreur CORS pour toutes les branches d’échec de cette fonction.

2. **Rendre le panneau Configuration API Radar évident**
   - Ajouter un état visible en haut : “SerpAPI non configuré” / “Apify non configuré” / “Actif”.
   - Remplacer les champs ambigus par un parcours clair :
     - `1. Coller / changer la clé API`
     - `2. Enregistrer la clé`
     - `3. Activer le provider`
     - `4. Tester la connexion`
   - Afficher des boutons explicites : `Changer la clé`, `Enregistrer`, `Activer`, `Tester`.
   - Afficher les erreurs retournées par l’Edge Function dans le panneau, pas seulement en toast.

3. **Éviter un panneau vide ou inutilisable**
   - Si la liste de configuration ne charge pas, afficher une alerte claire avec un bouton `Réessayer`.
   - Si aucune ligne de configuration n’est retournée, afficher un état vide explicite au lieu d’une carte blanche.
   - Garder les deux providers attendus (`SerpAPI`, `Apify`) visibles même si la réponse est incomplète.

4. **Améliorer les boutons Radar IA**
   - Quand SerpAPI ou Apify n’a pas de clé active, le bouton de scan affichera une erreur utile : `Configurez et activez SerpAPI avant de lancer ce scan`.
   - Conserver les boutons existants (`SerpAPI`, `Apify`, `Process queue`) mais rendre leur retour plus lisible : succès, provider désactivé, quota atteint, clé absente.

5. **Vérification après correction**
   - Tester `waouh-radar-api-config` avec et sans session admin pour confirmer qu’on obtient une erreur JSON lisible au lieu d’un échec réseau.
   - Tester le chargement du panneau Configuration API Radar.
   - Tester le parcours : coller une clé → enregistrer → activer → tester.
   - Tester `Re-sync depuis signaux` et les boutons `SerpAPI` / `Apify` / `Process queue` pour confirmer que les erreurs sont structurées et exploitables.