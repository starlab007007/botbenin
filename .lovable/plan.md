# Corrections WAOUH

## 1. Géolocalisation précise lors de la vente

**Problème** : `WaouhSellWizard` affiche une ville en texte libre pré-remplie avec `geo.city` (cache potentiellement périmé). Le `lat/lng` envoyé à `waouh-sell-handler` provient de `sendCore` (cache geo global) — pas de la position réelle au moment de la publication.

**Fix** :
- Dans `WaouhSellWizard`, à l'ouverture : appeler `navigator.geolocation.getCurrentPosition` (haute précision) + invoquer `waouh-geocode` pour reverse-geocoder lat/lng → ville/quartier.
- Afficher la ville détectée (lecture seule par défaut, bouton "Corriger" pour basculer en texte libre).
- Capturer la `{lat, lng, city}` réelle dans le state du wizard et la passer via `onSubmit` à un nouveau paramètre.
- Modifier `WaouhWebChat.sendCore` pour accepter un override `locationOverride` et l'envoyer à `waouh-channel-in` (qui transmet à `sell-handler`).
- Si l'utilisateur édite la ville manuellement, re-géocoder (forward) via `waouh-geocode` pour obtenir lat/lng cohérents avant submit.

## 2. Recherche "Je cherche" : rapidité + photos

**Problème** : `waouh-buy-handler` fait AI extraction synchrone, query, puis dispatch in-loop avant de répondre. Les photos manquent parfois car le champ `photos` n'est pas garanti dans la réponse `matches`.

**Fix dans `waouh-buy-handler/index.ts`** :
- Renvoyer la réponse au client **immédiatement après** la requête SQL des `matches` (avec `photos`, `city`, `price`, `distance_km`, `lat`, `lng`).
- Lancer les boucles `waouh-notify-dispatch` en `EdgeRuntime.waitUntil(...)` (fire-and-forget hors du chemin critique).
- Sélectionner explicitement `photos` + coords dans la query (`select id,title,price,photos,city,location,...`) et garantir des URLs HTTPS publiques.
- Côté UI (`WaouhWebChat` / bulle de résultats) : précharger les images via `loading="eager"` pour les 3 premiers résultats, `lazy` ensuite ; placeholder visuel pendant chargement.

## 3. Distances réelles dans les résultats

**Problème** : la réponse texte de `buy-handler` n'inclut pas de distance par article. Le client n'a aucun calcul.

**Fix** :
- Dans `waouh-buy-handler`, après la query, calculer pour chaque article `distanceKm(buyerLat, buyerLng, articleLat, articleLng)` en extrayant les coords depuis `location` (PostGIS POINT) — utiliser une RPC SQL `ST_Distance` ou parser `location` après select `ST_X(location), ST_Y(location)`.
- Ajouter `distance_km` à chaque match retourné et l'inclure dans la `reply` texte : `• Titre — 12 000 FCFA · Cotonou · 📍 2,3 km`.
- Trier les matches par `distance_km` croissant.
- Mettre à jour la bulle UI pour afficher la distance sous chaque carte produit.

## 4. Double notification vendeur (Nouvel acheteur + Demande envoyée)

**Problème** : `waouh-buyer-interest` pousse `buyer_interest_ack` (côté acheteur via `pushSyncedEvent`) ET déclenche `waouh-notify-dispatch kind=new_buyer` (côté vendeur). Mais la fenêtre `WaouhMatchChatWindow` du vendeur reçoit aussi le message "✅ Demande envoyée au vendeur" — probablement parce que `pushSyncedEvent` ou le dispatcher écrit dans `waouh_messages` avec un `user_id` qui matche aussi le vendeur, ou que la requête de chargement du match ne filtre pas le `template`.

**Fix** :
- Vérifier dans `WaouhMatchChatWindow` / `useWaouhMatchChats` que le chargement filtre `meta.template != 'buyer_interest_ack'` (côté vendeur).
- Confirmer dans `waouh-buyer-interest` que `pushSyncedEvent` cible bien `user: buyerUser` uniquement (déjà le cas) — auditer s'il y a une seconde insertion via le dispatcher qui répercute l'ack vers le vendeur. Si oui, ajouter un garde `recipient !== 'seller'` pour les templates `*_ack`.
- Seul `new_buyer` doit apparaître dans la fenêtre vendeur.

## 5. Négociation : "Je propose X" ne fonctionne pas après une contre-offre

**Problème** : Quand le vendeur tape "je propose 50000" dans `WaouhMatchChatWindow` (ou chat principal) après avoir reçu la contre-offre, le routeur répond `Aucune négociation en cours`. La négociation existe (créée par `waouh-buyer-interest`) mais :
- Le message passe par `waouh-webhook` (chat principal) ou par un autre chemin qui ne route pas vers `waouh-negotiation-router` pour le vendeur ; OU
- La lookup ne match pas parce que `seller_user_id` n'est pas posé sur l'enregistrement, ou parce que l'état est resté `proposed`/`countered` mais la condition `.or(buyer_user_id.eq...,seller_user_id.eq...)` exige que `user.id` soit l'un ou l'autre — et l'`user` résolu depuis le web session peut différer de `seller_user_id` (le vendeur web est identifié par `auth_user_id`/`web_session_id` plutôt que par `phone_number`).

**Fix** :
- Dans `waouh-negotiation-router`, élargir la résolution du `user` : si `user_id` est null, résoudre via `web_session_id` ou `auth_user_id` en plus du `phone_number`. Idem dans `waouh-webhook` au moment de router "je propose".
- Dans `WaouhMatchChatWindow`, quand le vendeur envoie un message, appeler explicitement `waouh-negotiation-router` avec `user_id = sellerWaouhUserId` (pas seulement `phone`).
- Dans `waouh-webhook` (chat principal), avant de répondre "Aucune négociation en cours", tenter la même lookup élargie + fallback : si une `waouh_negotiation` existe en `proposed|countered` pour cet utilisateur (côté acheteur OU vendeur), router vers `negotiation-router` avec l'intent `price`.
- Vérifier que la création initiale dans `waouh-buyer-interest` pose bien `seller_user_id = article.seller_id` (déjà fait) ; ajouter un index/garantie que `seller_user_id` n'est jamais null.

## Détails techniques

**Fichiers modifiés** :
- `src/components/waouh/WaouhSellWizard.tsx` — géoloc temps réel + reverse geocode + champ ville verrouillé/éditable
- `src/components/waouh/WaouhWebChat.tsx` — propager `locationOverride` depuis le wizard
- `src/app-mobile/components/native/NativeSellSheet.tsx` — même traitement géoloc
- `supabase/functions/waouh-buy-handler/index.ts` — réponse rapide, distance par match, photos garanties, dispatch async
- `supabase/functions/waouh-negotiation-router/index.ts` — résolution user par web_session_id/auth_user_id
- `supabase/functions/waouh-webhook/index.ts` — fallback négociation pour vendeur + lookup élargie
- `supabase/functions/waouh-buyer-interest/index.ts` — confirmer pas de double-écriture côté vendeur
- `src/components/waouh/WaouhMatchChatWindow.tsx` / `useWaouhMatchChats.ts` — filtrer `*_ack` côté vendeur, router "je propose" via `negotiation-router` avec `user_id`
- `src/components/waouh/WaouhResultsBubble.tsx` (ou équivalent) — afficher distance par carte

**Aucun changement de schéma DB requis** — `waouh_negotiations.seller_user_id` et `waouh_articles.location` existent déjà.
