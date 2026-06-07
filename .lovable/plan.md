# Plan — Config Radar API + Contacts Radar IA dans WhatsApp Ops

## 1. Paramétrage SerpAPI / Apify dans `/admin/waouh` (onglet Radar)

### Objectif
Permettre à l'admin de définir, modifier, activer/désactiver et tester les clés/API SerpAPI et Apify depuis l'UI, sans toucher aux secrets Supabase.

### Stockage
Nouvelle table `waouh_radar_api_configs` (RLS admin uniquement) :
- `provider` (`serpapi` | `apify`)
- `api_key` (chiffré côté usage edge function — stocké en clair en DB protégé par RLS admin, comme `waouh_settings`)
- `active` (bool)
- `extra_config` jsonb (ex: pays, langue, actor overrides, quota max/jour)
- `daily_quota`, `usage_today`, `usage_reset_at`
- `last_test_at`, `last_test_status`, `last_test_message`
- `updated_by`, `updated_at`

### Edge functions
- **`waouh-radar-api-config`** (admin-only via `has_role admin`) : `list / upsert / toggle / delete / test`.
  - Action `test` : appelle SerpAPI (`/search.json?q=test`) ou Apify (`/v2/users/me`) avec la clé fournie et retourne statut + latence + crédit restant si dispo.
- Modifier `waouh-serpapi-scout` et `waouh-radar-apify` :
  - Charger la clé depuis `waouh_radar_api_configs` (provider correspondant, `active=true`) en priorité, fallback sur `Deno.env.get`.
  - Refuser l'exécution si `active=false` ou quota dépassé.
  - Incrémenter `usage_today` à chaque appel.

### UI
Dans `WaouhRadarTab.tsx`, ajouter une section haut de page **« Configuration API »** :
- Deux cartes (SerpAPI, Apify) avec : input masqué `api_key` (toggle show), switch `active`, input `daily_quota`, badge état (OK / KO / quota), bouton **Tester**, bouton **Sauvegarder**.
- Affichage `usage_today / daily_quota` + dernier test (date + message).
- Mécanisme de contrôle : bandeau d'alerte si quota > 80%, blocage UI si `active=false` mais source FB liée existe.

## 2. Contacts Radar IA dans `/admin/waouh/whatsapp-ops`

### Objectif
Voir les contacts collectés via Radar IA (`waouh_radar_signals.contact_phone` + `waouh_external_listings.seller_phone`), les rendre exploitables pour l'envoi d'annonces / notifications.

### Stockage
Nouvelle table `waouh_radar_contacts` (agrégation matérialisée) :
- `phone_e164` (unique)
- `display_name`, `source` (`serpapi` | `apify_fb_marketplace` | `apify_fb_group`)
- `first_seen_at`, `last_seen_at`, `signal_count`
- `categories[]`, `cities[]` (déduits des signaux liés)
- `intent_buy_count`, `intent_sell_count`
- `status` (`new` | `available` | `opted_in` | `opted_out` | `blocked`)
- `auto_notify` (bool) — éligible aux envois automatiques
- `tags[]`, `last_message_at`, `notes`

### Edge functions
- **`waouh-radar-contacts-sync`** (cron + manuel) : agrège `waouh_radar_signals` + `waouh_external_listings` → upsert dans `waouh_radar_contacts`, normalise via `normalizeBeninPhone`, met à jour stats.
- **`waouh-radar-contacts-notify`** : payload `{ contact_ids[], template, article_id?, mode: 'buyer'|'seller'|'announcement' }` → file dans `waouh_outbound_queue` via `pushSyncedEvent` (réutilise le flux unifié WhatsApp). Respecte `status != opted_out|blocked`.

### UI — nouvel onglet « Contacts Radar » dans `WaouhWhatsAppOpsPage`
- Table : téléphone, nom, source (badge), catégories, ville, signaux, dernier vu, statut, auto_notify.
- Filtres : source, statut, intention (buy/sell), catégorie, ville, plage de dates.
- Actions ligne : voir détails (signaux liés + listings), changer statut, toggle `auto_notify`, **Envoyer message** (modal : choisir template + article optionnel + canal acheteur/vendeur/annonce).
- Actions bulk : sélection multiple → envoi groupé, export CSV, marquer opted_in / opted_out.
- Bouton **Re-sync depuis signaux** (appelle `waouh-radar-contacts-sync`).
- Bandeau de contrôle : compteur disponibles vs opt-out, quota d'envoi du jour.

## Détails techniques

### Migrations
1. `waouh_radar_api_configs` + GRANTs + RLS (admin only via `has_role`).
2. `waouh_radar_contacts` + GRANTs + RLS (admin only) + index unique sur `phone_e164` + trigger updated_at.

### Edge functions touchées / créées
- ✏️ `waouh-serpapi-scout` (lecture config DB + quota)
- ✏️ `waouh-radar-apify` (lecture config DB + quota)
- 🆕 `waouh-radar-api-config` (CRUD + test)
- 🆕 `waouh-radar-contacts-sync`
- 🆕 `waouh-radar-contacts-notify` (réutilise `pushSyncedEvent` du `_shared/waouh-sync.ts`)

### Frontend
- ✏️ `src/components/waouh/WaouhRadarTab.tsx` — ajout section Config API
- 🆕 `src/components/admin/waouh/RadarContactsTab.tsx`
- ✏️ `src/pages/admin/WaouhWhatsAppOpsPage.tsx` — nouvel onglet "Contacts Radar"

### Hors scope
- Pas de changement au flux `pushSyncedEvent` existant (réutilisé tel quel).
- Pas de modification du chat web / WaouhMatchChatWindow.
- Pas de rotation automatique de clés (manuel via UI).

Confirme pour passer en build.
