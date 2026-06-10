
## Contexte

Aujourd'hui, dès qu'un signal Radar IA est capté, `supabase/functions/waouh-radar-process` envoie immédiatement un `radar_buyer_outreach` ou `radar_seller_outreach` sur WhatsApp, **sans** vérifier :
- le flag `auto_notify` du contact (déjà présent en base mais ignoré),
- le statut `opted_out` / `blocked`,
- une éventuelle plage horaire ou un quota,
- un kill-switch global admin.

Les campagnes programmées (`waouh_radar_campaigns`) ont déjà un statut active/paused/done contrôlable depuis `RadarCampaignsTab`. Ce qui manque, c'est le **contrôle des outreach automatiques 1-shot** déclenchés par signal, et un **panneau central** pour piloter tous les contacts Radar.

## Objectif

Donner à l'admin un contrôle complet sur les messages auto envoyés aux numéros détectés par Radar IA :
- couper / reprendre globalement,
- programmer les plages d'envoi,
- limiter par jour,
- pause / opt-out par contact (bulk).

## Changements

### 1. Base de données (migration)
Nouvelle table `waouh_radar_auto_settings` (ligne unique, admin only) :
- `auto_enabled` (bool, défaut true) — kill-switch global
- `auto_default_for_new_contacts` (bool, défaut true)
- `quiet_hours_start` / `quiet_hours_end` (time, ex 22:00 / 07:00) — pas d'envoi hors plage
- `timezone` (text, défaut `Africa/Porto-Novo`)
- `max_per_contact_per_day` (int, défaut 1)
- `max_total_per_day` (int, défaut 200)
- `pause_until` (timestamptz nullable) — pause temporaire
- `updated_by`, `updated_at`

RLS : SELECT/UPDATE réservé aux admins via `has_role`.

Aucune autre table modifiée — `waouh_radar_contacts.auto_notify` et `status` existent déjà.

### 2. Edge function — `waouh-radar-process`
Avant chaque outreach automatique (`maybeDirectOutreach`) :
1. Charger `waouh_radar_auto_settings` (cache 30 s).
2. Bloquer si `auto_enabled = false` ou `pause_until > now()`.
3. Charger le contact via `phone_e164_normalized` :
   - skip si `status ∈ {opted_out, blocked}` ou `auto_notify = false`.
4. Vérifier les caps (compte sur `waouh_outbound_queue` / `waouh_radar_campaign_sends` filtré `event_type LIKE 'radar_auto_%'` sur 24 h).
5. Si on est hors `quiet_hours`, **planifier** au lieu d'envoyer : insérer dans `waouh_outbound_queue` avec `scheduled_at` = prochain créneau autorisé (le dispatcher existant gère déjà `scheduled_at`).
6. Logger un `radar_auto_block` ou `radar_auto_schedule` dans `waouh_trace_events` pour traçabilité.

Aucune modification du flux WAOUH locké.

### 3. Edge function — `waouh-radar-auto-control` (nouvelle)
Endpoint admin pour :
- `get_settings`, `update_settings`
- `pause_now { minutes }` / `resume_now`
- `bulk_contacts { ids, action: enable_auto | disable_auto | opt_out | block | unblock }`
- `cancel_scheduled { contact_ids? }` — purge des messages auto en file (`status='queued'`, `event_type LIKE 'radar_auto_%'`).

Tout protégé par `has_role(admin)`.

### 4. UI — `src/components/admin/RadarAutoControlPanel.tsx` (nouveau)
Panneau en haut de l'onglet Radar (admin) avec :
- Switch « Messages auto Radar IA » (kill-switch).
- Bouton « Pause 1h / 24h / Indéfinie » + bouton « Reprendre ».
- Heures silencieuses (deux time pickers) + timezone.
- Caps : `max/contact/jour`, `max total/jour`.
- Toggle « Activer auto par défaut pour les nouveaux contacts ».
- Compteur live : envoyés aujourd'hui, planifiés en file, bloqués (opt-out).
- Bouton « Annuler tous les messages auto programmés ».

### 5. UI — `RadarContactsTab.tsx` (étendue)
Ajouter aux actions bulk existantes :
- « Activer auto-notify » / « Désactiver auto-notify » (sur la sélection).
- « Voir messages auto planifiés » → ouvre une modale listant les entrées `waouh_outbound_queue` à venir pour les contacts sélectionnés, avec bouton « Annuler ».

Aucun changement aux modales / colonnes existantes.

### 6. Intégration
Monter `RadarAutoControlPanel` dans `WaouhRadarTab.tsx` (au-dessus des sous-onglets) — visible uniquement aux admins (déjà gating en place via route admin).

## Hors scope
- Aucune modification du WAOUH chat sync flow (locké v1).
- Aucune modification du dispatcher `waouh-notify-dispatch` au-delà du respect natif de `scheduled_at`.
- Pas de refonte de `RadarCampaignsTab` (campagnes programmées déjà contrôlables).

## Détails techniques
```text
Signal capté
  └─> waouh-radar-process
        ├─ load(auto_settings) [cache 30s]
        ├─ if !auto_enabled OR pause_until>now -> trace 'radar_auto_block(global)'  → STOP
        ├─ load(contact by phone)
        │     ├─ status in (opted_out, blocked) -> trace 'radar_auto_block(status)' → STOP
        │     └─ auto_notify=false               -> trace 'radar_auto_block(per_contact)' → STOP
        ├─ caps depassés -> trace 'radar_auto_block(cap)' → STOP
        ├─ in quiet_hours -> enqueue (scheduled_at=next_window) + trace 'radar_auto_schedule'
        └─ else -> enqueue immediate + trace 'radar_auto_send'
```

Helpers UI : Tanstack Query pour `get_settings` + invalidations après chaque mutation. Tout en français, tokens design existants.
