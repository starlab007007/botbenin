# Tri chronologique strict + robustesse messages/notifications

## Objectif
Sous la carte WAOUH, toutes les conversations produit (acheteurs intéressés + annonces trouvées) sont affichées **strictement du plus récent au plus ancien**, sans doublon, sans blocage d'envoi/réception, avec coordination temps réel fiable.

## Problèmes identifiés

1. **Tri partiellement faux**
   - Le tri DESC existe mais la déduplication par clé `role_articleId_counterpart` crée parfois 2 lignes pour le même article (une notification avec `buyer_profile_id` puis une autre sans → clé `..._any`). Résultat : doublons et ordre cassé.
   - Le fallback `waouh_messages` cherche une clé existante via `keys().find(k => k.includes(`_${articleId}_`))` ce qui matche n'importe quel rôle et peut rebumper la mauvaise ligne.

2. **Pas de rebump après envoi**
   - `WaouhMatchChatWindow.send()` n'émet pas `waouh:match-updated`, donc l'ordre dans l'inbox ne reflète pas la dernière activité tant qu'on ne reload pas.

3. **Realtime fragile**
   - Listener uniquement sur INSERT `waouh_notifications`. Les nouveaux messages article-scoped (`waouh_messages.article_id`) n'ont pas de canal realtime → l'item ne remonte pas.
   - Plusieurs subscriptions parallèles (1 par `waouhId`) avec le même channel name peuvent provoquer des collisions silencieuses.

4. **Risques d'envoi/blocage**
   - `setSending(true)` sans timeout : si `functions.invoke` reste pendu, le composer reste bloqué indéfiniment.
   - Optimistic temp message peut rester orphelin si l'INSERT realtime arrive avant la réponse → doublon visuel.
   - `WaouhMatchChatWindow` lit les messages en filtrant côté client sur `meta.article_id` après un `OR` large → coûteux et peut rater des messages si la pagination tronque (limit 300).

5. **Marquage "lu" suspect**
   - Le `open()` exécute 3 updates (dont une orpheline `filter` jamais awaitée) → bruit + warnings TS.

## Plan d'action (frontend uniquement)

### A. `WaouhMatchChatList.tsx`

**Déduplication unifiée par article**
- Clé canonique = `${role[0]}_${article_id}` (sans counterpart). Pour un même article + rôle, on garde toujours l'entrée la plus récente. `buyer_profile_id` / `counterpart_user_id` sont conservés depuis la dernière notification (préférence : non-null).
- Cela élimine les doublons "any" vs "with profile".

**Tri strict**
- Tri unique par `last_at DESC` après merge. Pas de pinning séparé : le 1er de la liste = badge "Dernier" automatiquement.
- L'auto-archive 7j reste hors liste principale.

**Realtime renforcé**
- 1 seul `supabase.channel('waouh-match-list-${sid}')` qui combine :
  - `postgres_changes` sur `waouh_notifications` filtré `web_session_id=eq.${sid}`
  - `postgres_changes` sur `waouh_notifications` filtré `user_id=in.(...)` (un listener par uid au sein du même channel)
  - `postgres_changes` sur `waouh_messages` filtré `web_session_id=eq.${sid}` (INSERT) → si `article_id` non null, rebump local.
- Event window `waouh:match-updated` toujours écouté pour bump immédiat post-envoi.
- Cleanup unique au unmount.

**Marquage "lu" propre**
- Une seule requête conditionnelle (sessionId OU waouhIds) avec `.or()`. Suppression de la variable `filter` morte.

### B. `WaouhMatchChatWindow.tsx`

**Émission de l'event bump**
- Après `functions.invoke` réussi, `window.dispatchEvent(new CustomEvent('waouh:match-updated', { detail: { article_id } }))` → l'inbox remonte cette conv en tête.

**Anti-doublon optimistic / realtime**
- Dedup par `id` ET par signature `(direction, text, ~created_at within 5s)` : si on reçoit via realtime un message dont la signature matche un temp, on remplace au lieu d'ajouter.

**Anti-blocage envoi**
- Wrapper `Promise.race` avec timeout 20 s sur `functions.invoke`. En cas de timeout : on garde le temp message marqué "non envoyé" avec bouton réessayer (simple : toast + re-set `input`).
- `try/finally` garantit `setSending(false)` toujours appelé (déjà en place — on confirme).

**Lecture messages**
- Garder le filtre client mais augmenter la sécurité : ajouter `.eq('article_id', match.article_id)` dans la query Supabase quand `article_id` est non null, évitant de dépendre du filtrage `meta` côté client.

### C. `useWaouhMatchChats.ts`
- Quand on ouvre un tab : émettre aussi `waouh:match-updated` pour synchroniser l'ordre côté inbox.

## Fichiers touchés
- `src/components/waouh/WaouhMatchChatList.tsx` (refactor merge + tri + realtime msgs)
- `src/components/waouh/WaouhMatchChatWindow.tsx` (dispatch bump, anti-doublon, timeout envoi, filter article_id côté DB)
- `src/components/waouh/useWaouhMatchChats.ts` (dispatch bump à l'ouverture)

Aucune migration DB, aucune edge function modifiée.

## Garanties après changement
- Ordre = strictement `last_at DESC` sur la fusion (notifications + derniers messages).
- 1 article = 1 ligne par rôle, jamais de doublon.
- Nouvelle notification, nouveau message article-scoped, ou envoi local → la ligne remonte en tête immédiatement.
- Composer jamais bloqué : timeout dur + finally.
- Pas de doublon visuel dans la fenêtre de chat (dedup id + signature).
