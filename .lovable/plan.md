# Plan — Stabilisation WAOUH (phase test)

Six incohérences observées, regroupées en 4 chantiers cohérents. Tout le travail reste dans le périmètre WAOUH existant (tables `waouh_*`, edge functions `waouh-*`, écrans `/app/chat` et `/waouh-chat`).

---

## 1. Isolation de l'historique chat par compte

**Problème**
`WaouhWebChat.loadHistory` et `useWaouhMatchNotifications` font l'union `web_session_id ∪ auth_user_id`. Quand plusieurs comptes se connectent dans le même navigateur (même `localStorage.waouh_web_session_id`), tous les messages et notifications de tous les comptes apparaissent fusionnés. La fonction `waouh-history` fait la même union côté serveur.

**Correctif**
- Régénérer un `waouh_web_session_id` distinct à chaque login / logout (hook `AuthContext`) : effacer la clé puis la recréer pour que chaque session soit propre.
- Dans `WaouhWebChat`, `useWaouhMatchNotifications`, `useWaouhMatchChats`, `useWaouhInbox` :
  - Si `authUserId` existe → ne charger que les `waouh_users` liés à `auth_user_id` (ignorer la session anonyme).
  - Si pas connecté → ne charger que `web_session_id`.
- Mettre à jour `waouh-history` (edge) avec la même règle : ne pas mélanger `auth_user_id` et `web_session_id` simultanément.
- Migration légère : pour chaque `waouh_users` rattaché à un `auth_user_id`, vider `web_session_id` pour éviter les fuites passées.

## 2. Notifier le vendeur dès l'intérêt acheteur

**Problème**
`waouh-channel-in` ne déclenche `new_buyer` que lorsqu'un acheteur envoie un message dans le chat article-scopé. Si l'acheteur clique seulement « Je suis intéressé » depuis la notification radar/match, le vendeur ne reçoit rien (ni in-app, ni WhatsApp).

**Correctif**
- Nouvelle edge function **`waouh-buyer-interest`** appelée par le front quand l'acheteur ouvre un `WaouhMatchChatWindow` pour la 1ère fois ou clique « Contacter le vendeur » :
  - Insère un événement `waouh_interests` (article_id, buyer_user_id, seller_id, created_at, dédupe unique).
  - Délègue à `waouh-notify-dispatch` avec `kind: "new_buyer"`, `recipient: "seller"`, en réutilisant la déduplication existante.
- Brancher l'appel dans `useWaouhMatchChats.onOpen` et dans le bouton « Je suis intéressé » d'une notification `match_buyer` / `radar_match`.
- Le vendeur reçoit la notif in-app + le message WhatsApp via la même chaîne (`waouh-outbound-dispatch`).

## 3. Géolocalisation & étude de marché

**Problème**
`useWaouhGeolocation` + `waouh-geocode` (Nominatim seul) renvoient souvent une ville approximative ; `waouh-price-compare` calcule un marché à partir d'articles trop éloignés ou non normalisés.

**Correctif**
- `waouh-geocode` :
  - Ajouter un fallback Google Geocoding (clé `GOOGLE_MAPS_API_KEY` à demander si absente) avec priorité Nominatim → Google sur faible confiance.
  - Normaliser systématiquement ville/quartier via `beninLocations` (liste interne) pour éviter les variantes ("Cotonou" vs "Cotonou IV").
  - Conserver `lat/lng` source et `lat/lng` snappés sur quartier connu.
- `useWaouhGeolocation` : stocker `{city, district, lat, lng, accuracy}` et afficher un badge d'incertitude quand `accuracy > 1 km`.
- `waouh-price-compare` : filtrer par ville normalisée + rayon (haversine) + même catégorie/marque et exposer min/median/max + nb d'échantillons. Refuser de produire une recommandation si < 3 échantillons et l'indiquer dans le résultat.

## 4. Chats privés par produit + persistance des notifications Radar IA

