## Objectif

Garantir que la vue WhatsApp 2 colonnes s'affiche réellement sur PC et tablette, ajouter un toggle de bascule, et fiabiliser la redirection `/app/chat` → `/app/chat/waouh`.

## Diagnostic

- `useIsMobile()` (`src/hooks/use-mobile.tsx`) renvoie `undefined` au premier rendu, puis `false` après l'effet. La redirection dans `ChatListScreen` se fait dans un `useEffect` après ce délai → l'utilisateur voit brièvement (ou durablement, si l'effet ne se déclenche pas avant un autre render) la liste mobile en plein écran.
- `WaouhChatPage` cache la sidebar via `hidden md:flex` : sur une tablette portrait < 768px ou un viewport mal détecté, la sidebar disparaît sans aucun moyen de la rappeler.
- Aucun contrôle utilisateur pour forcer un mode d'affichage : impossible de valider visuellement la 2-col sur un écran donné si la détection rate.

## Changements

### 1. Redirection fiable `/app/chat` → `/app/chat/waouh` (desktop)
`src/app-mobile/screens/ChatListScreen.tsx`
- Calculer `isDesktop` de manière **synchrone** au premier rendu :
  ```ts
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;
  ```
- Si `isDesktop` → retourner immédiatement `<Navigate to="/app/chat/waouh" replace />` (avant tout autre hook lourd) pour éliminer le flash mobile et les races du `useEffect`.
- Conserver l'écoute `resize` pour rediriger si l'utilisateur agrandit la fenêtre après coup.

### 2. Toggle "Liste seule" / "2 colonnes"
`src/pages/waouh/WaouhChatPage.tsx`
- Nouveau state `layoutMode: "split" | "list"` persisté dans `localStorage` (`waouh_chat_layout_mode`, défaut `"split"`).
- Ajouter dans la barre d'en-tête (à côté de "Aide") un groupe de 2 boutons icône (`PanelsTopLeft` / `Rows3`) avec tooltip "2 colonnes" / "Liste uniquement", visible uniquement sur desktop/tablet.
- `mode === "split"` : sidebar + chat (comportement actuel).
- `mode === "list"` : sidebar plein écran (le `<main>` du chat disparaît, la sidebar prend `flex-1`).

### 3. Forcer la 2-col sur desktop (indépendamment des media queries Tailwind)
`src/pages/waouh/WaouhChatPage.tsx`
- Remplacer `hidden md:flex w-[340px] lg:w-[360px]` par une largeur calculée en JS via `window.innerWidth`/`matchMedia` (avec listener) :
  - `≥ 1280px` → `360px`
  - `768–1279px` → `320px`
  - `< 768px` → branche mobile actuelle (pas de sidebar dédiée, redirection préalable côté `/app/chat`).
- Utiliser `style={{ width }}` au lieu des classes responsives pour éviter qu'une feuille parente n'écrase `md:flex`.
- Garantir `min-h-0` et `overflow-hidden` sur les conteneurs flex pour que `ScrollArea` de la sidebar et le chat occupent bien la hauteur disponible.

### 4. Audit CSS responsive sidebar/historique
`src/components/waouh/WaouhChatSidebar.tsx`
- Ajouter `min-w-0` sur les conteneurs internes, `truncate` sur les titres de notification, `break-words` sur les corps de message.
- `TabsContent` : confirmer `flex-1 min-h-0` et corriger `ScrollArea h-[calc(100%-2rem)]` (fragile) → wrapper avec `flex flex-col` + `ScrollArea className="flex-1 min-h-0"`.
- Sidebar header reste sticky (`shrink-0`) — search bar et tabs aussi.
- Padding adapté tablette : `px-3` reste, badges et compteurs avec `shrink-0`.

### 5. Hook `useIsMobile` plus sûr (utilisé partout)
`src/hooks/use-mobile.tsx`
- Initialiser le state directement avec `window.innerWidth < 768` (au lieu de `undefined`) pour supprimer le faux "mobile" au premier rendu desktop.

## Détails techniques

- Pas de modification de routes (`/app/chat/waouh` existe déjà ligne 304 de `src/App.tsx`).
- Pas de changement aux edge functions, hooks de sync, `waouhChatSyncLock`, ni `WaouhMatchChatWindow`.
- Le toggle n'affecte que la présentation desktop/tablet ; mobile reste full-screen chat.
- Tokens design conservés (`bg-card`, `border-border`, etc.).

## Vérifications après build

1. Desktop 1440px sur `/app/chat` : redirection immédiate, aucun flash mobile, sidebar 360px + chat plein écran.
2. Tablette 1024px et 768px : sidebar 320px visible, lisible, toggle accessible.
3. Bascule "Liste seule" → sidebar plein écran ; retour "2 colonnes" → layout restauré (persisté après reload).
4. Notifications longues : pas de débordement horizontal, scroll vertical fluide dans la liste et l'onglet Notifications.
