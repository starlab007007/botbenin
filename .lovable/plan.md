# Plan — Bouton "Nouveau chat WAOUH" (discussion vierge)

## Objectif

Quand l'utilisateur clique sur **+ Nouveau chat WAOUH** (header `ChatListScreen` et CTA invité), ouvrir le chat principal WAOUH **vide**, prêt à démarrer une nouvelle vente/achat, **sans afficher** l'historique des messages précédents. L'historique reste préservé (base + snapshot local) et reste accessible via les conversations produit listées en dessous.

## Principe (aucun changement de schéma)

Introduire un **curseur de thread** côté client : un timestamp `waouh_main_thread_started_at` stocké en `localStorage`. Le chat principal n'affiche que les messages dont `created_at >= thread_started_at`. Les anciens messages restent en base et restent visibles dans les fenêtres produit (`WaouhMatchChatWindow`) et les conversations existantes — on ne supprime rien.

Le `web_session_id` (identité `waouh_users`) ne change pas → les vendeurs, notifications, négociations en cours continuent de fonctionner normalement.

## Changements

### 1. `src/components/waouh/WaouhWebChat.tsx`
- Lire `waouh_main_thread_started_at` depuis `localStorage` (fallback : `0` = tout afficher pour les utilisateurs existants).
- Filtrer le snapshot local au chargement initial : `readMainSnapshot().filter(m => m.created_at >= cutoff)`.
- Passer `since: cutoff` à `supabase.functions.invoke("waouh-history", …)` et au fallback direct (`.gte("created_at", cutoff)`).
- Filtrer la souscription realtime entrante : ignorer les messages `< cutoff` (sécurité si un autre onglet rejoue).
- Exposer via `WaouhWebChatHandle` une méthode `startNewThread()` qui :
  1. écrit `Date.now().toISOString()` dans `waouh_main_thread_started_at`,
  2. vide `messages` en state,
  3. réécrit un snapshot vide,
  4. focus le textarea.

### 2. `src/app-mobile/screens/WaouhChatScreen.tsx`
- Quand la route est ouverte avec `?new=1` (ou un state `{ newThread: true }`), appeler `chatRef.current?.startNewThread()` au mount.
- Ajouter un bouton **"Nouvelle discussion"** dans le header (icône `Plus` ou menu kebab) qui rappelle la même méthode — pratique pour démarrer un autre échange depuis l'écran WAOUH lui-même.

### 3. `src/app-mobile/screens/ChatListScreen.tsx`
- `openWaouh` → `navigate("/app/chat/waouh")` reste le comportement par défaut (reprend là où on en était).
- Les boutons **+ Nouveau chat WAOUH** (header `+`, CTA invité, CTA liste vide) → `navigate("/app/chat/waouh?new=1")`.
- La carte "WAOUH" épinglée en haut continue d'ouvrir le chat sans `?new=1` (continuité).

### 4. `src/pages/waouh/WaouhChatPage.tsx` (web/desktop)
- Lire `?new=1` au montage et appeler `startNewThread()` via un ref sur `WaouhWebChat`.

## Comportements préservés

- ✅ Le bouton **"intéressé N"** continue de créer une négociation et notifier le vendeur (logique `waouh-webhook` inchangée).
- ✅ La fenêtre `WaouhMatchChatWindow` continue de s'ouvrir côté vendeur et acheteur dès qu'un intérêt est confirmé.
- ✅ Les conversations produit listées sous l'avatar WAOUH (capture 1) restent accessibles et complètes.
- ✅ Les notifications, négociations, paiements en cours ne sont pas perturbés (identité `waouh_users` stable).

## Validation

1. Envoyer plusieurs messages dans WAOUH → ils s'affichent normalement.
2. Cliquer **+ Nouveau chat WAOUH** → écran vide, focus sur l'input, rien d'autre.
3. Envoyer "Je vends mon iPhone…" → la conversation démarre proprement, l'IA répond.
4. Recharger la page → seul le nouveau thread est visible.
5. Ouvrir une conversation produit existante → l'historique est intact.
6. Tester sur mobile (`/app/chat`) et desktop (`/waouh`).

## Hors scope (à confirmer si tu veux les ajouter ensuite)

- Liste/sélecteur de threads WAOUH passés (aujourd'hui : un seul thread courant, les précédents restent accessibles via les conversations produit).
- Persistance des threads en DB (table `waouh_threads`) — non nécessaire pour ce besoin, mais possible plus tard si tu veux pouvoir nommer/retrouver chaque session.
