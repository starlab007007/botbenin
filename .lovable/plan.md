# Plan — Multi-tenant scoping, public chat avec paywall, page d'accueil

## 1. Isolation stricte par utilisateur (chacun voit uniquement ses données)

### a. WhatsApp IA (`src/app-mobile/screens/WhatsAppScreen.tsx`)
- Bug actuel: la requête utilise `.or('user_id.eq.${user.id},is_admin_shared.eq.true')` → l'utilisateur voit aussi toutes les sessions admin partagées.
- Correction: filtrer uniquement `.eq('user_id', user.id)`. Plus aucun affichage de sessions partagées.
- Vérifier le realtime channel pour qu'il filtre aussi par `user_id`.

### b. Vérif (déjà OK, à confirmer en passant)
- Bots (knowledge_bases) — filtré `user_id=eq.${user.id}` ✓
- Diffusion (whatsapp_diffusion_sessions) — insert lie `user_id`, fetch déjà scopé ✓
- Partenaire (waouh_partners) — déjà `.eq('user_id', user.id)` ✓
- Conversations (waouh_conversations) — déjà via `waouhUserIds` ✓

### c. Audit RLS Supabase
- Linter Supabase sur `whatsapp_accounts`, `knowledge_bases`, `whatsapp_diffusion_sessions`, `waouh_partners` pour s'assurer que les policies SELECT exigent `auth.uid() = user_id` (et ne tolèrent pas `is_admin_shared`).
- Migration corrective si une policy permet la fuite cross-user.

## 2. Renommage "WhatsApp" → "WhatsApp IA"

- `src/app-mobile/layouts/BottomTabBar.tsx` : label `WhatsApp` → `WhatsApp IA`.
- Tous titres / boutons / placeholders dans `WhatsAppScreen.tsx` ("Nouvelle session WhatsApp", "Aucune session WhatsApp", "Connecter WhatsApp", etc.) → "WhatsApp IA".
- `NotificationsScreen.tsx` : `"WhatsApp"` badge → `"WhatsApp IA"`.
- Garder les libellés "WhatsApp" uniquement lorsqu'on parle du vrai produit Meta (ex: "Ouvrez WhatsApp sur votre téléphone" lors du scan QR).

## 3. Accès public à `/app/chat` + paywall après 10 messages

### Routage (`src/AppMobile.tsx`)
- Sortir `chat` du sous-arbre protégé par `RequireMobileAuth`.
- Nouvelle structure:
  - Route publique `/app/chat` → `ChatListScreen` (mode public: n'affiche que la carte WAOUH épinglée, pas la liste de conversations privées).
  - Route publique `/app/chat/waouh` → `WaouhChatScreen`.
  - Toutes les autres routes (`bots`, `whatsapp`, `diffusion`, `partner`, `notifications`, `profile`, `chat/:id`) restent sous `RequireMobileAuth`.

### `ChatListScreen` mode invité
- Si `user` est null: masquer la recherche de conversations, masquer l'avatar profil (remplacer par bouton "Se connecter"), n'afficher que la carte WAOUH + un bouton "Se connecter" dans le header.

### Paywall 10 messages dans `WaouhChatScreen` / `WaouhWebChat`
- Compteur `guest_msg_count` en `localStorage` (clé `waouh_guest_msg_count`).
- À chaque envoi utilisateur (`onUserSend`), si `!user` : incrémenter.
- Si compteur ≥ 10 et `!user` : bloquer le composer, afficher un overlay "Connectez-vous pour continuer" avec CTA → `navigate('/app/auth', { state: { from: '/app/chat/waouh' } })`.
- Reset du compteur à la connexion réussie.

### Guard d'actions pour invités
- Créer un petit hook `useRequireAuthAction()` qui: si `!user`, affiche un toast "Connectez-vous pour continuer" et redirige vers `/app/auth`.
- Brancher dans:
  - Bouton "Nouveau bot" (`KnowledgeBasesListScreen` → bouton `+`)
  - Bouton "Nouvelle session WhatsApp IA" (`WhatsAppScreen`)
  - Bouton "Nouvelle campagne" (`DiffusionScreen`)
  - Bouton "Ajouter entreprise" (`PartnerBusinessesScreen`)
- Concrètement: comme ces écrans restent derrière `RequireMobileAuth`, la garde route les rattrape déjà. Mais on ajoute une garde en plus pour les liens directs / cas où l'écran serait atteint via deep link.

## 4. `/app/chat` comme page d'accueil de bot.bj

Deux cas selon le bundle servi sur `bot.bj` :

### Bundle mobile (`AppMobile.tsx`)
- Catch-all `*` redirige déjà vers `/app/chat` ✓ — vérifier que `/` aussi (ajouter `<Route path="/" element={<Navigate to="/app/chat" replace />} />`).

### Bundle web (`App.tsx`)
- Modifier la route `/` pour rediriger vers `/app/chat` (ou monter le même `WaouhChatScreen` public selon ce qui est exposé sur bot.bj).
- À confirmer avec l'utilisateur: bot.bj sert-il le bundle mobile ou web ? (à vérifier dans la config nginx/build CI, mais on rendra les deux cohérents.)

## 5. Détails techniques

- `useMobileAuth` ne change pas — on l'utilise pour exposer `user`.
- Pas de modification du schéma DB sauf si l'audit RLS révèle une fuite (probable sur `whatsapp_accounts` à cause de `is_admin_shared`).
- Aucune dépendance nouvelle.

## Fichiers touchés (estimation)

- `src/AppMobile.tsx` (routes)
- `src/App.tsx` (route /)
- `src/app-mobile/screens/WhatsAppScreen.tsx` (filtre + libellés)
- `src/app-mobile/layouts/BottomTabBar.tsx` (libellé)
- `src/app-mobile/screens/NotificationsScreen.tsx` (libellé)
- `src/app-mobile/screens/ChatListScreen.tsx` (mode invité)
- `src/app-mobile/screens/WaouhChatScreen.tsx` + composant `WaouhWebChat` (paywall 10 msg)
- Nouveau `src/app-mobile/hooks/useRequireAuthAction.ts`
- Boutons "+" dans `KnowledgeBasesListScreen`, `WhatsAppScreen`, `DiffusionScreen`, `PartnerBusinessesScreen`
- Migration Supabase si fuite RLS confirmée sur `whatsapp_accounts`
