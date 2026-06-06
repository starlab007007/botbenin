
# Persistance fiable de l'historique WaouhMatchChatWindow (acheteur / vendeur)

## Diagnostic

L'historique EST déjà écrit en base (`waouh_messages.article_id` est rempli, côté `waouh-channel-in` pour les messages entrants/sortants et côté `_shared/waouh-sync.ts` pour les events synchronisés). Le problème vient du **chargement côté client**, pas du stockage.

Bugs identifiés dans `src/components/waouh/WaouhMatchChatWindow.tsx` + `useWaouhMatchChats.ts` :

1. **Filtre "viewer" incomplet au premier rendu.** `fetchArticlePage` filtre par `web_session_id.eq.<sessionId> OR user_id.in.(waouhIds)`. Or `waouhIds` est résolu dans un `useEffect` séparé et arrive **après** le premier fetch. Au premier mount, `waouhIds = []` → seuls les messages portant `web_session_id` sont récupérés. Tous les messages côté vendeur/acheteur authentifié dont `web_session_id IS NULL` mais `user_id` pointe vers un `waouh_users.id` sont **invisibles**.

2. **Pas de refetch quand `waouhIds` arrive.** Les deps de l'effet de fetch sont `[match.article_id, match.notification_id, match.seed_text]`. Donc même quand l'id viewer est résolu plus tard, la liste n'est jamais relue.

3. **Skip-fetch si cache local ≥ 10 messages.** `skipMsgFetch = cached.length >= PAGE_INITIAL` empêche complètement la relecture serveur tant que le cache localStorage contient ≥10 messages, même s'il est obsolète ou incomplet (cf. bug #1). Si l'utilisateur change d'appareil / vide son cache / passe en navigation privée → 0 message visible.

4. **Source de vérité = localStorage.** Tout l'état (`messages`, `hasMore`, scroll, statut article, seed) bootstrappe depuis localStorage. Si le storage est vidé (cleanup navigateur, autre device, mode privé), la conversation paraît "perdue" même si la DB est intacte.

5. **Filtre côté client fragile.** Chaîner deux `.or()` Supabase + une condition `meta->>article_id` mélangée à du SQL inline expose à des bugs subtils (PostgREST échappe mal certains caractères dans `.or`). Mieux vaut centraliser côté edge function.

## Plan

### 1. Nouvelle edge function `waouh-match-history` (source de vérité serveur)
Endpoint dédié au chargement d'une fenêtre match :
- Entrée : `{ articleId, sessionId, authUserId?, role, before?, limit?: 30 }`
- Côté serveur (service-role) :
  - Résout tous les `waouh_users.id` liés à `(authUserId, sessionId, et leur phone_number éventuel)`.
  - Query `waouh_messages` filtré par `article_id = $1 OR meta->>article_id = $1` AND (`user_id IN (...)` OR `web_session_id = $sessionId`).
  - Tri DESC, `limit`, pagination par `created_at < before`.
  - Renvoie `{ messages, hasMore, articleStatus, seedNotification }` en une seule réponse.
- Avantage : un seul aller-retour, scoping fait côté serveur, pas d'attente de `waouhIds`.

### 2. Refactor `WaouhMatchChatWindow.tsx` — DB = vérité, cache = peinture rapide
- À chaque mount (ou changement de `match.article_id`/`match.key`) : appel `waouh-match-history` **systématiquement**, même si cache présent. Le cache sert uniquement à peindre instantanément, puis on réconcilie via `mergeMsgs`.
- Supprimer `skipMsgFetch`.
- Ajouter un refetch quand `active` redevient true (réouverture d'onglet) avec throttle ~2s.
- Pagination "load older" passe aussi par l'edge function (paramètre `before`).
- Realtime inchangé (déjà branché sur `web_session_id` + chaque `user_id`).

### 3. Rendre le cache non-obligatoire
- `getCached` reste optionnel ; si vide, on n'affiche pas d'écran vide : un spinner discret apparait pendant le premier fetch DB.
- Snapshot localStorage continue d'être écrit (perf), mais n'est plus "skip condition".

### 4. Garantir que toute écriture porte `article_id`
Audit rapide des chemins d'insertion :
- `waouh-channel-in` ✅ (inbound + outbound + negotiation reply)
- `_shared/waouh-sync.ts` ✅
- Vérifier `waouh-negotiation-router`, `waouh-buyer-interest`, `waouh-notify-dispatch` — si un insert oublie `article_id`, l'ajouter (et au moins dans `meta.article_id`).
- Migration légère : backfill `waouh_messages.article_id` depuis `meta->>article_id` pour les lignes existantes où la colonne est NULL.

### 5. Indicateur "synchronisé"
Petit badge dans le header de la fenêtre : "Synchronisé · HH:mm" mis à jour après chaque fetch réussi, pour rassurer l'utilisateur que l'historique vient bien du serveur.

## Détails techniques

- Nouveau fichier : `supabase/functions/waouh-match-history/index.ts`
- Modifs : `src/components/waouh/WaouhMatchChatWindow.tsx` (effet de fetch, suppression skip), `src/components/waouh/useWaouhMatchChats.ts` (rien à changer côté cache, juste s'assurer que `close()` ne supprime pas non plus les snapshots — déjà OK)
- Migration : `UPDATE waouh_messages SET article_id = (meta->>'article_id')::uuid WHERE article_id IS NULL AND meta ? 'article_id';`
- Pas de changement de schéma, pas de changement RLS (service-role côté edge function)

## Hors scope
- Aucune modification du dashboard admin Historique
- Aucune modification de la fenêtre WAOUH principale (non-match)
- Pas de migration de clés localStorage (déjà gérée par `migrateLegacyKeys`)
