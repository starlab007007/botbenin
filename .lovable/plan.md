# Objectif

Sur desktop et tablette, transformer le panneau de droite de `WaouhChatPage` en véritable surface multi-onglets dynamique : tout clic dans la sidebar (notification, conversation match, nouvelle discussion, nouvelle offre) ouvre la conversation correspondante dans la fenêtre principale, comme WhatsApp Web. Aucune ouverture en popup/dialog parallèle.

# Comportement attendu

1. **Clic sur une conversation match** dans la sidebar (`WaouhMatchChatList`)
   → la conversation s'ouvre dans le panneau de droite, dans un onglet dédié au-dessus du chat (réutilise `WaouhChatTabs` + `WaouhMatchChatWindow`). Si elle est déjà ouverte, on bascule simplement l'onglet actif.

2. **Clic sur une notification** dans l'onglet "Notifications" de la sidebar
   - Notification de type match/intérêt/radar → ouvre le chat match correspondant dans le panneau principal (même mécanique que ci-dessus, en réutilisant l'event `waouh:open-match-chat` déjà émis par `WaouhNotificationsBell`).
   - Notification de type deal / paiement → ouvre le chat lié (ou la bulle de paiement) dans le panneau, sans quitter la page.
   - La notification est marquée comme lue automatiquement.

3. **Clic sur "Nouveau"** dans le header de la sidebar
   → bascule sur l'onglet "WAOUH" (chat principal) et appelle `startNewThread()` pour démarrer une nouvelle discussion vierge dans le panneau principal.

4. **Onglets dans le panneau principal** : barre `WaouhChatTabs` toujours visible quand au moins un match est ouvert. Onglet "WAOUH" (chat principal IA) + un onglet par conversation match, avec bouton de fermeture (X). Les panneaux inactifs restent montés (cachés) pour préserver leur état — comme déjà fait sur mobile.

5. **Mode "Liste uniquement"** : si l'utilisateur clique sur un élément de la sidebar pendant qu'il est en mode liste, on bascule automatiquement en mode "split" (`layoutMode = "split"`) afin que la conversation soit visible immédiatement.

6. **Comportement mobile inchangé** : la version `<WaouhChatScreen>` mobile garde son flux actuel.

# Changements techniques

## `src/pages/waouh/WaouhChatPage.tsx`
- Importer et utiliser le hook `useWaouhMatchChats` (déjà branché sur `waouh:open-match-chat`) pour récupérer `{ matches, activeKey, setActiveKey, close, getCached, setCached, getHasMore, setHasMoreCached, waouhIds }`.
- Remplacer le `<main>` actuel par la même structure que `WaouhChatScreen` :
  - `<WaouhChatTabs ... />`
  - Conteneur `relative` qui empile :
    - panneau "main" → `<WaouhWebChat ref={chatRef} fullscreen />`
    - un `<WaouhMatchChatWindow>` par match, masqué via `hidden` quand inactif.
- Quand un événement `waouh:open-match-chat` arrive et que `layoutMode === "list"`, appeler `updateLayout("split")` automatiquement.
- `handleNewConversation` : appeler `setActiveKey("main")` puis `chatRef.current?.startNewThread()`.

## `src/components/waouh/WaouhChatSidebar.tsx`
- Recevoir et passer un vrai `onOpenNotification` au parent (déjà câblé en signature). Au clic notification :
  - Si la notif a un `article_id` / `payload.deal_id` → émettre `waouh:open-match-chat` (ou `waouh:focus-message` pour les notifications de message/transaction) en réutilisant exactement la logique présente dans `WaouhNotificationsBell.handleClick`. Factoriser cette logique dans un petit util `openNotificationTarget(n)` partagé (`src/components/waouh/notificationActions.ts`) pour éviter la duplication.
  - Marquer la notif comme lue (`onMarkRead`).
- Au clic conversation : `WaouhMatchChatList` émet déjà l'event, rien à changer.

## `src/components/waouh/notificationActions.ts` (nouveau)
- Exporter `openNotificationTarget(n, { onPayDialog? })` qui encapsule la logique de dispatch (`waouh:open-match-chat`, `waouh:focus-message`, ouverture du dialog paiement). Utilisé par `WaouhNotificationsBell` ET la sidebar.

## (Mineur) `src/pages/waouh/WaouhChatPage.tsx` — toggle layout
- Quand l'utilisateur passe en `list`, vider l'`activeKey` sur "main" n'est pas nécessaire ; on garde simplement les onglets cachés (puisque le panneau de droite n'est pas rendu).

# Non-objectifs

- Pas de changement de schéma BDD.
- Pas de changement du flux mobile (`WaouhChatScreen`).
- Pas de modification du contrat verrouillé `waouhChatSyncLock` — on réutilise `WaouhMatchChatWindow` tel quel, comme déjà fait sur mobile (donc le test d'invariant continue de passer).

# Validation

- Sur desktop ≥1024px : ouvrir une notification match → onglet apparaît dans le panneau de droite, conversation chargée, sidebar reste visible.
- Cliquer sur "Nouveau" → onglet "WAOUH" actif, thread vierge.
- Cliquer sur une 2e conversation → 2e onglet, bascule fluide entre les deux.
- Fermer un onglet (X) → revient sur "main".
- Mode "Liste uniquement" puis clic sur une notif → bascule automatique en "2 colonnes" avec la conversation ouverte.
