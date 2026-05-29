## Objectif

Appliquer exactement le même fonctionnement que « 📩 Nouvel acheteur intéressé » aux deux types côté acheteur :
- « 🎯 Annonce trouvée pour vous » (`match` / `match_buyer`)
- « 🎯 Annonce détectée par le Radar IA » (`radar_match`)

Chaque notification doit :
1. Apparaître en tête de `WaouhMatchChatList` (sous la carte WAOUH) comme une ligne distincte, clé = `notification.id`.
2. À l'ouverture, afficher dans `WaouhMatchChatWindow` le **même contenu riche** (photo + texte intégral identique à WhatsApp) via `payload.text`.
3. Auto-ouvrir une fenêtre dédiée à la réception temps réel.

## Constat

Le front est déjà presque prêt :
- `WaouhMatchChatList` charge déjà les types `match`, `match_buyer`, `match_seller`, `new_buyer`, `radar_match` et les keye par `notification.id`.
- `WaouhMatchChatWindow` affiche un seed bulle riche depuis `payload.text` / `seed_text`.

Deux trous bloquent l'expérience côté acheteur :
- **Auto-ouverture** (`useWaouhMatchNotifications`) : `matchKinds` n'inclut **pas** `radar_match`, donc la fenêtre ne s'ouvre pas automatiquement quand le Radar IA détecte une annonce.
- **Contenu riche manquant** (`waouh-radar-process`) : l'insert dans `waouh_notifications` pour `radar_match` ne pose pas `payload.text` ni `web_session_id`. Résultat : ligne générique « 🎯 Annonce trouvée pour vous » et bulle riche vide dans la fenêtre.

Côté `match` / `match_buyer`, `waouh-notify-dispatch` pose déjà `payload.text` (via `buildBuyerMatchText`) + `web_session_id` → rien à changer côté serveur.

## Changements

### 1. `src/hooks/useWaouhMatchNotifications.ts`
- Ajouter `radar_match` à `matchKinds` pour déclencher l'event `waouh:open-match-chat` à l'insert temps réel.
- Forcer `kind: "buyer"` pour `radar_match` (et `match` / `match_buyer` sans `recipient`).
- Propager `seed_text`, `notification_id`, `photos`, `title/price/city` depuis `row.payload` comme déjà fait pour les autres.

### 2. `supabase/functions/waouh-radar-process/index.ts`
Enrichir l'insert `waouh_notifications` (vers ligne 233) pour le rendre identique à `waouh-notify-dispatch` :
- Récupérer `web_session_id` du `waouh_users` cible (déjà lu ensuite ligne 241, juste hoister).
- Ajouter au row : `web_session_id`, `photos: signalPhotos`, et `payload: { text: directText, recipient: "buyer", title, price, city, signal_id, match_id, photos }`.
- Conserver `title`/`body`/`meta` existants pour rétro-compat.

Ainsi `WaouhMatchChatList` affichera la ligne avec photo + preview de la première ligne du texte riche, et `WaouhMatchChatWindow` épinglera la bulle complète identique à WhatsApp (`🎯 *Annonce détectée par le Radar IA* …`).

### 3. `src/components/waouh/WaouhMatchChatWindow.tsx` (cosmétique)
Adapter `seedTitle` pour différencier :
- `seller` → « 📩 Nouvel acheteur intéressé par votre annonce »
- `buyer` + `notification_type === "radar_match"` → « 🎯 Annonce détectée par le Radar IA »
- `buyer` autre → « 🎯 Annonce trouvée pour votre recherche »

(`seedNotif.notification_type` est déjà chargé.)

## Hors scope

- Pas de changement DB (schémas / RLS).
- Pas de modification du dispatcher `match` / `new_buyer` (déjà conforme).
- Aucun changement sur le côté vendeur (déjà OK).

## Validation

- 1 signal Radar IA détecté → 1 ligne distincte au top de la liste avec photo + texte riche, et la fenêtre s'ouvre automatiquement avec la bulle complète identique au WhatsApp.
- 2 annonces match successives pour un même acheteur → 2 lignes séparées (clé `notification.id`).
- Notification `match_buyer` existante : reste fonctionnelle, contenu identique à avant.
