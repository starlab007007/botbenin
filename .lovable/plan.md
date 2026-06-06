## Objectif

Sur **desktop et tablette** uniquement, refondre `WaouhChatPage` en un layout 2 colonnes style WhatsApp Desktop :
- **Colonne gauche (sidebar fixe ~320-360px)** : recherche + onglets *Discussions* / *Notifications* + liste scrollable.
- **Colonne droite (chat, prend tout le reste)** : fenêtre `WaouhWebChat` plein écran, header conversation en haut, messages bien lisibles et photos visibles.

Le layout **mobile actuel reste inchangé** (déjà full-screen). La logique métier du chat, des notifications et de la synchro acheteur/vendeur (WAOUH Chat Sync Flow verrouillé) n'est pas modifiée — uniquement la présentation.

## Changements

### 1. `src/pages/waouh/WaouhChatPage.tsx` — branche desktop/tablette réécrite
Remplacer le bloc "DESKTOP: existing rich layout" (lignes 152-260) par :
- Conteneur `h-[100dvh] flex` pleine hauteur, sans hero, sans quick-actions cards, sans aside d'exemples.
- Header global mince (48-56px) : logo WAOUH + badge "IA en ligne" + bouton Fermer / Se connecter.
- Sous le header : `flex flex-1 min-h-0` avec
  - `<WaouhChatSidebar />` (nouveau, ~340px, bord droit séparé)
  - `<WaouhWebChat fullscreen />` qui occupe `flex-1` avec fond chat (`waouh-chat-bg`) et messages bien centrés (max-width lisible ~720px sur très grand écran).
- Conserver l'effet `useEffect` pour `?new=1` qui appelle `chatRef.current?.startNewThread()`.

### 2. Nouveau composant `src/components/waouh/WaouhChatSidebar.tsx`
Sidebar gauche style WhatsApp :
- Header : titre **Discussions** + bouton "Nouvelle conversation" (déclenche `startNewThread` via prop callback) + cloche notifications (réutilise `WaouhNotificationsBell`).
- Champ de recherche (filtre local sur les threads par nom/dernier message).
- Onglets (Tabs shadcn) : **Discussions** | **Notifications** (badge compteur non-lus).
- Onglet *Discussions* : liste scrollable des threads WAOUH récupérée via `useWaouhMatchChats` (déjà existant). Chaque ligne : avatar/initiale, nom contrepartie, dernier message tronqué, heure, badge non-lus. Click → ouvre le thread dans la fenêtre chat centrale.
- Onglet *Notifications* : liste des `notifications` du hook `useWaouhMatchNotifications` (déjà branché dans la page). Click → `markRead` + navigation vers le thread/article.

### 3. Photos lisibles dans le chat
Dans `WaouhWebChat` (mode `fullscreen`) : vérifier/ajuster le rendu des bulles pour que les images aient `max-w-[420px] w-full rounded-lg` et `object-cover` avec ratio préservé, et que les messages texte soient en `text-[15px] leading-relaxed` dans une colonne `max-w-3xl mx-auto`. Aucune logique modifiée, uniquement classes Tailwind.

### 4. Préservation
- Mobile : aucune modification (branche `if (isMobile) return ...` conservée telle quelle).
- Aucun changement aux edge functions, hooks de synchro, `waouhChatSyncLock`, `WaouhMatchChatWindow`.
- Tokens du design system (HSL via `index.css`) — pas de couleurs hardcodées nouvelles.

## Détails techniques

- Tablette = même breakpoint que desktop (`!isMobile`), donc même layout 2-colonnes ; sidebar reste à 320px sur tablette portrait ≥ 768px.
- Sidebar collapsible optionnelle via un bouton chevron pour libérer de la place sur petite tablette ; état local `useState` (pas besoin de `SidebarProvider` shadcn ici, layout custom plus simple).
- Threads source : `useWaouhMatchChats(sessionId, userId)` retourne déjà la liste utilisée par `WaouhMatchChatList`. On la réutilise telle quelle.
- Sélection thread : on stocke `activeThreadId` dans la page et on passe `initialThreadId` à `WaouhWebChat` via la ref (méthode `openThread(id)` à exposer si pas déjà présente — sinon utiliser `startNewThread` + navigation existante).
