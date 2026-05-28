## Diagnostic

Les symptômes viennent probablement d’une combinaison de problèmes côté base, backend et frontend :

1. **Realtime incomplet**
   - `waouh_messages` et `waouh_outbound_queue` sont dans `supabase_realtime`.
   - `waouh_notifications` n’y est pas, donc les nouvelles notifications d’annonce publiée / acheteur trouvé ne peuvent pas arriver instantanément dans l’application.

2. **Permissions Data API manquantes ou insuffisantes**
   - Les tables WAOUH critiques (`waouh_messages`, `waouh_notifications`, `waouh_outbound_queue`, `waouh_users`) n’ont pas de GRANT visibles pour `anon` / `authenticated`.
   - Résultat probable : le frontend interroge Supabase mais reçoit des erreurs silencieuses ou des listes vides, donc l’historique, les messages envoyés, les notifications et les photos ne remontent pas correctement.

3. **Politiques RLS incohérentes avec le frontend**
   - Des policies utilisent un header `x-waouh-session`, mais le client Supabase actuel n’envoie pas ce header.
   - Le frontend essaie aussi de lire par `waouh_users.id` et `auth_user_id`, mais les policies ne couvrent pas correctement ce cas pour l’utilisateur connecté.

4. **Notifications in-app pas assez liées à la session/app**
   - `waouh_notifications` stocke `user_id`, `photos`, `payload`, etc., mais pas de `web_session_id` direct.
   - Pour l’app, il faut pouvoir retrouver les notifications à la fois par session web, compte connecté et identité WhatsApp liée.

5. **Photos stockées mais pas toujours affichées**
   - Les derniers messages et articles montrent bien des URLs de photos dans `attachments`, `photos` ou `waouh_notifications.photos`.
   - Le problème semble donc plutôt être le chargement/autorisation/synchronisation côté application, plus que la création des photos.

## Plan de correction

### 1. Corriger la base Supabase

Créer une migration pour :

- Ajouter `waouh_notifications` à `supabase_realtime` avec protection contre les doublons.
- Ajouter `web_session_id` à `waouh_notifications` pour que l’application puisse charger les notifications par session.
- Ajouter les index utiles :
  - notifications par `user_id + sent_at`
  - notifications par `web_session_id + sent_at`
  - messages par `user_id + created_at`
- Ajouter les GRANT nécessaires pour que l’app puisse lire les données WAOUH :
  - `waouh_messages`
  - `waouh_notifications`
  - `waouh_outbound_queue`
  - `waouh_users`
- Ajuster les policies RLS pour autoriser :
  - lecture des messages de la session courante
  - lecture des messages des `waouh_users` liés au compte connecté
  - lecture des notifications de la session courante
  - lecture des notifications des `waouh_users` liés au compte connecté
  - lecture limitée de `waouh_users` uniquement pour résoudre les identités de la session ou du compte connecté

### 2. Corriger `waouh-notify-dispatch`

- Lors de l’insertion dans `waouh_notifications`, renseigner aussi `web_session_id` quand la cible a une session app/web.
- Inclure dans `payload` :
  - `article_id`
  - `buyer_profile_id`
  - `message_id` si disponible
  - `photos`
  - le canal résolu (`waouh_app`, `whatsapp`, `radar_ia`, `partner`)
- Vérifier explicitement les erreurs d’insertion Supabase au lieu de les ignorer.

### 3. Corriger `waouh-channel-in`

- Après l’appel à `waouh-webhook`, retourner aussi au frontend :
  - `attachments`
  - `article_id`
  - `transaction_id`
  - `actions`
- Aujourd’hui le message est persisté avec attachments, mais la réponse HTTP ne renvoie pas toutes ces données : si le refresh échoue à cause des permissions, l’UI peut perdre l’affichage immédiat.
- En cas d’erreur de persistence du message entrant ou sortant, logger et retourner une erreur claire.

### 4. Corriger `WaouhWebChat.tsx`

- Ne plus supprimer le message optimiste si le refresh historique échoue silencieusement.
- Vérifier les erreurs Supabase dans `loadHistory`; afficher un toast/log clair si la lecture est refusée.
- Après envoi, fusionner :
  - message optimiste utilisateur
  - réponse backend
  - historique Supabase
  au lieu de remplacer brutalement par une liste potentiellement vide.
- Quand la réponse backend contient des `attachments`, les afficher immédiatement.
- Recalculer/charger les `waouhIds` juste après création d’un nouvel utilisateur WAOUH, pas seulement au montage.

### 5. Corriger `useWaouhMatchNotifications.ts`

- Charger l’historique depuis :
  - `waouh_notifications`
  - `waouh_outbound_queue`
  - et fallback localStorage
- Vérifier les erreurs Supabase au lieu d’ignorer `error`.
- Lire les photos depuis :
  - `row.photos[0]`
  - `row.payload.photos[0]`
  - `row.image_url`
- Pour Realtime, s’abonner à :
  - `waouh_notifications` par `web_session_id`
  - `waouh_notifications` par chaque `user_id`
  - `waouh_outbound_queue` par `web_session_id`
  - `waouh_outbound_queue` par chaque `user_id`

### 6. Vérification

Tester ensuite :

- Publier une annonce dans l’application avec photo.
  - Le message envoyé reste visible.
  - Le retour “Annonce publiée” apparaît.
  - La photo s’affiche dans la bulle.
  - La notification “Annonce publiée” apparaît avec photo.

- Rechercher l’annonce dans l’application.
  - Les annonces trouvées affichent les mêmes photos que celles stockées.

- Publier/rechercher depuis WhatsApp.
  - Le message WhatsApp est stocké.
  - Le retour WhatsApp est aussi visible dans l’application quand l’identité est liée.
  - Les notifications `match`, `new_buyer`, `sale_published` apparaissent avec les photos.

- Vérifier en base :
  - lignes dans `waouh_messages`
  - lignes dans `waouh_notifications`
  - photos dans `attachments` / `photos`
  - `web_session_id` ou `user_id` correct pour chaque notification.

## Fichiers à modifier

- `supabase/migrations/...sql`
- `supabase/functions/waouh-notify-dispatch/index.ts`
- `supabase/functions/waouh-channel-in/index.ts`
- `src/components/waouh/WaouhWebChat.tsx`
- `src/hooks/useWaouhMatchNotifications.ts`
- éventuellement `src/components/waouh/WaouhNotificationsBell.tsx` pour mieux afficher les miniatures si nécessaire.