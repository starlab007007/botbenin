## Objectif

Faire apparaître chaque notification "📩 intéressé N" comme une ligne distincte en tête de `WaouhMatchChatList`, et garantir que l'ouverture charge exactement le `payload.text` riche de CETTE notification dans `WaouhMatchChatWindow`.

## Cause racine confirmée

- `WaouhMatchChatList` regroupe par `article_id + role` → "intéressé 1", "intéressé 2"… fusionnés en 1 ligne (seule la plus récente "gagne", les nouvelles sont masquées si la clé a été archivée).
- `WaouhMatchChatWindow` recharge le seed via `eq("article_id", …) order desc limit 1` → texte ambigu, pas forcément celui sur lequel l'utilisateur a cliqué.
- `useWaouhMatchChats` réutilise la même clé `${role[0]}_${articleId}` → impossible d'ouvrir deux notifications distinctes pour le même article.

## Changements

### 1. `WaouhMatchChatList.tsx`
- Clé de ligne = `notification.id` (plus de `itemKey(role, articleId)`).
- Une ligne par notification `new_buyer | match | match_seller | match_buyer | radar_match`, triées `sent_at DESC`.
- Badge "Dernier" sur la première ligne ; "Nouveau" tant que `opened=false`.
- `open()` : marque seulement CETTE notif `opened=true` (par `id`), puis dispatch `waouh:open-match-chat` avec `notification_id`, `article_id`, `payload.text` (snapshot), `payload.title/price/city/photos`, `kind`.
- Garder le fallback messages 48h mais sans écraser les lignes notifs (pas de regroupement). Stub message → clé synthétique `msg_${articleId}_${role}` (différent espace de noms).
- Archivage : continue par `key` (donc par notification.id), mais on désactive l'auto-archivage par date pour les notifs récentes < 7 j (logique inchangée).

### 2. `WaouhMatchChatWindow.tsx` + `MatchChatMeta`
- Ajouter `notification_id?: string | null` et `seed_text?: string | null` dans `MatchChatMeta`.
- Si `seed_text` fourni → l'afficher directement (pas de re-fetch).
- Sinon, si `notification_id` fourni → `select(...).eq("id", notification_id).maybeSingle()`.
- Fallback actuel (par `article_id`) uniquement si rien d'autre n'est dispo.
- Le titre header reste l'article ; la bulle riche utilise toujours `whitespace-pre-wrap font-mono`.

### 3. `useWaouhMatchChats.ts`
- Clé d'onglet = `notification_id` si présent, sinon `n_${role}_${articleId}_${ts}`. Permet plusieurs onglets pour un même article.
- Propager `notification_id` et `seed_text` dans `MatchChatMeta`.
- Archivage à la fermeture inchangé (par key).

### 4. `useWaouhMatchNotifications.ts`
- Dans `onUnifiedInsert`, inclure `notification_id: row.id`, `seed_text: row.payload?.text`, `photos` (tableau complet) dans le `detail` de `waouh:open-match-chat`.
- Ne plus dériver `kind` uniquement du type : respecter aussi `payload.recipient` si fourni.

## Aucun changement backend
Edge functions (`waouh-webhook`, `waouh-notify-dispatch`, format WAOUH) restent identiques — le `payload.text` est déjà correct et figé côté serveur.

## Validation
1. Côté vendeur : envoyer 2 fois "intéressé 1" depuis 2 sessions acheteur → 2 lignes distinctes apparaissent en haut, badges "Dernier"/"Nouveau", ouverture de chacune affiche son propre texte riche.
2. Côté acheteur : `match_buyer` distinct → ligne séparée, même comportement.
3. Vérifier qu'archiver une notif ne masque pas les autres du même article.
4. Vérifier que `WaouhMatchChatWindow` ouvre le bon `payload.text` même si une notif plus récente existe pour le même article.
