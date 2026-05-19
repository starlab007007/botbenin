# Plan : Outils admin WhatsApp WAOUH

Quatre livrables coordonnés, partageant la même page admin `/admin/waouh-whatsapp-ops`.

## 1. Base de données

Nouvelle table `waouh_alert_config` (singleton, admin only) :
- `id`, `enabled` (bool), `window_minutes` (int, défaut 15)
- `threshold_422`, `threshold_429`, `threshold_5xx`, `threshold_global_pct`
- `webhook_url` (text), `webhook_secret` (text nullable)
- `last_alert_sent_at`, `cooldown_minutes` (défaut 30)

Nouvelle table `waouh_alert_history` : `id, created_at, severity, rule, payload jsonb, delivered bool, error`.

RLS : lecture/écriture admin uniquement via `has_role`.

## 2. Edge functions

- **`waouh-e2e-test`** : POST `{mode: "sim"|"live", seller_phone?, buyer_phone?}`. En `sim`, simule webhook entrant → router → paiement → confirmation, retourne un trace JSON étape par étape (sans appeler WAHA). En `live`, enchaîne les vrais payloads via les fonctions existantes avec les 2 numéros fournis.
- **`waouh-replay-notification`** : POST `{dedupe_key?, queue_id?, transaction_id?, event_type?}`. Marque les lignes existantes `failed` correspondantes comme `pending` avec `next_attempt_at = now()`, déclenche `waouh-outbound-dispatch`, retourne le résultat.
- **`waouh-alerts-check`** : invoquée par cron (toutes les 5 min). Compte les `failed` par code HTTP sur la fenêtre, compare aux seuils de `waouh_alert_config`, poste sur le webhook si dépassement (respecte cooldown), log dans `waouh_alert_history`.

## 3. UI Admin (page unique `/admin/waouh-whatsapp-ops`)

4 onglets :
- **Queue** : table `waouh_outbound_queue` filtrable (status, event_type, période). Stats en haut : pending / sending / sent / failed, retries moyens, oldest pending. Auto-refresh 10s.
- **Erreurs WAHA** : graphique barres par code HTTP (422/429/5xx/autres) sur 24h, table des `last_error` les plus fréquents avec `dedupe_key`.
- **Replay** : input dedupe_key OU transaction_id, bouton "Relancer", affiche l'historique du dispatch + nouveau résultat.
- **Tests & Alertes** : 
  - Bouton "Lancer E2E (simulation)" → affiche trace
  - Bouton "Lancer E2E (live)" avec 2 inputs numéros
  - Formulaire seuils + URL webhook + bouton "Tester le webhook"
  - Historique des alertes envoyées

Route protégée par `AdminRoute`.

## 4. Détails techniques

- Format webhook (POST JSON) :
```json
{
  "severity": "warning|critical",
  "rule": "5xx_threshold",
  "count": 8,
  "window_minutes": 15,
  "samples": [{"dedupe_key": "...", "last_error": "...", "status": 500}]
}
```
- Compatible n8n/WhatsApp/Telegram via leur webhook entrant.
- Cron pg_cron toutes les 5 min appelle `waouh-alerts-check`.
- Rapport E2E : retourné en JSON + bouton "Télécharger MD" côté UI.

## Fichiers à créer

- Migration `waouh_alert_config`, `waouh_alert_history`, cron
- `supabase/functions/waouh-e2e-test/index.ts`
- `supabase/functions/waouh-replay-notification/index.ts`
- `supabase/functions/waouh-alerts-check/index.ts`
- `src/pages/admin/WaouhWhatsAppOpsPage.tsx` + composants onglets
- Route dans le router admin

Aucun fichier existant n'est cassé ; tout est additif.
