
## Objectif
Vérifier que l'envoi/réception de messages et l'affichage des conversations fonctionnent partout (WAOUH web, chat mobile natif, fenêtres match acheteur/vendeur), puis corriger les bugs détectés — sans toucher au flux verrouillé WAOUH sync v12.

## Constats de l'audit

### 1. Warning React bloquant (console)
`WaouhCityBadge` place `<Badge>` comme enfant de `<PopoverTrigger asChild>`. Radix Slot exige un `forwardRef`, or `src/components/ui/badge.tsx` est une simple fonction sans ref.
Résultat : warning répété "Function components cannot be given refs" à chaque ouverture du chat + risques de dysfonctionnement du Popover (position/focus).

### 2. "Failed to send a request to the Edge Function" (session replay)
Erreur observée à l'entrée de `/app/chat`. Vue :
- `WaouhWebChat` → `waouh-history` : possède déjà un fallback direct query ✅
- `ChatScreen` mobile → `waouh-operator-send` : pas de toast utilisateur, juste `console.error`, l'utilisateur voit uniquement la bulle disparaître
- `useWaouhInbox` → `waouh-history` : échec silencieux (inbox vide sans message)

Les fonctions existent et ont `verify_jwt=false`. Cause probable : cold-start / réseau intermittent. Correctif : ajout d'un retry léger (1 essai) + toast d'erreur clair + garder l'état optimiste sur `ChatScreen` avec bouton "Réessayer".

### 3. `useWaouhInbox` — realtime trop large
Le canal souscrit à **tous** les INSERT/UPDATE de `waouh_conversations` et `waouh_notifications` (aucun `filter`), et déclenche un `refresh()` complet à chaque événement global. Sur un compte actif, cela sature la fonction `waouh-history` et fait clignoter la liste.
Correctif : filtrer par `user_id=eq.<authUserId>` (ou `web_session_id`) et débouncer les refresh (250 ms).

### 4. `ChatScreen` mobile — dépendances realtime incomplètes
Le `useEffect` réabonne uniquement sur `[id, user]`. Si l'onglet perd/regagne le focus, aucun ping ; ok. Mais `markConversationRead` (import `b`) est appelé à chaque INSERT, y compris pour les messages sortants → compteur non lu remis à 0 alors qu'on attend un ACK. Ajouter une condition `direction === "in"`.

### 5. Petit nettoyage
- Dans `WaouhWebChat` la logique `fetchPage` retourne `messages: []` sur erreur direct query mais le fallback tente ensuite `fetchPageDirect` — OK. Ajouter un log de niveau warn plutôt que debug pour tracer les échecs `waouh-history` répétés.
- Vérifier que `useGlobalChatSync` (App mobile) ne double pas la souscription realtime déjà faite par `useWaouhInbox`.

## Correctifs

### `src/components/ui/badge.tsx`
Transformer `Badge` en `React.forwardRef<HTMLDivElement, BadgeProps>` et forwarder la ref sur le `<div>`. Aucun changement d'API.

### `src/app-mobile/screens/ChatScreen.tsx`
- Envelopper l'échec `waouh-operator-send` avec `toast({ variant: "destructive", title: "Envoi échoué", description: "..." })`.
- Garder le message optimiste en état "erreur" + bouton "Réessayer" au lieu de le supprimer.
- Filtrer le `markConversationRead` sur `payload.new.direction === "in"`.

### `src/hooks/useWaouhInbox.ts`
- Ajouter `filter: authUserId ? \`user_id=eq.${authUserId}\` : \`web_session_id=eq.${sessionId}\`` sur les deux `.on(...)`.
- Débouncer `refresh` (setTimeout 250 ms + clear).
- En cas d'échec `functions.invoke`, retomber sur une requête directe `waouh_conversations` scopée à l'identité (comme `WaouhWebChat` le fait pour les messages).

### `src/components/waouh/WaouhWebChat.tsx`
- Passer le catch de `waouh-history` en `console.warn` (ligne 199) pour visibilité.
- Aucun changement de logique.

## Hors périmètre (verrouillé)
- `WaouhMatchChatWindow`, `useWaouhMatchChats`, `waouh-notify-dispatch`, `waouh-match-history` — flux sync v12 verrouillé, on n'y touche pas.
- Les fonctions edge ne sont ni modifiées ni redéployées.

## Vérification
1. Ouvrir `/app/chat` → plus de warning console Badge/SlotClone.
2. Cliquer sur le badge ville → popover s'ouvre normalement.
3. Envoyer un message dans une conversation mobile en coupant le réseau → toast d'erreur + bouton Réessayer ; message restauré au clic.
4. Recevoir un message externe → inbox refresh une seule fois (pas de flood), compteur non-lu incrémenté correctement.
5. Onglet WAOUH web : historique se charge, fallback direct query si `waouh-history` KO.
