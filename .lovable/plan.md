## Diagnostic

Les 3 flux WAOUH (A — Vendeur WA + Acheteur WA, B — Vendeur App + Acheteur WA, C — Vendeur WA + Acheteur App) étaient verrouillés et validés en **v12** à 20:10 le 10 juin. À **22:11 le 10 juin**, la migration `20260610221129_*.sql` (« Phase 1 — Critical RLS Hardening ») a remplacé les politiques permissives par des politiques strictes sur 4 tables critiques du chat. Vérifié via `pg_policies` aujourd'hui — voici l'état actuel des politiques SELECT/UPDATE de `waouh_messages` :

- `waouh_messages auth user read` → `user_id IN (SELECT id FROM waouh_users WHERE auth_user_id = auth.uid())`
- `waouh_messages session-scoped read` → exige le header `x-waouh-session`

### Conséquence directe sur les flux A/B/C

Dans `WaouhMatchChatWindow` et `app-mobile/screens/ChatScreen` (et `useGlobalChatSync`, `useUnreadCounts`), les requêtes lisent par `conversation_id`. Or RLS filtre ligne à ligne :

- Un message émis par le **contrepartie** (vendeur WA si on est acheteur App, ou inverse) porte le `user_id` de l'émetteur — pas celui de l'utilisateur connecté. La nouvelle politique ne le rend donc **pas visible**.
- Le client App n'envoie pas le header `x-waouh-session`, donc la politique « session-scoped » ne s'applique pas non plus.
- Résultat : la fenêtre de chat n'affiche que les messages **sortants** de l'utilisateur ; les messages entrants disparaissent + le realtime INSERT (filtre `user_id=eq.<self>`) ne déclenche jamais sur un message reçu.

Le même problème touche `waouh_notifications` (notifications du vendeur App pour un acheteur qui répond via WA filtrées hors champ) et `waouh_outbound_queue` (lecture session permissive supprimée).

Avant l'audit, la politique permissive `web_session_id IS NOT NULL` (sans contrainte de match) laissait passer tous les messages d'une conversation, ce qui faisait fonctionner les 3 flux — mais constituait effectivement une faille (lecture globale).

## Plan de restauration

Restaurer **le comportement fonctionnel du 10 juin 23:07** en conservant les durcissements qui ne touchent pas le chat. On rejoue les anciennes politiques permissives sur les 4 tables impactées, à l'identique de l'état pré-audit.

### Migration unique `restore_waouh_chat_rls_v12`

Tables touchées (rollback ciblé) :

1. **`waouh_messages`** — recréer `waouh_messages session read` avec `USING (web_session_id IS NOT NULL)` (et garder l'actuel `auth user read` et `session-scoped read` par header, qui ne gênent pas).
2. **`waouh_notifications`** — recréer `waouh_notifications session read` (`USING (web_session_id IS NOT NULL)`) + `waouh_notifications mark read` (UPDATE `USING (true)`), tout en gardant les politiques `auth user read/update` et `session ... token`.
3. **`waouh_outbound_queue`** — recréer `waouh_outbound_queue session read` (`USING (web_session_id IS NOT NULL)`) en complément de la version header-validée.
4. **`waouh_users`** — recréer `waouh_users self lookup` et `waouh_users link self` avec la branche permissive `web_session_id IS NOT NULL` (lookup réussi avant header) — nécessaire pour que `useWaouhIdentity` retrouve l'identité côté web/app.

### Volet hors RLS

- Aucun changement aux edge functions (`waouh-notify-dispatch`, `waouh-negotiation-router`, `waouh-match-history`, `waouh-webhook`) : le lock v12 reste actif.
- Aucun changement aux composants frontend : `WaouhMatchChatWindow`, `useWaouhMatchChats`, `useGlobalChatSync`, `useUnreadCounts` restent verrouillés v12.
- Le test de non-régression `waouh-chat-sync-flow.lock.test.ts` (v12) continue de passer car aucun invariant code n'est touché.

### Ce qu'on **garde** du Phase 1 (durcissements non liés au chat)

- `payment_transactions` — branche guest supprimée ✅
- `ia_creator_user_usage` — writes restreints au service_role ✅
- `anonymous_visitor_sessions` — UPDATE `USING (true)` retiré ✅
- `storage.objects` public-media DELETE owner-only ✅
- `waouh_radar_auto_settings` (nouvelle table admin) ✅

### Validation après migration

1. `pg_policies` doit lister 5 SELECT sur `waouh_messages` (admin, auth user, session token, session permissive, anon insert) et l'équivalent sur `waouh_notifications`.
2. Test fonctionnel manuel des 3 scénarios A/B/C dans l'app (vendeur App reçoit le message WA acheteur, et vice-versa).
3. Aucune régression sur les tests Vitest existants (`bunx vitest run`).

### Note de sécurité

La permissivité restaurée est documentée comme **dette technique acceptée pour la production v12**. Une refonte ultérieure (politique participante via SECURITY DEFINER `is_waouh_conversation_participant(uid, conv_id)` joignant `waouh_negotiations.buyer_user_id`/`seller_user_id`) sera proposée séparément hors scope.

## Détails techniques (SQL principal)

```sql
-- 1) waouh_messages : restaurer la lecture session permissive
CREATE POLICY "waouh_messages session read"
  ON public.waouh_messages FOR SELECT TO public
  USING (web_session_id IS NOT NULL);

-- 2) waouh_notifications : restaurer lecture + mark-read permissives
CREATE POLICY "waouh_notifications session read"
  ON public.waouh_notifications FOR SELECT TO public
  USING (web_session_id IS NOT NULL);

CREATE POLICY "waouh_notifications mark read"
  ON public.waouh_notifications FOR UPDATE TO public
  USING (true) WITH CHECK (true);

-- 3) waouh_outbound_queue : restaurer lecture session permissive
CREATE POLICY "waouh_outbound_queue session read"
  ON public.waouh_outbound_queue FOR SELECT TO public
  USING (web_session_id IS NOT NULL);

-- 4) waouh_users : restaurer self lookup + link self permissifs
DROP POLICY IF EXISTS "waouh_users self lookup auth" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users session lookup token" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self auth" ON public.waouh_users;
DROP POLICY IF EXISTS "waouh_users link self session" ON public.waouh_users;

CREATE POLICY "waouh_users self lookup"
  ON public.waouh_users FOR SELECT TO public
  USING (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR web_session_id IS NOT NULL
  );

CREATE POLICY "waouh_users link self"
  ON public.waouh_users FOR UPDATE TO public
  USING (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR web_session_id IS NOT NULL
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
    OR web_session_id IS NOT NULL
  );
```
