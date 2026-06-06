# Objectif

Sur desktop/tablette (≥ 768 px), `/app/chat` doit afficher **exactement la même page que la capture jointe** (`ChatListScreen` : en-tête vert, recherche, onglets Discussions/Statuts·24h, WAOUH épinglé, conversations produit, liste, archives) **mais présentée en 2 colonnes style WhatsApp Web** :

```text
┌──────────────────────────┬───────────────────────────────────────────┐
│  Colonne gauche (~380px) │  Colonne droite (flex-1)                  │
│  = ChatListScreen actuel │  = Panneau de chat actif                  │
│  (header vert, search,   │  (WAOUH par défaut, ou conv sélectionnée, │
│   tabs, listes, statuts) │   ou match produit, ou statut)            │
└──────────────────────────┴───────────────────────────────────────────┘
+ BottomTabBar /app en bas (inchangé)
```

Mobile (< 768 px) : aucun changement, `ChatListScreen` reste plein écran avec navigation vers `/app/chat/:id` ou `/app/chat/waouh`.

**Pas de changement de fond** : aucune modification de la BDD, des hooks (`useWaouhIdentity`, `useUnreadCounts`, `useNotifications`), des composants de chat (`WaouhWebChat`, `WaouhMatchChatWindow`, `ChatScreen`), du `StatusesPanel`, ni des routes existantes.

# Diagnostic

Actuellement (`src/app-mobile/screens/ChatListScreen.tsx` lignes 57-61) :

```tsx
if (typeof window !== "undefined" && window.innerWidth >= 768) {
  return <WaouhChatPage embedded />;
}
```

→ Sur desktop, `/app/chat` rend `WaouhChatPage` (sidebar WAOUH des conversations produit + chat 2 colonnes) **au lieu** de la page de la capture (ChatListScreen avec onglets Discussions/Statuts, WAOUH épinglé, archives, etc.).

L'utilisateur veut l'inverse : garder la page de la capture comme **colonne gauche** et ouvrir un **panneau de droite** pour le chat actif.

# Cible

## 1. `src/app-mobile/screens/ChatListScreen.tsx`

- **Supprimer** le early-return desktop vers `WaouhChatPage embedded` (lignes 57-61).
- Garder le composant **tel quel** mais l'envelopper conditionnellement quand desktop :
  - Ajouter un état local `activePane: { kind: "waouh" } | { kind: "conv"; id: string } | { kind: "match"; key: string } | null` (défaut `{ kind: "waouh" }` sur desktop).
  - Détecter desktop via `useIsMobile()` (déjà importé) + un effet de resize listener (pour basculer en SSR-safe).
  - Sur desktop, rendre :
    ```tsx
    <div className="flex h-[calc(100dvh-64px)]">
      <aside className="w-[380px] shrink-0 border-r border-border overflow-y-auto">
        {/* JSX existant inchangé : header vert, search, tabs, listes, archives */}
      </aside>
      <section className="flex-1 min-w-0 overflow-hidden bg-muted/30">
        <ChatRightPane active={activePane} sessionId={sessionId} authUserId={user?.id ?? null} />
      </section>
    </div>
    ```
  - Sur mobile : retour `<div className="min-h-[100dvh] waouh-chat-list-bg">…</div>` actuel, inchangé.
- **Intercepter les clics sur desktop** :
  - `openWaouh` → `setActivePane({ kind: "waouh" })` au lieu de `navigate("/app/chat/waouh")`.
  - `openNewWaouh` → `setActivePane({ kind: "waouh" })` + ref pour `startNewThread`.
  - Click sur une conv de `filtered.map` → `setActivePane({ kind: "conv", id: c.id })` au lieu de `navigate(\`/app/chat/${c.id}\`)`.
  - Click sur un match dans `WaouhMatchChatList` → écouter l'event existant `waouh:open-match-chat` (déjà émis par la liste) et `setActivePane({ kind: "match", key })`.
  - Sur mobile, les `navigate(...)` actuels restent.
- Mettre en évidence la conv active dans la liste gauche (bg accent).

## 2. Nouveau composant `src/app-mobile/components/ChatRightPane.tsx`

Petit routeur de panneau qui réutilise les composants existants **sans les modifier** :

```tsx
type ActivePane =
  | { kind: "waouh" }
  | { kind: "conv"; id: string }
  | { kind: "match"; key: string }
  | null;

export function ChatRightPane({ active, sessionId, authUserId }: Props) {
  if (!active) return <EmptyState />; // illustration + "Sélectionnez une discussion"
  if (active.kind === "waouh") {
    return <WaouhWebChat fullscreen variant="native" />;
  }
  if (active.kind === "conv") {
    // Réutiliser ChatScreen en injectant convId via MemoryRouter ou via une prop optionnelle
    return <ConversationPane convId={active.id} />;
  }
  if (active.kind === "match") {
    // Récupérer le match via useWaouhMatchChats, puis <WaouhMatchChatWindow match={...} />
    return <MatchPane matchKey={active.key} sessionId={sessionId} authUserId={authUserId} />;
  }
}
```