**Problème**
- Aucun point d'entrée explicite pour démarrer un chat privé sur un produit hors notification (depuis une carte radar par ex.).
- Les notifications radar/match sont éphémères : `clearAll` vide le `localStorage` et certaines notifs radar ne sont jamais persistées dans `waouh_notifications`.
- Les cartes de produits trouvés (Radar IA) ne sont pas structurées (manque image, prix, source, CTA).

**Correctif**
- **Persistance** :
  - Dans `waouh-radar-process` (et `waouh-serpapi-scout` / `waouh-radar-apify`), insérer une ligne `waouh_notifications` avec `notification_type = 'radar_match'`, payload = `{title, price, city, source_url, photos, signal_id}` pour chaque match envoyé à un acheteur.
  - `useWaouhMatchNotifications.clearAll` ne supprime plus côté serveur : il met juste `opened = true` dans `waouh_notifications` pour les ids concernés (les notifs restent rechargeables).
  - Bouton « Tout effacer » remplacé par « Tout marquer comme lu ». Ajouter un onglet « Historique » dans la cloche listant les notifs déjà lues (chargées depuis la DB).
- **Carte produit Radar IA** : dans `WaouhNotificationsBell`, rendre les notifs `radar_match` avec image, titre, prix formaté, ville, badge source, CTA `Ouvrir le chat` et `Voir la source`. Reutiliser le composant `WaouhTransactionCard` style condensé.
- **Ouverture chat privé** :
  - Sur le clic CTA `Ouvrir le chat` (radar_match, match_buyer, match_seller), dispatcher `waouh:open-match-chat` (déjà géré par `useWaouhMatchChats`) → cela crée un onglet privé scopé à `article_id`.
  - Ajouter un bouton « 💬 Discuter » sur chaque carte produit affichée dans le chat principal (`WaouhTransactionCard`) qui dispatch le même event.
  - Appeler `waouh-buyer-interest` (chantier 2) lors de la 1re ouverture pour notifier le vendeur.

---

## Technique — récap fichiers

```text
Front
  src/contexts/AuthContext.tsx                       # reset waouh_web_session_id sur login/logout
  src/components/waouh/WaouhWebChat.tsx              # scoping strict auth vs anon
  src/hooks/useWaouhMatchNotifications.ts            # scoping + clearAll = mark read + radar card mapping
  src/hooks/useWaouhInbox.ts                         # scoping
  src/components/waouh/useWaouhMatchChats.ts         # appel waouh-buyer-interest à l'ouverture
  src/components/waouh/WaouhNotificationsBell.tsx    # rendu carte radar_match + onglet historique
  src/components/waouh/WaouhTransactionCard.tsx      # bouton « Discuter »
  src/hooks/useWaouhGeolocation.ts                   # accuracy + normalisation

Edge functions
  supabase/functions/waouh-history/index.ts          # scoping strict
  supabase/functions/waouh-buyer-interest/index.ts   # NOUVEAU
  supabase/functions/waouh-notify-dispatch/index.ts  # accepter source 'interest'
  supabase/functions/waouh-geocode/index.ts          # fallback Google + normalisation
  supabase/functions/waouh-price-compare/index.ts    # rayon + min échantillons
  supabase/functions/waouh-radar-process/index.ts    # insert waouh_notifications
  supabase/functions/waouh-serpapi-scout/index.ts    # idem
  supabase/functions/waouh-radar-apify/index.ts      # idem

Migrations
  - table waouh_interests (article_id, buyer_user_id, seller_id, created_at, unique)
  - vider web_session_id sur waouh_users.auth_user_id NOT NULL
```

## Secret éventuel
`GOOGLE_MAPS_API_KEY` (chantier 3, fallback géocodage). Confirmer si vous l'avez déjà ; sinon je n'ajoute que la normalisation Nominatim + `beninLocations`.

## Questions ouvertes
1. Doit-on inclure le fallback Google Geocoding (chantier 3) ou rester sur Nominatim + normalisation locale uniquement ?
2. Sur le bouton « Tout effacer » des notifications : remplacement total par « Tout marquer comme lu », ou garder un effacement local + onglet Historique ?
