## Objectif
Faire en sorte que `WaouhMatchChatWindow` affiche réellement l’historique existant, même quand la conversation vient d’un statut WAOUH dont l’`id` est utilisé comme `article_id` sans ligne correspondante dans `waouh_articles`.

## Diagnostic confirmé
- La capture `test20` correspond à un `waouh_statuses.id = 963aee7d...` avec `article_id = null`.
- Des messages existent bien dans `waouh_messages.article_id = 963aee7d...`.
- L’Edge Function `waouh-match-history` cherche ensuite une preuve de lien via `waouh_articles` ou `waouh_notifications`; pour ce statut, il n’y a pas de ligne `waouh_articles` ni notification liée, donc le filtre strict peut retourner vide selon l’identité courante.
- Côté mobile, `authUserId` transmis à `WaouhMatchChatWindow` vient de `profile?.id`, alors qu’il faut utiliser l’identifiant Supabase auth réel; si le profil n’est pas encore chargé ou absent, l’historique peut être filtré à tort.

## Changements prévus
1. **Côté écran WAOUH mobile**
   - Récupérer aussi `user` via `useMobileAuth()`.
   - Passer `user?.id` comme `authUserId` à `useWaouhMatchChats`, `useWaouhMatchNotifications`, `WaouhUnifiedInbox` et `WaouhMatchChatWindow`.
   - Garder `profile` uniquement pour l’affichage du nom.

2. **Côté Edge Function `waouh-match-history`**
   - Ajouter un fallback sécurisé pour les statuts : si aucun article n’est trouvé dans `waouh_articles`, chercher `waouh_statuses.id = articleId`.
   - Considérer le viewer autorisé si le statut appartient à `authUserId`, ou si un message existant est déjà lié à sa session / son `waouh_user`.
   - Charger les messages par `article_id` / `meta.article_id` comme aujourd’hui, mais ne pas les jeter quand le lien statut est valide.
   - Retourner des métadonnées de debug utiles (`source: article/status`, flags viewer) sans exposer de secret.

3. **Côté `WaouhMatchChatWindow`**
   - Améliorer le message d’état vide pour distinguer “aucun historique trouvé” de “historique non autorisé / identité non liée”.
   - Conserver le cache local et le scroll existants.

## Validation
- Tester en base avec l’exemple `test20` : l’appel `waouh-match-history` doit retourner les 2 messages existants.
- Vérifier que la fenêtre affiche les bulles au lieu du message “Aucun message chargé...”.
- Vérifier qu’un nouveau message envoyé dans cette fenêtre reste bien associé au même `article_id` de statut.