- `ConversationPane` : extrait léger qui rend les messages d'une conversation. Soit on factorise le corps de `ChatScreen.tsx` en `<ChatScreenBody convId={...} hideBackButton />`, soit on rend `<MemoryRouter initialEntries={[\`/app/chat/${id}\`]}><Routes><Route path="/app/chat/:id" element={<ChatScreen embedded />}/></Routes></MemoryRouter>`. Préférence : ajouter une prop `embedded?: boolean` + `convId?: string` à `ChatScreen` (override `useParams`) et masquer le bouton retour quand `embedded`. Aucune autre modif de logique.
- `MatchPane` : utiliser le hook existant `useWaouhMatchChats` pour retrouver le match par `key`, puis rendre `<WaouhMatchChatWindow match={m} sessionId={sessionId} authUserId={authUserId} waouhIds={waouhIds} active={true} getCached={...} setCached={...} getHasMore={...} setHasMoreCached={...} />`.
- `EmptyState` : visuel léger style WhatsApp Web ("Sélectionnez une discussion pour commencer à discuter") + logo WAOUH.

## 3. `src/app-mobile/screens/ChatScreen.tsx`

- Ajouter deux props optionnelles :
  - `embedded?: boolean` (défaut `false`) → masque le bouton "ArrowLeft" et la nav `navigate("/app/chat")`.
  - `convIdOverride?: string` → si fourni, utilisé à la place de `useParams().id`.
- Aucun autre changement (réutilise `ChatBubble`, `ChatImage`, etc.).

## 4. `src/App.tsx`

- `/app/chat/:id` et `/app/chat/waouh` continuent d'exister pour mobile et liens directs. Aucun changement.
- `/waouh-chat` déjà alias vers `/app/chat` (inchangé).

## 5. `src/pages/waouh/WaouhChatPage.tsx`

- **Inchangé**. La page standalone à `/waouh-chat` (redirigée vers `/app/chat`) reste exploitable, mais n'est plus rendue à l'intérieur de `/app/chat` desktop.

# Comportement attendu

- **Desktop ≥ 768 px + `/app/chat`** : 2 colonnes. Gauche = page de la capture (header vert "zimesongbian / Mon compte", recherche, onglets Discussions / Statuts·24h, carte WAOUH épinglée "Achetez · Vendez · Négociez par message", `CONVERSATIONS PRODUIT`, items "Annonce / test24", "Voir archivés"). Droite = panneau WAOUH par défaut ; cliquer une conv → panneau de cette conv ; cliquer un match → panneau du match ; cliquer "+ Nouveau chat WAOUH" → nouvelle session WAOUH dans le panneau. `BottomTabBar` toujours visible en bas.
- **Desktop + onglet "Statuts · 24h"** : la colonne gauche affiche `StatusesPanel variant="mobile"` (inchangé), la colonne droite garde le panneau actif (ou empty state).
- **Mobile < 768 px + `/app/chat`** : rendu actuel **inchangé** (plein écran, navigation vers `/app/chat/:id` et `/app/chat/waouh`).
- **Liens directs** `/app/chat/:id` et `/app/chat/waouh` : continuent de marcher sur mobile comme sur desktop (sur desktop ils restent gérés par leurs écrans respectifs, qui redirigent déjà vers `/app/chat` sur desktop — donc l'utilisateur retombe sur le split avec le bon panneau si on enrichit la redirection avec un state `{ activePane }`. Optionnel, peut être ajouté ensuite.)

# Non-objectifs

- Pas de modif des hooks de données, BDD, edge functions, ni du `waouhChatSyncLock`.
- Pas de redesign du header, des items de liste, ni des onglets : on **garde la même UI** que la capture pour la colonne gauche.
- Pas de remplacement de `BottomTabBar` par une nav desktop (autre itération).

# Validation

1. Desktop ≥ 768 px → ouvrir `/app/chat` : voir la page de la capture à gauche (380px), panneau WAOUH à droite, `BottomTabBar` en bas.
2. Cliquer sur "test24" dans la liste gauche → la colonne droite affiche la conversation, la gauche surligne l'item, l'URL **ne change pas** (reste `/app/chat`).
3. Cliquer "Nouveau chat WAOUH" → panneau droit = WAOUH avec thread vierge.
4. Basculer onglet "Statuts · 24h" → liste gauche bascule sur `StatusesPanel`, le panneau droit conserve son contenu.
5. Mobile < 768 px → rien ne change : `/app/chat` rend plein écran, clic sur une conv navigue bien vers `/app/chat/:id`.
6. `BottomTabBar` reste fonctionnelle (clic "Bots" → `/app/bots`).
