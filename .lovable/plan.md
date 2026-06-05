## Objectif
Corriger la disparition des messages dans toutes les fenêtres produit ouvertes depuis `WaouhMatchChatList`, afin qu’après fermeture/réouverture de la fenêtre ou retour sur l’écran WAOUH, l’utilisateur retrouve toujours l’historique complet lié à l’article.

## Diagnostic principal
- La fenêtre affiche d’abord le cache local, puis recharge depuis `waouh_messages` par `article_id`.
- À l’envoi depuis `WaouhMatchChatWindow`, les messages sont sauvegardés uniquement dans `meta.article_id`, pas dans la colonne `article_id`.
- La liste `WaouhMatchChatList` cherche les messages récents avec `.not("article_id", "is", null)`, donc elle peut ne pas retrouver une conversation si les messages sont seulement dans `meta.article_id`.
- Les réponses IA temporaires utilisent des IDs `temp-out-*`; si la fenêtre est fermée avant que le realtime/DB remplace ou confirme ces messages, elles peuvent rester uniquement en cache local ou disparaître selon la clé/session.
- Quand on ferme un onglet, il est retiré de `waouh_open_matches_*`; à la réouverture, la reconstruction dépend trop de notifications/fallbacks DB, donc elle n’est pas assez robuste.

## Plan de correction

### 1. Sauvegarder les messages produit avec `article_id` réel
Dans `supabase/functions/waouh-channel-in/index.ts` :
- Lors de l’insert du message entrant, renseigner aussi la colonne `article_id` avec `clientMeta.article_id` quand elle existe.
- Lors de l’insert de la réponse sortante, conserver `article_id` depuis `clientMeta.article_id` si le moteur core ne renvoie pas `core.article_id`.
- Retourner aussi l’identifiant de la réponse sortante (`outbound_message_id`) dans la réponse de l’edge function, pour remplacer les bulles temporaires par des lignes persistées.

### 2. Rendre `WaouhMatchChatWindow` persistant après envoi
Dans `src/components/waouh/WaouhMatchChatWindow.tsx` :
- À l’envoi, remplacer le message utilisateur temporaire par l’ID DB réel déjà retourné.
- Remplacer la réponse IA temporaire par `outbound_message_id` quand disponible.
- Mettre `article_id` aussi au niveau racine du message local pour aligner cache, realtime et rechargement.
- Éviter qu’un fetch initial vide ou partiel écrase implicitement l’état déjà en cache.

### 3. Rendre `WaouhMatchChatList` capable de retrouver toutes les conversations produit
Dans `src/components/waouh/WaouhMatchChatList.tsx` :
- Modifier le fallback messages pour lire les conversations où `article_id` est en colonne OU dans `meta->>article_id`.
- Lire le bon champ `meta` au lieu de `metadata`, car `waouh_messages` utilise `meta` dans ce module.
- Ne pas limiter la reconstruction aux seules dernières 48h pour les conversations déjà connues/localement ; garder au moins les tabs/historiques fermés récemment retrouvables automatiquement.

### 4. Garder une trace des chats fermés pour réouverture stable
Dans `src/components/waouh/useWaouhMatchChats.ts` et/ou `WaouhMatchChatList.tsx` :
- Quand une fenêtre est fermée, ne pas supprimer son historique local ; conserver une entrée minimale de conversation connue par clé canonique `art_<articleId>_<role>`.
- À la réouverture depuis la liste, réutiliser la même clé canonique et restaurer d’abord le snapshot local avant les requêtes DB.
- Maintenir la pagination actuelle : 10 derniers messages au départ, anciens messages au scroll vers le haut.

### 5. Vérification
- Vérifier le scénario des captures : ouvrir une fenêtre, envoyer “Oui”, recevoir la réponse, fermer l’onglet, revenir dans la liste, rouvrir la même conversation, confirmer que “Oui” et la réponse restent affichés.
- Vérifier que cela fonctionne pour les deux rôles : acheteur (`ACH-*`) et vendeur (`VEN-*`).
- Vérifier que l’historique ancien se charge toujours progressivement au scroll vers le haut.