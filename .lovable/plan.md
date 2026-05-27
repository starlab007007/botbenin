## Objectif

Transformer l'onglet "Campagnes" de WhatsApp Diffusion en un véritable centre de pilotage : vérifier que chaque numéro est bien sur WhatsApp (double check avec et sans le préfixe `01`), suivre chaque envoi individuellement (envoyé / livré ✓✓ / lu ✓✓ bleu / répondu / erreur), et offrir des actions intelligentes (voir, simuler, modifier, supprimer, relancer les erreurs).

La base de données est déjà prête (`wa_send_jobs` contient `sent_at`, `delivered_at`, `read_at`, `replied_at`, `status`, `last_error`, `attempt`). Il reste à brancher la vérification WhatsApp, le webhook de statuts WAHA, et à construire l'UI.

---

## 1. Vérification "Est-ce un numéro WhatsApp ?"

Au lieu d'envoyer aveuglément, chaque contact reçoit un statut WhatsApp visible.

- Nouveau bouton **"Vérifier WhatsApp"** sur l'onglet Contacts et dans le wizard de campagne (étape ciblage).
- Edge function `whatsapp-check-numbers` qui appelle `POST /api/contacts/check-exists` de WAHA pour chaque numéro :
  1. Essai 1 : format **avec `01`** → `22901XXXXXXXX`
  2. Essai 2 (si KO) : format **sans `01`** → `229XXXXXXXX`
  3. Le format gagnant est mémorisé dans `wa_contacts.phone_e164` et `is_whatsapp = true/false`, `last_validated_at = now()`.
- Badge couleur dans la liste de contacts :
  - 🟢 Vert "WhatsApp ✓"
  - 🔴 Rouge "Pas sur WhatsApp"
  - ⚪ Gris "Non vérifié"
- Au lancement d'une campagne : alerte si des contacts ne sont pas vérifiés, avec un bouton "Vérifier maintenant" (batch en arrière-plan).

## 2. Suivi des statuts d'envoi (✓ ✓✓ ✓✓ bleu)

- Nouvelle edge function `whatsapp-waha-webhook` (publique, `verify_jwt = false`) qui reçoit les events WAHA : `message.ack` (sent / delivered / read), `message.failed`, `message.reply`.
- Mapping ACK WAHA → colonnes de `wa_send_jobs` :
  - `ACK_SENT` → `sent_at` + status `sent` → icône ✓ gris
  - `ACK_DEVICE`/`DELIVERED` → `delivered_at` + status `delivered` → ✓✓ gris
  - `ACK_READ` → `read_at` + status `read` → **✓✓ bleu**
  - `ACK_REPLIED` ou message entrant matchant → `replied_at` → 💬 bleu
  - `failed` → `last_error` + status `failed`
- L'URL du webhook est ajoutée automatiquement à la session WAHA via `waouh-waha-control` (event `session.create` / `session.update`).
- Realtime Supabase sur `wa_send_jobs` pour rafraîchir la vue campagne sans rechargement.

## 3. Dashboard campagne (nouvelle vue détaillée)

Remplace la simple ligne de campagne par une **Card cliquable** qui ouvre un dialog plein écran `CampaignDetailsDialog.tsx` avec 4 onglets :

### Onglet "Vue d'ensemble"
KPIs en cartes colorées :
- 👥 Cibles : N
- 📤 Envoyés : N (%)
- ✓✓ Livrés : N (%)
- 👁️ Lus : N (%) ← compteur bleu
- 💬 Répondus : N
- ❌ Erreurs : N (avec bouton "Tout relancer")

Graphique progression dans le temps (recharts, ligne envois/livrés/lus).

### Onglet "Destinataires"
Tableau dynamique des `wa_send_jobs` :
| Numéro | Nom | Statut visuel | Heure d'envoi | Heure de lecture | Erreur | Actions |

Statut visuel = jeu d'icônes WhatsApp natives :
- ⏳ En attente · ✓ Envoyé · ✓✓ Livré · **✓✓ bleu** Lu · 💬 Répondu · ❌ Échec

