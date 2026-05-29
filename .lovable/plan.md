## Objectif

Quand l'utilisateur ouvre un chat produit (WAOUH·ACH-… / WAOUH·VEN-…), il doit obtenir une **fenêtre plein écran identique à WAOUH principal** (même header, même composer, même fluidité), et pouvoir **basculer rapidement entre WAOUH principal et chaque chat produit** via une barre d'onglets.

## Problème actuel

`WaouhMatchChatWindow` s'affiche en carte empilée sous le composer principal (max-h 40vh, textarea 1 ligne, pas plein écran). Mauvaise ergonomie sur mobile.

## Solution

### 1. Transformer le chat produit en vue plein écran
Refonte de `WaouhMatchChatWindow` (ou nouveau `WaouhMatchChatFullscreen`) pour qu'il occupe `h-[100dvh]` avec :
- Header sticky identique à WAOUH (avatar produit, code WAOUH·ACH/VEN, prix·ville, bouton retour, bouton fermer)
- Zone messages `flex-1 overflow-y-auto` avec même style de bulles que WAOUH
- Composer bas identique à WAOUH (textarea auto-grow multi-lignes, bouton pièce jointe, bouton envoyer rond)
- Safe-area iOS (`pb-[env(safe-area-inset-bottom)]`)

### 2. Barre d'onglets de navigation entre conversations
Nouveau composant `WaouhChatTabs` affiché en haut (sous le header) qui liste :
- Onglet **WAOUH** (principal) — toujours premier
- Un onglet par chat produit ouvert (label court `ACH-B033` / `VEN-8AC` + pastille non-lus)
- Onglet actif surligné, scroll horizontal si > 3 onglets
- Tap = bascule instantanée sans démontage des autres (état conservé)

### 3. Orchestrateur dans l'écran WAOUH
`WaouhChatScreen` devient un conteneur qui :
- Maintient `activeTab: "main" | matchKey`
- Rend `WaouhChatTabs` en haut
- Affiche soit le chat WAOUH principal soit la fenêtre produit active (les autres restent montées en `hidden` pour préserver scroll/saisie)
- `WaouhMatchChats` (carte empilée actuelle) est **supprimé** de l'inbox / remplacé par cette logique d'onglets

### 4. Ouverture depuis l'inbox
`WaouhMatchChatList` (liste sous WAOUH dans `ChatListScreen`) navigue vers `/app/chat?match=<key>` qui ouvre directement l'onglet correspondant dans `WaouhChatScreen`.

## Fichiers touchés

- `src/components/waouh/WaouhMatchChatWindow.tsx` — refonte plein écran
- `src/components/waouh/WaouhChatTabs.tsx` — **NOUVEAU** barre d'onglets
- `src/app-mobile/screens/WaouhChatScreen.tsx` — orchestration tabs + état partagé
- `src/components/waouh/WaouhMatchChats.tsx` — simplifié (registre des matches ouverts uniquement, sans rendu carte)
- `src/components/waouh/WaouhMatchChatList.tsx` — navigation vers `/app/chat?match=…`

## Notes techniques

- Garder les hooks existants (`useWaouhInbox`, realtime sur `waouh_messages`) — aucun changement backend
- Persister la liste des onglets ouverts dans `localStorage` (déjà fait pour `waouh_open_matches_<sid>`)
- Préserver le focus textarea au switch d'onglet (cf. chat-agent-ui-contract)
- Aucun changement d'edge function ni de schéma DB
