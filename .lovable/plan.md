## 1. Module Diffusion — boutons d'action invisibles

**Diagnostic**
- Les boutons `Enregistrer` (Ajouter contact), `Importer N` (Import) et `Créer la campagne` existent bien dans le `footer` du composant `NativeScreen` (lignes 439, 1006, 1082 de `DiffusionScreen.tsx`).
- Le composant `NativeScreen` est en `fixed inset-0 z-[60]`, mais le `<footer>` est rendu **après** le `<main>` qui occupe toute la hauteur. Sur petits viewports (≤ 700 px) avec clavier ouvert + `env(safe-area-inset-bottom)`, le footer sort de l'écran car `flex-col` sans `min-h-0` sur le conteneur racine peut laisser le main pousser le footer.
- Aucun bouton explicite **« Créer & Lancer »** n'existe : la création produit uniquement un brouillon, l'utilisateur doit ensuite retrouver la campagne dans la liste pour cliquer « Lancer » → impression que le bouton manque.

**Corrections**
- `NativeScreen` : ajouter `min-h-0` sur le wrapper et garantir `flex-shrink-0` sur le `footer` ; rendre le footer **sticky** (position sticky bottom-0) avec `z-10` à l'intérieur du conteneur fixed, et appliquer `pb-[calc(env(safe-area-inset-bottom)+12px)]`. Ajouter `mb-[80px]` au main si BottomTabBar visible.
- Ajouter dans le formulaire « Nouvelle campagne » un **double bouton** dans le footer :
  - `Enregistrer (brouillon)` (secondaire)
  - `Créer & Lancer maintenant` (primaire vert) → enchaîne `createCampaign` puis `launchCampaign(id)`.
- Idem pour `ContactAddScreen` et `ContactImportScreen` : footer sticky, et désactivation visuelle claire si champs vides (pas masqué).

## 2. Module WhatsApp IA — isolation stricte par utilisateur

**Diagnostic**
Trois fuites identifiées via `pg_policy` sur `whatsapp_accounts` :
1. Policy `WA: anyone can view admin shared accounts` → `USING (is_admin_shared = true)` : tout compte marqué partagé est visible par tous.
2. Policy `whatsapp_accounts_select_own` autorise `user_has_permission(auth.uid(),'whatsapp.view.all')` → permission largement attribuée.
3. Hook `useDiffusionSessions` (`src/hooks/useDiffusionSessions.ts`) fait toujours `.or('user_id.eq.{id},is_admin_shared.eq.true')`.
4. Hook `useWhatsAppAccounts.ts` ligne 44–52 fait un `SELECT *` sans filtre `user_id` (s'appuie sur RLS, mais les policies ci-dessus laissent passer le shared).

**Corrections (migration SQL + code)**
- Migration : `DROP POLICY` sur les 2 policies fuyantes (`WA: anyone can view admin shared accounts`, `WA: admins manage shared accounts`), et réécrire `whatsapp_accounts_select_own` pour ne plus inclure `whatsapp.view.all`. Faire pareil pour `update`/`delete`/`insert` (retirer les branches OR par permission).
- Migration : `UPDATE public.whatsapp_accounts SET is_admin_shared = false` (purge sécuritaire).
- Code : retirer toute branche `is_admin_shared` de `useDiffusionSessions.ts` (filtre `eq('user_id', user.id)` simple) et supprimer la notion de « sessions partagées » dans `DiffusionScreen.tsx` (`isShared`, switch admin).
- Code : `useWhatsAppAccounts.ts` → ajouter `.eq('user_id', user.id)` explicite + filtrer realtime channel par `user_id=eq.{id}`.
- Vérifier policies sœurs sur `whatsapp_bot_links`, `wa_contacts`, `wa_campaigns` → ne garder que `auth.uid() = user_id`.

## 3. Historique messages & notifications par utilisateur

**Diagnostic**
- `ChatListScreen` n'affiche les conversations qu'à partir de `waouh_users.id` (`useWaouhIdentity`), pas des messages WhatsApp entrants.
- Les messages reçus via WhatsApp (table `whatsapp_messages` / sessions WAHA) ne sont pas fusionnés dans l'historique app.
- `NotificationsScreen` (143 lignes) ne souscrit pas en realtime → pas de badge « nouveau ».
- Pas de marquage `is_read` ni d'action « Répondre » depuis la liste.

**Corrections**
- Créer un hook unifié `useUnifiedInbox(userId)` qui agrège en parallèle :
  - Messages app (`waouh_messages` via `waouh_users.id`)
  - Messages WhatsApp (`whatsapp_messages` filtrés par `whatsapp_accounts.user_id = auth.uid()`)
  - Notifications (`notifications` filtrées par `user_id`)
  Retourne `conversations[]` triées par `last_message_at`, avec `unread_count` calculé via `last_read_at` (localStorage par conversation).
- Souscriptions realtime : un channel par table, filtré par `user_id`, qui invalide le cache local et incrémente `unread_count`.
- `ChatListScreen` : badge vert « Nouveau » sur conversations `unread_count > 0`, ouverture marque comme lu.
- `ChatScreen` : input de réponse déjà présent — câbler `onSend` pour router vers WhatsApp (edge function `waha-send-message`) si conversation type=whatsapp, sinon vers `waouh_messages`.
- `NotificationsScreen` : realtime subscribe + bouton « Marquer comme lu » + groupement par jour.

## Détails techniques

**Fichiers à modifier**
- `src/app-mobile/screens/DiffusionScreen.tsx` (footer sticky, bouton Créer & Lancer)
- `src/hooks/useDiffusionSessions.ts` (suppression du OR shared)
- `src/hooks/useWhatsAppAccounts.ts` (filtre user_id explicite)
- `src/hooks/useWaDiffusion.ts` (méthode `createAndLaunch`)
- `src/app-mobile/hooks/useUnifiedInbox.ts` (nouveau)
- `src/app-mobile/screens/ChatListScreen.tsx` (intégration inbox unifié + badges)
- `src/app-mobile/screens/ChatScreen.tsx` (routage réponse WA vs app)
- `src/app-mobile/screens/NotificationsScreen.tsx` (realtime + marquage lu)

**Migration SQL (résumé)**
```sql
DROP POLICY "WA: anyone can view admin shared accounts" ON public.whatsapp_accounts;
DROP POLICY "WA: admins manage shared accounts" ON public.whatsapp_accounts;
DROP POLICY "whatsapp_accounts_select_own" ON public.whatsapp_accounts;
CREATE POLICY "whatsapp_accounts_select_own" ON public.whatsapp_accounts
  FOR SELECT USING (user_id = auth.uid());
-- Idem update/delete/insert sans branche permission
UPDATE public.whatsapp_accounts SET is_admin_shared = false;
```

**Compatibilité**
- Aucun changement de schéma de table, uniquement policies + valeurs.
- Le mode « shared admin » est retiré de l'UI ; un admin peut toujours se créer ses propres sessions.
