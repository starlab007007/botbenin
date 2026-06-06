# Objectif

Sur **desktop/tablette (≥ 768 px)**, la route `/app/chat` doit afficher l'interface WAOUH 2 colonnes (sidebar + chat + onglets) — actuellement à `/waouh-chat` — **tout en conservant la `BottomTabBar` `/app`** en bas (Chat / Bots / WhatsApp IA / Diffusion / Partenaire) pour garder accès à toutes les fonctionnalités du shell.

Sur mobile (< 768 px), aucun changement : `/app/chat` continue d'afficher `ChatListScreen`.

# Diagnostic

Routage actuel (`src/App.tsx`) :

```text
/app/chat        → ChatListScreen   (mobile)  | desktop → redirige vers /waouh-chat
/app/chat/waouh  → WaouhChatScreen  (mobile)  | desktop → redirige vers /waouh-chat
/waouh-chat      → WaouhChatPage    (2 colonnes, HORS /app — pas de BottomTabBar)
```

Conséquence : sur desktop, dès qu'on entre dans Chat, on quitte `/app` et on perd la navigation vers Bots, WhatsApp IA, etc. `MobileShell` affiche déjà la `BottomTabBar` pour les chemins non-fullscreen comme `/app/chat`, donc si on rend `WaouhChatPage` à l'intérieur, la barre du bas reste automatiquement visible.

# Cible

```text
/app/chat
  ├─ < 768 px : ChatListScreen (inchangé)
  └─ ≥ 768 px : WaouhChatPage embedded (sidebar + chat + onglets)
                 + BottomTabBar /app visible en bas

/app/chat/waouh
  ├─ < 768 px : WaouhChatScreen (inchangé, header WAOUH plein écran)
  └─ ≥ 768 px : redirige vers /app/chat (un seul point d'entrée desktop)

/waouh-chat   → redirige vers /app/chat (rétro-compatibilité)
```

# Changements techniques

## 1. `src/pages/waouh/WaouhChatPage.tsx`
- Ajouter une prop `embedded?: boolean` (défaut `false`).
- Quand `embedded === true` :
  - Conteneur racine : `h-full` (au lieu de `h-[100dvh]`) pour vivre dans le `<main className="flex-1 pb-[64px]">` du `MobileShell` et laisser place à la `BottomTabBar`.
  - Masquer le bouton "Fermer → /" du header (la `BottomTabBar` gère la navigation).
  - Tout le reste identique : sidebar, `WaouhChatTabs`, `WaouhWebChat` (main), `WaouhMatchChatWindow` par match, toggle "Liste / 2 colonnes", payment dialog, events `waouh:open-match-chat` / `waouh:focus-message`.
- Comportement existant à `/waouh-chat` (standalone, fullscreen) inchangé.

## 2. `src/app-mobile/screens/ChatListScreen.tsx`
- Remplacer la redirection desktop par un rendu direct :
  ```tsx
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    return <WaouhChatPage embedded />;
  }
  ```
- Supprimer le `useEffect` qui navigue vers `/waouh-chat` quand `!isMobile` (devenu inutile, le composant re-rendra `WaouhChatPage` automatiquement au resize).

## 3. `src/app-mobile/screens/WaouhChatScreen.tsx`
- Remplacer la redirection desktop par :
  ```tsx
  if (typeof window !== "undefined" && window.innerWidth >= 768) {
    return <Navigate to="/app/chat" replace />;
  }
  ```
  → sur desktop, `/app/chat/waouh` ramène vers `/app/chat` (qui rend `WaouhChatPage embedded`). Un seul point d'entrée desktop.
- Logique mobile (header WAOUH, payloads, tabs) inchangée.

## 4. `src/App.tsx` & `src/AppMobile.tsx`
- Route `/waouh-chat` devient un alias :
  ```tsx
  <Route path="/waouh-chat" element={<Navigate to="/app/chat" replace />} />
  ```
  (Dans `src/App.tsx` uniquement — `AppMobile.tsx` ne déclare pas cette route.)

## 5. Sanity check `MobileShell` (`src/app-mobile/layouts/MobileShell.tsx`)
- Règle actuelle : `fullscreen = /^\/app\/chat\/.+/.test(pathname) || /^\/app\/bots\/.+/.test(pathname)`. 
- `/app/chat` (exactement) n'est PAS fullscreen → `BottomTabBar` reste affichée. ✅ Aucun changement requis.

# Comportement attendu

- **Desktop/tablette + `/app/chat`** : sidebar WAOUH à gauche + chat 2 colonnes au centre/droite + `BottomTabBar` `/app` collée en bas. Cliquer "Bots" navigue vers `/app/bots` sans casser le contexte.
- **Desktop/tablette + `/app/chat/waouh` ou `/waouh-chat`** : redirige vers `/app/chat` (canonique).
- **Mobile + `/app/chat`** : `ChatListScreen` inchangé.
- **Mobile + `/app/chat/waouh`** : `WaouhChatScreen` inchangé.
- Toggle "Liste / 2 colonnes", onglets match, notifications dans la fenêtre principale : tout préservé (déjà câblé dans `WaouhChatPage`).
- Contrat verrouillé `waouhChatSyncLock` : non modifié (on réutilise `WaouhMatchChatWindow` tel quel).

# Non-objectifs

- Pas de transformation de la `BottomTabBar` en barre top/side pour desktop (peut venir en itération suivante).
- Pas de changement BDD, edge functions, ou flux mobile.

# Validation

1. Desktop ≥ 768 px → ouvrir `/app/chat` : sidebar + chat + `BottomTabBar` visibles.
2. Cliquer "Bots" dans la `BottomTabBar` → `/app/bots` sans erreur, contexte WAOUH conservé en localStorage.
3. Revenir sur "Chat" → onglets match toujours ouverts (state préservé par `useWaouhMatchChats`).
4. Ouvrir `/waouh-chat` ou `/app/chat/waouh` sur desktop → redirige sur `/app/chat`.
5. Mobile < 768 px → `/app/chat` rend bien `ChatListScreen`, `/app/chat/waouh` rend bien `WaouhChatScreen`.
