# Plan : Automatisation totale WAOUH (Radar → Annonces → Matching → Notifications → Négociation chat)

## Objectif
Zéro intervention manuelle. Tout passe par le chat (web/WhatsApp). Les signaux Radar (SerpAPI, Apify Facebook, WhatsApp groupes) alimentent automatiquement la base unifiée d'annonces et de demandes acheteurs, déclenchent matching + notifications WhatsApp aux deux parties, et la négociation/paiement se poursuit en chat.

---

## 1. Base de données — extensions et automatisations

### 1.1 Triggers d'auto-promotion (cœur de l'automatisation)
- **`trg_radar_signal_autopromote`** sur `waouh_radar_signals` AFTER INSERT/UPDATE quand `status = 'extracted'` :
  - Si `intent = 'SELL'` + qualité minimale (titre OU catégorie + (prix OU contact)) → appelle `waouh_promote_signal()` qui crée une `waouh_articles` avec `origin = source_type`, `origin_signal_id`, `seller_id` lié via `waouh_radar_profiles.waouh_user_id`.
  - Si `intent = 'BUY'` → crée `waouh_buyer_profiles` actif.
  - Met `signal.status = 'promoted'` et stocke `promoted_article_id` / `promoted_buyer_profile_id`.
- **`trg_radar_signal_automatch`** AFTER UPDATE → `status = 'promoted'` :
  - Appelle `waouh_match_signal()` qui croise contre `waouh_unified_offers` / `waouh_unified_demands` et insère dans `waouh_radar_matches` (score ≥ 0.5).
- **`trg_radar_match_autonotify`** AFTER INSERT sur `waouh_radar_matches` :
  - Insère dans `waouh_notifications` (in_app)
  - Insère dans nouvelle table `waouh_outbound_queue` (canal `whatsapp`) un message pour acheteur ET vendeur si numéro disponible.

### 1.2 Nouvelle table `waouh_outbound_queue`
Champs : `id`, `to_phone`, `to_user_id`, `channel` (whatsapp|web), `template` (match_buyer|match_seller|negotiation_open), `payload jsonb`, `status` (pending|sent|failed), `attempts`, `sent_at`, `error`, `created_at`. RLS admin only.

### 1.3 Nouvelle table `waouh_negotiations`
Suit chaque conversation acheteur↔vendeur initiée par un match : `id`, `match_id`, `article_id`, `buyer_user_id`, `seller_user_id`, `state` (proposed|countered|accepted|paid|closed), `last_offer_price`, `last_actor`, `transaction_id`, timestamps. RLS : participants seulement.

### 1.4 Nouveaux triggers utilitaires
- Auto-création `waouh_users` à partir de `waouh_radar_signals.contact_phone` (déjà partiel via `waouh_radar_profiles`) — étendre pour qu'un signal sans profil crée quand même l'user.
- `updated_at` triggers standards.

### 1.5 Cron pg_cron (toutes les 5 min)
- `waouh-radar-tick` : appelle séquentiellement edge functions `waouh-serpapi-scout`, `waouh-radar-apify`, `waouh-radar-process` (re-traite signaux `extracted` orphelins en backup des triggers), `waouh-outbound-dispatch`.

---

## 2. Edge functions — pipeline automatisé

### 2.1 Modifications existantes
- **`waouh-serpapi-scout`** et **`waouh-radar-apify`** : à la fin, **PAS** d'appel manuel — les triggers SQL prennent le relais. Ajout d'un `status='extracted'` propre + qualité (filtrer junk).
- **`waouh-radar-process`** : devient un **fallback batch** (lance promote + match pour signaux `extracted` non encore traités, en cas de trigger raté). Reste idempotent.
- **`waouh-radar-wa-webhook`** : signaux WhatsApp groupes opt-in → insère `waouh_radar_signals` + ouvre une session si l'expéditeur veut acheter/vendre directement.

### 2.2 Nouvelles edge functions

**`waouh-outbound-dispatch`** (cron 5 min + trigger HTTP)
- Lit `waouh_outbound_queue` status='pending', limite 50.
- Pour chaque item : compose le texte (template fr) et envoie via WAHA `sendText`. Marque sent/failed avec backoff (3 tentatives).
- Templates :
  - `match_buyer` : « 🎯 On a trouvé : {titre} — {prix} FCFA à {ville}. Réponds OUI pour contacter le vendeur, ou propose ton prix. »
  - `match_seller` : « 📩 Un acheteur cherche {catégorie} ({budget}). Réponds OUI pour qu'on le mette en relation. »
  - `negotiation_open` : envoie au vendeur le contact acheteur masqué + price proposé.