Actions par ligne : **Relancer**, **Voir la réponse**, **Voir conversation** (si message entrant reçu).

### Onglet "Aperçu / Simulation"
Reprend `WhatsAppCampaignPreview` existant en mode "mockup téléphone" :
- Bulle WhatsApp avec le rendu réel du message (texte + média)
- Variantes IA défilantes si activées
- Bandeau "Aperçu chez le destinataire"

### Onglet "Erreurs"
Liste regroupée par type d'erreur (`number_not_on_whatsapp`, `rate_limited`, `session_disconnected`, etc.) avec :
- Message clair en français
- Suggestion de correction
- Bouton **"Réessayer ces N envois"** → remet `status = queued`, `attempt += 1`, `scheduled_at = now()`

## 4. Actions sur la carte campagne

Menu contextuel sur chaque campagne dans la liste :
- 👁️ **Voir** → ouvre le dialog ci-dessus
- ✏️ **Modifier** → réouvre le wizard (uniquement si `status in ('draft','scheduled')`)
- 📋 **Dupliquer**
- ⏸️ **Mettre en pause** / ▶️ Reprendre (modifie status + arrête le worker)
- 🔁 **Relancer les échecs**
- 🗑️ **Supprimer** (confirmation, cascade sur `wa_send_jobs`)

## 5. Hook & realtime

Nouveau hook `useCampaignDetails(campaignId)` :
- Charge la campagne + tous ses `wa_send_jobs` (+ jointure `wa_contacts` pour nom)
- Abonnement realtime `postgres_changes` sur `wa_send_jobs` filtré par `campaign_id`
- Calcule les stats dérivées (counts par statut, %)
- Expose `retryFailed()`, `retryOne(jobId)`, `pause()`, `resume()`, `remove()`

---

## Détails techniques

**Nouvelles tables / colonnes** : aucune. `wa_contacts.is_whatsapp` et `wa_send_jobs` existent déjà.

**Nouvelles edge functions** :
- `whatsapp-check-numbers` (POST, JWT requis) — input `{ contactIds[] }`, output `{ checked, onWhatsApp, notOnWhatsApp }`.
- `whatsapp-waha-webhook` (POST, public) — reçoit les ACK et update `wa_send_jobs`.

**Edge functions modifiées** :
- `waouh-waha-control` : auto-enregistrer le webhook ACK à la création de session.
- `whatsapp-diffusion-worker` : sur succès, stocker `waha_message_id` (déjà prévu), sur échec stocker un `error_code` machine-friendly.

**Nouveaux composants** :
- `src/components/whatsapp/CampaignDetailsDialog.tsx` (4 onglets)
- `src/components/whatsapp/CampaignSendStatus.tsx` (jeu d'icônes ✓ ✓✓ ✓✓-bleu)
- `src/components/whatsapp/CampaignSimulator.tsx` (mockup téléphone)
- `src/components/whatsapp/ContactsWhatsAppCheck.tsx` (badge + bouton vérifier)

**Composants modifiés** :
- `WhatsAppDiffusionV2.tsx` : carte campagne enrichie + menu actions.
- `WhatsAppCampaignPreview.tsx` : réutilisé dans l'onglet Aperçu.

**Hooks** :
- `src/hooks/useCampaignDetails.ts` (nouveau)
- `src/hooks/useWaDiffusion.ts` : ajout de `retryFailed`, `pauseCampaign`, `resumeCampaign`, `deleteCampaign`, `verifyContacts`.

**Secret requis** : `WAHA_WEBHOOK_TOKEN` (signature partagée pour valider que le webhook vient bien de WAHA).

---

## Livraison en 3 étapes

1. **Backend & vérification** — edge function `whatsapp-check-numbers`, webhook ACK, mise à jour de `waouh-waha-control` pour enregistrer le webhook.
2. **UI Détails campagne** — dialog 4 onglets, hook realtime, icônes de statut WhatsApp natives.
3. **Actions intelligentes** — relance erreurs, pause/reprise, édition, duplication, suppression, simulation chez le destinataire.
