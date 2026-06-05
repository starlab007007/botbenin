## Diagnostic confirmé

Les messages "Oui" envoyés par l'utilisateur sont bien sauvegardés en base (`meta->>article_id` contient l'ID de l'article), mais **la colonne `article_id` n'existe pas** sur la table `waouh_messages`. Conséquences :

1. La requête de rechargement dans `WaouhMatchChatWindow.fetchArticlePage` utilise :
   ```
   .or(`article_id.eq.<id>,meta->>article_id.eq.<id>`)
   ```
   La référence à la colonne inexistante `article_id` fait échouer (ou ignorer) la clause `.or()` selon le pilote → au remount, **aucun message n'est rechargé** depuis la DB. Seul l'état optimiste en mémoire reste visible, et il disparaît dès qu'on ferme/rouvre l'onglet.
2. Les inserts dans `waouh-channel-in` envoient un champ `article_id` qui est silencieusement perdu (donc seul `meta.article_id` est réellement stocké), ce qui rend le filtrage par colonne impossible.
3. Les réponses automatiques visibles dans la capture ("Désolé, je n'ai pas compris") sont des bulles **out** déjà historisées différemment ou rejouées par la logique — c'est pourquoi seules les sorties semblent persister.

## Correction

### 1. Migration SQL — ajouter la colonne et backfill
- Ajouter `article_id uuid NULL` sur `public.waouh_messages`.
- Créer un index `idx_waouh_messages_article_id` (filtré `WHERE article_id IS NOT NULL`).
- Backfill : `UPDATE waouh_messages SET article_id = (meta->>'article_id')::uuid WHERE article_id IS NULL AND meta ? 'article_id'`.
- Conserver `meta.article_id` pour rétro-compatibilité.

### 2. Aucune modification frontend nécessaire
- `WaouhMatchChatWindow` utilise déjà `or(article_id.eq.X, meta->>article_id.eq.X)` : la requête fonctionnera dès que la colonne existera.
- `WaouhMatchChatList` lit déjà `meta->>article_id`.
- L'edge `waouh-channel-in` envoie déjà `article_id` dans l'insert et dans `meta` : la colonne sera correctement renseignée sans changement de code.

### 3. Vérification
- Confirmer côté DB que les nouveaux messages `in` (utilisateur) ont bien la colonne `article_id` remplie.
- Tester : ouvrir un match, envoyer "Oui", attendre la réponse, fermer l'onglet, rouvrir → "Oui" et la réponse doivent persister.
- Vérifier que l'historique ancien (messages où seul `meta.article_id` existait) reste accessible grâce au backfill et au fallback `meta->>article_id`.

Aucun changement de code applicatif n'est requis ; une seule migration résout le problème pour toutes les fenêtres de `WaouhMatchChatList`/`WaouhMatchChatWindow`.
