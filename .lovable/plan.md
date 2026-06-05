# Objectif

Ouvrir toutes les fenêtres de chat (WAOUH principal + fenêtres `WaouhMatchChatWindow`) en quasi-instantané (<100 ms perçues), sans changer le fonctionnement ni la persistance.

# Diagnostic actuel

À chaque ouverture, on attend des requêtes réseau **avant** d'afficher quoi que ce soit :

1. `WaouhMatchChatWindow` (lignes 139-211) : 1 requête `waouh_messages` + 1 requête `waouh_articles` + 1 requête `waouh_notifications` — bloquantes même quand un snapshot localStorage existe déjà.
2. `WaouhWebChat` (lignes 196-264) : ne montre rien tant que `waouh_users` puis `waouh-history` n'ont pas répondu, alors qu'il pourrait hydrater depuis un snapshot local.
3. Pas de pré-rendu : les onglets inactifs sont déjà montés (bien), mais le 1er affichage attend toujours le réseau.
4. `WaouhChatScreen` recharge le bundle complet (`WaouhMatchChatWindow`, `WaouhUnifiedInbox`, etc.) en un seul chunk — pas de pré-chargement quand on est sur `/app/chat`.

# Plan

## 1. Affichage cache-first (instantané)

**`WaouhMatchChatWindow.tsx`**
- Au mount, afficher immédiatement `getCached(match.key)` (déjà fait) **et** rendre la zone messages dès le 1er paint, sans attendre `fetchArticlePage`.
- Déplacer les 3 requêtes initiales dans un `setTimeout(..., 0)` / `requestIdleCallback` pour ne pas bloquer le 1er paint.
- Si le cache contient ≥ 1 message, ne pas afficher de skeleton ; juste rafraîchir en arrière-plan et merger.
- Mettre en cache `articleStatus` et `seedNotif` dans `localStorage` (clés `waouh_match_status_*` et `waouh_match_seed_*`) et hydrater synchronement au mount.

**`WaouhWebChat.tsx`**
- Ajouter un snapshot localStorage des derniers messages WAOUH principal (`waouh_main_msgs_<sid>`), hydraté synchronement dans le `useState` initial.
- Démarrer le rendu sans attendre `waouh_users` ni `waouh-history` ; lancer ces requêtes en arrière-plan et merger à l'arrivée.
- Persister chaque mise à jour de `messages` (throttlée) dans le snapshot.

## 2. Préchauffage des requêtes (warm-up)

**`useWaouhMatchChats.ts`**
- Quand un onglet match s'ouvre (`openMatchFromDetail`), déclencher en arrière-plan le `fetchArticlePage` et stocker le résultat dans le cache **avant** que l'utilisateur clique sur l'onglet → ouverture instantanée.
- Idem pour `waouh_articles.status`.

## 3. Code-splitting & préchargement de route

**`AppMobile.tsx` / routing**
- Vérifier que `WaouhChatScreen` est en `lazy()` (sinon le faire).
- Sur la route précédente `/app/chat`, ajouter un `<link rel="prefetch">` ou un import dynamique pré-chauffé (`import('./screens/WaouhChatScreen')`) au hover/mount du bouton "Nouveau chat WAOUH" pour que le chunk soit déjà en cache au clic.

## 4. Suppression des coûts de 1er paint

- `WaouhMatchChatWindow` : retirer le `setTimeout(focus, 50)` du chemin critique (déjà différé), mais s'assurer que l'`IntersectionObserver` n'est créé qu'après le 1er paint (`useEffect` est déjà OK — vérifier qu'il ne s'exécute pas avant `messages` du cache).
- Éviter le re-render initial inutile en supprimant la double mise à jour `setMessagesState` + `setCached` synchrone (déjà inline, OK).

## 5. Vérification

- Mesurer le temps "click → 1er message visible" via `performance.mark` en dev (logs `console.time("waouh-open")`).
- Tester : (a) ouvrir un chat déjà visité = instantané (0 spinner), (b) ouvrir un nouveau chat = squelette puis remplissage <300 ms, (c) WAOUH principal = même comportement.
- Confirmer que la persistance d'historique reste intacte (test : envoyer "oui", fermer, rouvrir).

# Détails techniques

- Tailles snapshot : conserver la limite actuelle (300 messages).
- `requestIdleCallback` avec fallback `setTimeout(0)` pour Safari iOS.
- Pas de changement de schéma DB, pas de changement aux edge functions.
- Pas de changement du protocole realtime — uniquement le chemin d'affichage initial.

# Fichiers modifiés

- `src/components/waouh/WaouhMatchChatWindow.tsx`
- `src/components/waouh/WaouhWebChat.tsx`
- `src/components/waouh/useWaouhMatchChats.ts` (warm-up)
- `src/AppMobile.tsx` ou fichier de routes (lazy/prefetch si manquant)
