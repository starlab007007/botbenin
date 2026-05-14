
# Sprint 3 — Finalisation WAOUH (chat public end-to-end)

Objectif : rendre le chat WAOUH 100% fonctionnel pour visiteurs anonymes, avec upload photo, géolocalisation enrichie (ville réelle), résumé transaction live et demande d'authentification uniquement au moment de payer.

---

## 1. Diagnostic & fix « le chat n'envoie pas de message »

Causes probables (à vérifier dans cet ordre via logs edge function + console) :
- `waouh-channel-in` reçoit l'appel mais `waouh-webhook` rejette `phone_number = "web:xxx"` (le webhook exige un `phone` réel et n'a pas de branche `channel === "web"`).
- Le client insère via `supabase.functions.invoke` mais l'utilisateur anon n'a pas le droit de **lire** ses propres messages en realtime (policy actuelle filtre sur `web_session_id` — OK), mais le SELECT initial peut échouer si la policy n'autorise pas anon.

Fix :
- Adapter `waouh-webhook` pour accepter un identifiant générique (`phone_number` OU `web_session_id`) et faire l'upsert user en conséquence — OU mieux : déplacer toute la logique IA appelée depuis `waouh-channel-in` (qui gère déjà l'upsert) et ne plus rappeler `waouh-webhook` en interne pour le canal web.
- Ajouter logs explicites dans `waouh-channel-in` (étapes : payload reçu, user upsert, IA, reply persisté, WAHA send) pour diagnostic rapide.
- Vérifier policy SELECT anon sur `waouh_messages` filtrée par `web_session_id` (déjà créée — confirmer).

---

## 2. Géolocalisation enrichie (GPS → ville réelle)

- Au montage du chat (`WaouhWebChat`), appeler `navigator.geolocation` puis **reverse geocoding** via une nouvelle edge function `waouh-geocode` qui appelle Nominatim (OpenStreetMap, gratuit, pas de clé) et renvoie `{ city, country, display_name }`.
- Stocker `{ lat, lng, city }` dans state local + envoyer à chaque message.
- Afficher sous le header du chat : `📍 {city}` (badge cliquable « Modifier ») au lieu des coordonnées brutes.
- Permettre changement manuel via un petit Popover (input ville → géocodage direct via la même fonction).

---

## 3. Upload de photos dans le chat

Stockage :
- Nouveau bucket Supabase Storage **`waouh-uploads`** (public, accès anon en INSERT, SELECT public).
- Ajouter colonne `attachments jsonb` (array de `{url, type}`) à `waouh_messages`.

Frontend (`WaouhWebChat`) :
- Bouton 📎 à côté de l'input → `<input type="file" accept="image/*" capture="environment">` (déclenche caméra mobile).
- Upload direct vers Storage (chemin `web/{sessionId}/{uuid}.jpg`), récupération de `publicUrl`.
- Aperçu miniature avant envoi, suppression possible.
- Envoi : passe `attachments: [{url, type}]` à `waouh-channel-in`.
- Rendu des messages : si `attachments`, afficher images dans la bulle (`<img>` lazy, max-h-48).

Backend :
- `waouh-channel-in` propage `attachments` dans l'INSERT et passe les URLs au moteur IA pour analyse multimodale (Gemini 2.5 Flash supporte les images via le AI Gateway).
- Si WhatsApp : envoi via WAHA `sendImage` au lieu de `sendText`.

---

## 4. Résumé automatique de transaction dans le chat

État actuel : `waouh_transactions` existe (statuts probables : `pending`, `paid`, `released`, `disputed`, `cancelled`).

Frontend : nouveau composant `WaouhTransactionCard` rendu **inline dans le chat** dès qu'un message a `meta.transaction_id`.

```text
┌─────────────────────────────────────┐
│ 🛒 Transaction #A8F3                │
│ iPhone 14 Pro · 580 000 FCFA        │
│ ─────────────────────────────────── │
│ ● En attente paiement   [10:42]     │
│ ○ Payé (escrow)         —           │
│ ○ Libéré au vendeur     —           │
│ ─────────────────────────────────── │
│ [💳 Payer maintenant]               │
└─────────────────────────────────────┘
```

- Stepper vertical 3 étapes (En cours → Payé → Libéré) avec timestamps.
- Souscription realtime sur `waouh_transactions` filtrée sur les IDs présents dans le chat → MAJ live.
- Helper `formatTransactionStatus()` partagé.

Backend :
- `waouh-payment-handler` et `waouh-webhook` doivent insérer dans `meta.transaction_id` à chaque message lié à une transaction.
- Ajout colonne `status_history jsonb` (array de `{status, at, by}`) sur `waouh_transactions` + trigger qui appende à chaque update du `status`.

---

## 5. Auth différée — connexion uniquement au paiement

Comportement :
- Visiteur anonyme : peut chatter, vendre, négocier sans compte (déjà OK via `web_session_id`).
- Au clic « 💳 Payer maintenant » sur la `WaouhTransactionCard` :
  - Si `user` connecté → ouvre directement le flow Mobile Money.
  - Si non connecté → modal `WaouhAuthGate` : « Pour sécuriser votre paiement, créez un compte en 10 secondes » avec :
    - Champ téléphone (Mobile Money) → OTP via Supabase Auth (sms) OU magic link email.
    - Après auth, le `web_session_id` est rattaché au `user_id` (mise à jour `waouh_users` et `waouh_messages` via fonction RPC `waouh_link_session(session_id, user_id)`).
    - Reprend automatiquement le flow paiement.

---

## 6. Fichiers touchés

**Migration SQL** :
- bucket `waouh-uploads` + policies (anon insert/select).
- `waouh_messages.attachments jsonb`.
- `waouh_transactions.status_history jsonb` + trigger.
- RPC `waouh_link_session(session_id text, user_id uuid)` security definer.

**Edge functions** :
- `waouh-geocode` (nouveau, public, Nominatim).
- `waouh-channel-in` : support `attachments`, propagation `transaction_id`, logs.
- `waouh-webhook` : branche `channel === "web"` pour accepter `web_session_id`, push `transaction_id` dans `meta`, image multimodale.
- `waouh-payment-handler` : exige `user_id`, append `status_history`.

**Frontend** :
- `src/components/waouh/WaouhWebChat.tsx` : upload photo, ville affichée, rendu attachments + `WaouhTransactionCard`.
- `src/components/waouh/WaouhTransactionCard.tsx` (nouveau).
- `src/components/waouh/WaouhAuthGate.tsx` (nouveau, modal OTP/magic link).
- `src/components/waouh/WaouhCityBadge.tsx` (nouveau, badge ville + popover édition).
- `src/hooks/useWaouhGeolocation.ts` (nouveau, GPS + reverse geocode + cache localStorage).
- `src/pages/waouh/WaouhChatPage.tsx` : retire les coordonnées du header, intègre `WaouhCityBadge`.

---

## 7. Critères de réussite

- [ ] Visiteur anonyme tape un message → réponse IA reçue en < 5s, persistée, realtime OK.
- [ ] Ville réelle (« Cotonou », « Calavi »…) affichée sous le header dès l'autorisation GPS.
- [ ] Upload photo fonctionne (mobile = caméra, desktop = fichier), photo visible dans la bulle, IA peut la décrire.
- [ ] Transaction créée → carte affichée dans le chat avec stepper, MAJ live au passage `paid` puis `released`.
- [ ] Clic « Payer » sans compte → modal auth (OTP), après auth la transaction continue sans perte de contexte.
- [ ] Aucun blocage RLS dans la console réseau, aucun 401/403 sur les invocations edge functions.
