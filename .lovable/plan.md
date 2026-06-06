## Objectif

Reproduire **exactement** le flux chat WAOUH verrouillé (chat principal ↔ WaouhMatchChatWindow, acheteur + vendeur) sur **WhatsApp**, dès qu'un numéro est résolu — quelle que soit la source : `chat`, `partner` (waouh_partner_businesses / waouh_partners), ou `radar ia` (waouh_external_listings / waouh_radar_signals / waouh_lid_phone_map).

**Règle d'or** : chaque évènement de négociation produit, pour **chaque partie**, le même message au même moment dans :
- (a) `waouh_messages` côté chat web (avec `article_id` rempli),
- (b) WhatsApp via `waouh_outbound_queue` si un numéro WA est résolu pour cette partie.

Texte identique sur les deux canaux. L'acteur reçoit l'écho de sa propre action (ex. acheteur qui envoie « 1500 » via WA reçoit `✅ Contre-offre envoyée au vendeur`).

## Évènements synchronisés

| Évènement | Acheteur (chat + WA) | Vendeur (chat + WA) |
|---|---|---|
| 📩 Nouvel acheteur intéressé | ✅ Demande envoyée | 📩 Nouvel acheteur intéressé |
| 🤝 Contre-offre acheteur | ✅ Offre envoyée | 🤝 Nouvelle offre acheteur |
| 💬 Contre-offre vendeur | 💬 Contre-offre du vendeur | ✅ Contre-offre envoyée |
| ❌ Refus | ❌ Notification refus | ❌ Notification refus |
| 🎉 Vente conclue | 🎉 Vente conclue | 🎉 Vente conclue |

## Cause des écarts actuels

1. `waouh-notify-dispatch` envoie directement via `sendWhatsAppCard()` → contourne `waouh_outbound_queue` → doublons possibles avec `waouh-webhook`.
2. `waouh-buyer-interest` n'insère pas la bulle `✅ Demande envoyée` côté acheteur ni d'écho WA acheteur.
3. `waouh-negotiation-router` : l'écho WA de l'acteur (web ou WA) n'est pas garanti symétriquement.
4. Résolution numéro pas systématique pour les **deux** parties à chaque évènement (chaîne radar/partner non tentée partout).

## Plan de correction

### 1) Nouveau helper partagé `pushSyncedEvent`

Fichier : `supabase/functions/_shared/waouh-sync.ts` (nouveau).

Signature : `pushSyncedEvent(sb, { party: { user, role, text }, articleId, intent, negotiationId, dedupSuffix })`.

Pour **chaque partie** (appel séparé pour acheteur et vendeur) :
- Résout le numéro WA via `resolveRealPhoneE164(sb, user, { article_id, role })` (utilise toute la chaîne chat → partner → radar/lid_phone_map déjà en place).
- Insère un `waouh_messages` (colonne `article_id` remplie, `meta.intent`, `meta.article_id` de secours, `direction='out'`, `channel = phone ? 'whatsapp' : 'web'`).
- Si numéro WA résolu : `waouh_enqueue_outbound_v2` avec `dedup_key = ${article_id}:${intent}:${user.id}:${negotiation_id}:${dedupSuffix}`, payload texte (ou boutons si fourni).
- Si pas de numéro : insert chat seulement (la fenêtre web reçoit en realtime).

### 2) Câblage des chemins d'émission

- **`waouh-webhook/index.ts`** (CONFIRM, NEGOTIATE, DECIDE_YES/NO) : remplacer chaque `pushToOther` par **deux** appels `pushSyncedEvent` (acteur + destinataire), avec textes distincts adaptés au rôle.
- **`waouh-negotiation-router/index.ts`** (refus, contre-offre, deal_created) : idem, échos symétriques.
- **`waouh-buyer-interest/index.ts`** : ajouter `pushSyncedEvent` acheteur (`✅ Demande envoyée`) en plus de la notif vendeur.
- **`waouh-notify-dispatch/index.ts`** : remplacer l'appel direct `sendWhatsAppCard()` par `waouh_enqueue_outbound_v2` (payload `kind: "buttons"` pour conserver les cartes OUI/NON déjà supportées par `waouh-outbound-dispatch`). Élimine les doublons et unifie le tracking.

### 3) Résolution numéro

Aucun changement de signature. Tous les appelants doivent passer `{ article_id, role: "buyer" | "seller" }` à `resolveRealPhoneE164`. La chaîne complète est :
- **Vendeur** : article → `waouh_external_listings.seller_phone` (radar) → `waouh_partner_businesses.whatsapp` → `waouh_partners.whatsapp` → `waouh_users.phone_number` → `waouh_lid_phone_map` → `profiles.phone` → `auth.users.phone`.
- **Acheteur** : `waouh_users.phone_number` → `waouh_lid_phone_map` → `auth.users.phone` → `profiles.phone` → `waouh_partners.whatsapp` (si acheteur partenaire).

### 4) Anti-doublon

`dedup_key` systématique sur `waouh_enqueue_outbound_v2`. `waouh_outbound_dispatch` ignore les entrées déjà envoyées pour le même `dedup_key`.

### 5) Préservé (verrouillé)

- Flux chat WAOUH (mémoire `waouh-chat-sync-flow`) intact.
- Logique métier `waouh_negotiations` / `waouh_deals` inchangée.
- Aucune migration SQL (colonnes `article_id`, `meta`, `direction` existantes ; RPC `waouh_enqueue_outbound_v2` existante).
- Pas de changement frontend.

## Fichiers modifiés

- `supabase/functions/_shared/waouh-sync.ts` (nouveau)
- `supabase/functions/waouh-webhook/index.ts`
- `supabase/functions/waouh-negotiation-router/index.ts`
- `supabase/functions/waouh-buyer-interest/index.ts`
- `supabase/functions/waouh-notify-dispatch/index.ts`
