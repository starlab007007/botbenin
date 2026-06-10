## Objectif

Garantir que **Radar IA** et **Campagnes Radar** fonctionnent vraiment en preview + production, prouvés par tests end-to-end.

## Diagnostic (faits constatés)

| Élément | État |
|---|---|
| Normalisation E.164 (32 contacts, 0 invalide) | OK |
| Fonctions Postgres (`normalize_benin_phone`, `merge_radar_contacts_duplicates`, `waouh_enqueue_outbound_v2`, `has_role`) | OK |
| Cron `radar-campaign-tick */5 * * * *` | Actif |
| UI `RadarCampaignsTab` montée sur `/admin/waouh/whatsapp-ops` | OK |
| Edge function `waouh-radar-campaign-manager` déployée | **NON (404)** |
| Edge function `waouh-radar-campaign-tick` déployée | **NON (404)** |
| Campagnes en base | 0 (aucun test possible) |

Conséquence: l'UI affiche `Failed to send a request to the Edge Function` et le cron tape dans le vide depuis l'activation.

## Bugs identifiés

- **B1 (bloquant)**: les 2 nouvelles edge functions ne sont pas déployées.
- **B2**: aucune campagne seed, impossible de valider le flow.
- **B3**: `preview_segment` exécute la query 2× au lieu de réutiliser le builder.
- **B4**: `normalize_diagnostic` swallow l'erreur de la RPC et retourne `[]` toujours.
- **B5**: dans `tick`, `await (await resolveSegment())` masque les erreurs PostgREST.
- **B6**: si segment vide, le run n'est jamais marqué `finished_at` → métriques tronquées.

## Plan d'action

1. **Déployer** `waouh-radar-campaign-manager` + `waouh-radar-campaign-tick`.
2. **Corriger** les 4 bugs B3-B6 (modifications locales, pas de breaking change).
3. **Smoke tests** via `supabase--curl_edge_functions`:
   - `manager action=list` → 200
   - `manager action=normalize_diagnostic` → 200, `invalid=0`
   - `manager action=preview_segment {segment:{}}` → 200, `count≈32`
   - `manager action=create` (seed) → 200
   - `manager action=run_now` sur la seed → 200
   - `tick {}` → 200, `processed[].sent ≥ 1`
4. **Vérifs DB** après tick:
   - `waouh_radar_campaign_runs.finished_at IS NOT NULL`
   - `waouh_radar_campaign_sends.status='sent'`
   - `waouh_outbound_queue` nouvelles entrées avec `dedupe_key='radar_campaign:...'`
5. **Seed** une campagne « TEST Radar IA » en statut **`draft`** par défaut (template: `Bonjour {{display_name}}, test Radar IA`, schedule `one_shot`).
6. **Rapport** dans le chat: tableau ✅/❌ des 6 checks + liens vers les logs.

## Détails techniques

- Outils: `supabase--deploy_edge_functions`, `supabase--curl_edge_functions`, `supabase--read_query`.
- Aucune migration SQL nécessaire.
- Aucun secret nouveau (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` déjà présents).
- Rollback: `UPDATE cron.job SET active=false WHERE jobname='radar-campaign-tick'` si le tick boucle en erreur.

## Question préalable

Campagne seed en **`draft`** (sécurisé, à activer manuellement) ou **`active`** (envoi immédiat aux 32 contacts normalisés)?
