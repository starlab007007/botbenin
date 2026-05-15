# Suite WAOUH — Parcours payment + escrow démo + pipeline Radar IA autonome

## 1. Carte de paiement réservée à l'acheteur

**Problème actuel** : `WaouhTransactionCard` est rendue pour tout message portant `meta.transaction_id`, donc le vendeur voit aussi le bouton « Payer » et un loader perpétuel.

**Correctifs**
- `WaouhTransactionCard` : charger l'identité de session (`web_session_id` ou `user.id`) et comparer à `tx.buyer_id` / `tx.seller_id`.
  - Acheteur → carte complète + bouton « Payer maintenant ».
  - Vendeur → carte « lecture seule » : statut, montant, étapes, **pas de bouton**, pas de spinner bloquant.
  - Tiers (autre session) → carte cachée.
- Carte affichée **uniquement** quand `status ∈ {accord_conclu, payment_pending, paid, released, completed}` (jamais pendant la négociation).
- Supprimer l'état « Chargement transaction… » infini → si la requête renvoie `null`, on n'affiche rien (et on retente une fois via realtime).

## 2. Parcours bout-en-bout fluide

Étapes garanties dans l'ordre (router `waouh-negotiation-router` + `waouh-webhook`) :

```text
intéressé → offre/contre-offre → accord (OUI) → carte transaction (acheteur)
  → auth si invité → paiement démo → escrow held
  → partage contact + adresse + RDV → confirmation réception
  → libération escrow → message félicitations + demande notation 1–5★
```

- Si utilisateur **non authentifié** au moment du clic « Payer » :
  - Ouvrir le dialog d'auth (déjà câblé via `setAuthOpen`).
  - Après login, ré-ouvrir automatiquement `WaouhPaymentDialog` avec la même transaction (mémoriser `pendingPaymentTx`).
  - Lier `web_session_id` → `auth.uid` côté `waouh_users` (réconciliation) pour ne pas perdre l'historique.
- Messages d'erreur normalisés (toast + bulle bot) : numéro invalide, solde insuffisant, refus opérateur, timeout, transaction déjà payée, accès refusé.

## 3. Mode paiement DÉMO (avant production)

Ajouter un drapeau `WAOUH_PAYMENT_MODE = "demo" | "live"` (secret edge function).

Dans `waouh-payment` :
- `action: "init"` en mode démo → ne contacte pas Qosic, marque la transaction `payment_pending` puis `paid` après ~3 s simulés (ou via bouton « Confirmer paiement démo »).
- `action: "status"` renvoie immédiatement `success` une fois le délai écoulé.
- Badge visible dans `WaouhPaymentDialog` : « Mode démo — aucun débit réel ».

## 4. Escrow + automatisation post-paiement

Une fois `status = paid` (escrow held), nouvelle edge function `waouh-post-payment-flow` (ou extension de `waouh-payment-handler`) déclenchée par trigger DB sur `waouh_transactions` :

1. Pousser dans le chat acheteur **et** vendeur :
   - Coordonnées de l'autre partie (téléphone, WhatsApp, ville).
   - Adresse de livraison (collectée auprès de l'acheteur si absente).
   - Proposition de RDV (3 créneaux).
2. Boutons d'action dans la carte transaction :
   - Acheteur : « J'ai bien reçu » → `status = received`.
   - Vendeur : « Marquer comme livré ».
3. Quand `received` confirmé → libération escrow (`status = released` puis `completed`).
4. Message final automatique à l'acheteur :
   > 🎉 Transaction terminée. Notez le vendeur : ⭐⭐⭐⭐⭐
   - 5 boutons étoiles → insertion dans `waouh_ratings` (nouvelle table) + mise à jour `waouh_users.rating_avg`.

Nouvelle table `waouh_ratings` (transaction_id, rater_id, ratee_id, stars 1–5, comment, created_at) avec RLS.

## 5. Pipeline Radar IA autonome → profils → WhatsApp

**Objectif** : tout signal capté par Radar IA devient un profil exploitable par le chat WAOUH et par l'outbound WhatsApp.

### 5.1 Extraction & enrichissement
Étendre `waouh-radar-process` :
- Détecter intention : `seller_signal` (annonce) vs `buyer_signal` (recherche).
- Extraire automatiquement : nom/pseudo, ville, prix, catégorie, **téléphone**, lien WhatsApp.
- Normaliser les numéros béninois :
  - `01XXXXXXXX` (10 chiffres) **et** `XXXXXXXX` (8 chiffres) → tester les deux variantes `+22901…` et `+229…` via `waha`/`evolution` `checkNumberStatus`.
  - Stocker la variante valide dans `whatsapp_e164`.

### 5.2 Tables enrichies
- `waouh_radar_profiles` (nouvelle) : `id, source_signal_id, type ('seller'|'buyer'), display_name, city, phone_raw, whatsapp_e164, whatsapp_verified, category, price_hint, raw_payload, created_at`.
- Lien optionnel vers `waouh_articles` (si annonce promue) ou `waouh_buyer_intents` (si recherche).
- Trigger : à l'insertion d'un signal radar → upsert profil + tentative de matching avec annonces/intents existants.

### 5.3 Matching & outreach automatique
- Cron edge function `waouh-radar-match` (toutes les 5 min) :
  1. Pour chaque nouveau profil `seller` → chercher les `buyer_intents` compatibles (catégorie + ville + prix).
  2. Pour chaque nouveau profil `buyer` → chercher les `articles` compatibles.
  3. Pour chaque match :
     - Insérer notification dans `waouh_outbound_queue` (déjà câblé pour le chat).
     - Si `whatsapp_verified = true` → enqueue message WhatsApp via `waouh-outbound-dispatch` (template : « WAOUH a trouvé un match… »).
- Anti-spam : 1 message / profil / 24 h.

### 5.4 Intégration au chat WAOUH
- Le router de chat (`waouh-channel-in`) interroge **aussi** `waouh_radar_profiles` lors d'une requête « Je cherche … » → renvoie ces profils avec contact + bouton « Contacter via WhatsApp ».
- Bouton « Contacter via WhatsApp » → déclenche envoi via `waouh-outbound-dispatch` (pas d'ouverture `wa.me` côté client) pour tracer.

## 6. Détails techniques

- **Schémas DB** : nouvelles tables `waouh_ratings`, `waouh_radar_profiles` ; ajout `received_at`, `delivery_address`, `meeting_slot` sur `waouh_transactions` ; ajout `rating_avg`, `rating_count` sur `waouh_users`.
- **RLS** : ratings lisibles publiquement (agrégat), insertion uniquement par l'acheteur de la transaction. Profils radar lisibles par tout utilisateur authentifié, écriture service-role.
- **Trigger** `on_waouh_transaction_status_change` → POST vers `waouh-post-payment-flow`.
- **Secrets requis** : `WAOUH_PAYMENT_MODE` (par défaut `demo`), réutilise `WAHA_*` existants.
- **Frontend** :
  - `WaouhTransactionCard` : prop optionnelle `viewerRole` calculée localement.
  - `WaouhWebChat` : conserver `pendingPaymentTx` après login, écouter événement `waouh:payment-confirmed`.
  - Nouvelle carte « ⭐ Notez le vendeur » rendue quand `status = completed` et `rating` absent.

## 7. Hors scope

- Bascule définitive en production Qosic (rester en démo jusqu'à validation utilisateur).
- Refonte UI globale du chat — uniquement les correctifs ciblés ci-dessus.
