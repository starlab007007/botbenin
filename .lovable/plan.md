# Fenêtres de chat produit : notification d'amorce + fond WAOUH + scope strict

## Objectif

Quand l'utilisateur ouvre une conversation depuis `WaouhMatchChatList` (acheteur intéressé / annonce trouvée) :
1. La fenêtre s'ouvre avec la **notification d'origine en tout premier message** ("📩 Nouvel acheteur intéressé…" ou "🎯 Annonce trouvée pour vous…"), en bulle système.
2. La fenêtre utilise **exactement le même arrière-plan doodle vert** que la fenêtre WAOUH principale (`.waouh-chat-bg`).
3. Toute la discussion reste **strictement scopée à l'article** (`article_id`) jusqu'à la clôture/finalisation de la vente — pas de fuite vers le chat WAOUH général, pas de mélange avec un autre produit.

## Problèmes actuels

- `WaouhMatchChatWindow` ouvre une zone messages vide (juste un texte centré "Démarrez la discussion…"). La notification d'origine (acheteur intéressé / annonce trouvée) n'est jamais rappelée dans le fil → l'utilisateur perd le contexte.
- Le fond est `bg-muted/20` au lieu du fond doodle WAOUH (`.waouh-chat-bg`) → incohérence visuelle avec la fenêtre principale.
- Le scope produit est presque correct (filtre `article_id` côté DB) mais :
  - L'envoi inclut un préfixe `[Annonce …]` dans le texte qui pollue le message stocké côté DB.
  - Il n'y a aucun statut de **clôture** : tant que la vente n'est pas finalisée, la conversation doit rester active et isolée; une fois clôturée, il faut le matérialiser (badge + composer désactivé).
- Bug mineur : `useWaouhMatchChats` génère la clé `${role[0]}_${articleId}_${counterpart}` alors que `WaouhMatchChatList` archive par `${role[0]}_${articleId}` → l'auto-archive à la fermeture ne matche pas la ligne de l'inbox.

## Plan

### 1. `WaouhMatchChatWindow.tsx` — Notification d'amorce + fond WAOUH

- **Charger la notification d'origine** au mount : query `waouh_notifications` filtrée sur `article_id`, types `match|match_buyer|match_seller|new_buyer|radar_match`, ordre `sent_at ASC`, limit 1. Stocker dans un state `seedNotif`.
- **Injecter une bulle système** en tête du fil (avant les messages DB) :
  - Pour `kind === "seller"` (vendeur côté annonce) → "📩 Nouvel acheteur intéressé par votre annonce : {title} · {price} FCFA · {city}".
  - Pour `kind === "buyer"` (acheteur recherchant) → "🎯 Annonce trouvée pour votre recherche : {title} · {price} FCFA · {city}".
  - Style : bulle centrée, fond `bg-amber-50/90 dark:bg-amber-900/20`, bord ambré, icône, horodatage de la notification, photo produit miniature si dispo.
- **Remplacer le fond** de la zone messages : passer de `bg-muted/20` à `waouh-chat-bg` (la classe existe déjà dans `src/app-mobile/theme/chat-bg.css`, déjà importée via le shell mobile). Conserver la lisibilité des bulles.
- **Empty state** : si aucun message DB, garder la bulle système comme amorce et supprimer le texte placeholder redondant.

### 2. `WaouhMatchChatWindow.tsx` — Scope strict produit jusqu'à clôture

- **Nettoyer l'envoi** : retirer le préfixe `[Annonce …]` / `[Acheteur …]` injecté dans `text`. Le contexte produit doit voyager **uniquement** via `meta.article_id` + `meta.role` (déjà présent), pas dans le corps du message.
- **Garde-fou réception** : la requête initiale filtre déjà `.eq("article_id", match.article_id)`. Renforcer le subscribe realtime pour ignorer tout INSERT dont `article_id` ≠ `match.article_id` ET `meta.article_id` ≠ `match.article_id` (déjà fait, juste documenter).
- **Statut de clôture** : lire un éventuel `status` / `closed_at` depuis `waouh_articles` (ou `payload.status` de la notification). Si vendu/clôturé :
  - Afficher un badge "Vente finalisée" dans le sub-header.
  - Désactiver le composer (textarea + bouton) et afficher une bannière "Cette conversation est clôturée".
  - Sinon laisser tout actif (comportement actuel).
- Si aucune colonne de statut n'existe encore, on se contente du badge basé sur un flag local `match.closed?: boolean` que l'on prépare pour un futur câblage (no-op pour l'instant).

### 3. `useWaouhMatchChats.ts` — Aligner la clé d'archive

- Unifier la clé de tab sur `${role[0]}_${articleId}` (sans counterpart) pour matcher `WaouhMatchChatList`. Conserver `buyer_profile_id` / `counterpart_user_id` dans `meta` pour les envois.
- Conséquence : ouvrir 2 fois le même article rouvre le même onglet, et `close()` archive bien la ligne correspondante de l'inbox.

### 4. Vérifications

- À l'ouverture : la bulle d'amorce apparaît immédiatement, suivie de l'historique scopé.
- Fond identique visuellement à la fenêtre WAOUH principale.
- Envoyer un message dans la fenêtre produit A n'apparaît pas dans la fenêtre produit B ni dans WAOUH principal.
- Fermer un onglet → la ligne disparaît bien de la liste sous la carte WAOUH (archive correctement appliquée).

## Fichiers touchés

- `src/components/waouh/WaouhMatchChatWindow.tsx` (fetch notif seed, bulle système, fond `waouh-chat-bg`, nettoyage préfixe, statut clôture)
- `src/components/waouh/useWaouhMatchChats.ts` (clé d'onglet unifiée)

Aucune migration DB, aucune edge function modifiée.
