## Diagnostic confirmé

- Les messages de la transaction visible dans la capture existent bien en base : `21` messages pour l’article `6e39e48d-bbec-4e45-9ae9-4cdf26c7e9c4` (`ACH-E9C4-F13`).
- Le problème n’est pas une suppression de données : `waouh_messages.article_id` et `meta.article_id` sont bien remplis.
- La cause probable est le chargeur `waouh-match-history` : il filtre l’historique par `web_session_id` courant et/ou `waouh_users` liés au viewer. Après actualisation/appareil/session différente, le `sessionId` local peut changer ou ne plus correspondre, donc l’Edge Function renvoie `messages: []` même si l’article a un historique complet.
- J’ai vérifié que le flux verrouillé reste isolé : ne pas modifier `waouh-webhook`, `waouh-negotiation-router`, ni les invariants temps réel de `WaouhMatchChatWindow`.

## Plan de correction

1. Renforcer `waouh-match-history` sans modifier le flux verrouillé
   - Ajouter `authUserId` dans l’appel depuis `WaouhMatchChatWindow` quand l’utilisateur est connecté.
   - Dans l’Edge Function, résoudre tous les `waouh_users` liés à cet `authUserId`, pas seulement la session locale.
   - Ajouter un fallback sécurisé pour les conversations clôturées/vendues : si aucun message n’est trouvé via le viewer, charger l’historique article-scopé seulement quand l’article/notification prouve que le viewer est vendeur ou acheteur lié.

2. Stabiliser le contexte d’identité côté frontend
   - Passer `authUserId` de `WaouhChatScreen` vers `WaouhMatchChatWindow`.
   - Garder `sessionId` pour les invités, mais ne plus dépendre uniquement du `sessionId` après reconnexion/refresh.
   - Conserver le cache local uniquement comme affichage instantané, jamais comme source unique.

3. Améliorer l’état vide de la fenêtre
   - Si l’Edge Function répond vide alors que l’article est chargé, afficher un état “Synchronisation…” / “Aucun message chargé depuis la base” au lieu d’un écran vierge silencieux.
   - Garder l’indicateur existant `Sync · heure · N msg`, mais le rendre fiable avec le nombre réellement chargé depuis la base.

4. Ajouter un test de non-régression ciblé
   - Étendre le test verrouillé existant pour vérifier que `WaouhMatchChatWindow` transmet `authUserId` à `waouh-match-history`.
   - Ajouter des invariants sur `waouh-match-history` : recherche par `auth_user_id`, fallback article-scopé contrôlé, pas de mutation des messages.

5. Vérification
   - Tester l’Edge Function sur l’article `ACH-E9C4-F13` avec : session vendeur, auth acheteur sans session d’origine, et session inconnue.
   - Vérifier que les messages reviennent pour les identités liées et restent vides pour une identité inconnue.
   - Ne pas toucher aux règles verrouillées NEGOTIATE / Router / realtime filter / suppression `seedNotif.text`.