**`waouh-negotiation-router`** (appelée depuis `waouh-channel-in` quand l'utilisateur répond OUI / propose un prix)
- Détecte intent `negotiate` via Gemini sur message libre.
- Crée/MAJ `waouh_negotiations`, transmet la contre-offre au vendeur via WhatsApp, idem côté acheteur jusqu'à `accepted`.
- À l'acceptation : appelle `waouh-payment` (Qosic) pour générer demande paiement, envoie le lien aux deux parties.

### 2.3 Modification `waouh-channel-in`
- Si message entrant correspond à un `waouh_negotiations` ouvert → route vers `waouh-negotiation-router`.
- Sinon flow normal (intent SELL/BUY/SEARCH).
- Tous les SELL/BUY déjà traités côté chat alimentent `waouh_articles` / `waouh_buyer_profiles` avec `origin = 'chat'` (déjà le cas), donc partagent la même base que Radar.

---

## 3. Admin `/admin/waouh` — visualisation read-only de l'auto

L'admin n'agit plus manuellement (boutons « Promouvoir » et « Matcher » deviennent **optionnels secours**). Ajouts :
- **Onglet « Pipeline »** : graphe Signaux → Promus → Matchés → Notifiés → Négociations → Payés (KPIs 24h).
- **Onglet « File d'envoi »** (`waouh_outbound_queue`) : statut, retry manuel.
- **Onglet « Négociations »** : liste live des `waouh_negotiations` avec état.
- Conserver onglets Annonces / Acheteurs / Radar avec filtre `origin`.

---

## 4. Sécurité & qualité

- Anti-doublons : unique partial index `waouh_articles(origin_signal_id) WHERE origin_signal_id IS NOT NULL`.
- Opt-in WhatsApp : ne contacter un numéro que si présent dans `waouh_radar_profiles.opt_in = true` OU déjà `waouh_users` actif. Sinon le signal reste promu en annonce mais pas de message sortant.
- Rate-limit WAHA : max 1 message / numéro / 30 s côté `waouh-outbound-dispatch`.
- Logs : table `waouh_pipeline_events` (signal_id, step, status, error) pour debug.

---

## 5. Détails techniques

### Fichiers
- **Migration** : `supabase/migrations/<ts>_waouh_full_automation.sql` (triggers, tables, cron, RPC update).
- **Edge functions nouvelles** : `waouh-outbound-dispatch/`, `waouh-negotiation-router/`.
- **Edge functions modifiées** : `waouh-serpapi-scout`, `waouh-radar-apify`, `waouh-radar-process`, `waouh-channel-in`, `waouh-radar-wa-webhook`.
- **Frontend** : `src/pages/waouh/WaouhPage.tsx` (+ 2 nouveaux tabs `WaouhPipelineTab.tsx`, `WaouhOutboundTab.tsx`, `WaouhNegotiationsTab.tsx`).

### RPC mises à jour
- `waouh_promote_signal(p_signal_id)` : étend pour fixer `seller_id`/`user_id` via `waouh_radar_profiles → waouh_users`, créer user si absent.
- `waouh_match_signal(p_signal_id)` : retourne tableau de matches insérés.
- Nouvelle `waouh_enqueue_outbound(p_to_phone, p_template, p_payload)` SECURITY DEFINER.

### Cron
```sql
select cron.schedule('waouh-radar-tick', '*/5 * * * *',
  $$ select net.http_post(
       url:='https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-radar-process',
       headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE>"}'::jsonb,
       body:='{}'::jsonb) $$);
```
(idem pour `waouh-outbound-dispatch`, `waouh-serpapi-scout`, `waouh-radar-apify`)

### Secrets requis (déjà présents normalement)
`SERPAPI_KEY`, `APIFY_TOKEN`, `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, `LOVABLE_API_KEY`, `QOSIC_*`. À vérifier au moment de l'implémentation.

---

## Résultat attendu
Un signal capté (SerpAPI / Apify Facebook / WA groupe / chat) → en < 5 min : annonce ou demande créée, matchée, acheteur **et** vendeur reçoivent un WhatsApp, peuvent négocier en répondant simplement, et le paiement Qosic se déclenche à l'accord. Admin = supervision uniquement.