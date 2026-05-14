# Sprint 3 — Finalisation WAOUH : Paiement Qosic + Radar IA Vendeurs/Acheteurs

## Partie A — Qosic (paiement Mobile Money escrow)

Objectif : finaliser le flow paiement déclenché depuis la `WaouhTransactionCard` (bouton "💳 Payer maintenant").

### A.1 Edge function `waouh-payment-init`
- Input : `{ transaction_id, msisdn, operator: 'mtn'|'moov' }` + JWT user.
- Vérifie `waouh_transactions.buyer_id = auth.uid()` et `status = pending`.
- Appelle Qosic `/QosicBridge/user/requestpayment` (HTTPS, ref ≤ 19 chars — réutilise la mémoire `qosic-payment-fixes`).
- Insère `waouh_payments` (status `initiated`, `qosic_transref`).
- Lance polling côté client (10s × 18 tentatives — pattern `payment-status-verification`).

### A.2 Edge function `waouh-payment-status`
- Input : `{ transaction_id }`.
- Appelle Qosic `/transactionStatus`, mappe `00 → success`, `01/02 → pending`, autre → `failed`.
- Si `success` :
  - `waouh_transactions.status = paid` (escrow), `paid_at = now()`.
  - Trigger `waouh_log_tx_status` push automatique l'entrée `status_history`.
  - Insère message système dans le chat : "✅ Paiement reçu. Fonds bloqués en escrow."
- Si `failed` : `status = pending` + message "❌ Paiement échoué, réessayez."

### A.3 Edge function `waouh-payment-release`
- Déclenché quand l'acheteur clique "✅ J'ai reçu mon article" dans `WaouhTransactionCard`.
- Appelle Qosic `/depositpayment` vers le MSISDN du vendeur.
- `status = released`, message système, notification vendeur.

### A.4 Frontend
- `WaouhPaymentDialog.tsx` (nouveau) : input MSISDN + select opérateur, bouton Payer, spinner pendant polling, toasts succès/échec.
- `WaouhTransactionCard` : 3 actions selon statut (Payer / J'ai reçu / Litige).
- `WaouhAuthGate` reste devant si user non connecté.

### A.5 Secrets
Vérifier présence : `QOSIC_USERNAME`, `QOSIC_PASSWORD`, `QOSIC_CLIENTID_MTN`, `QOSIC_CLIENTID_MOOV`. Demander via `add_secret` si manquants.

---

## Partie B — SerpAPI (sourcing public)

Objectif : moissonner périodiquement les annonces publiques pour enrichir l'inventaire WAOUH et déclencher des matchs acheteurs.

### B.1 Edge function `waouh-serpapi-scout` (cron 6h)
- Pour chaque catégorie active (smartphone, vehicule, electromenager…) :
  - Query SerpAPI Google : `"à vendre" {category} site:jumia.com.bj OR site:expat.com OR site:tonaton.com OR site:jiji.bj OR site:cocolib.com`.
  - Filtre `tbs=qdr:w` (7 derniers jours).
- Pour chaque résultat :
  - Extraction IA (Gemini 2.5 Flash, JSON) : `{title, price_fcfa, condition, city, seller_contact, source_url}`.
  - Déduplication par `source_url` (nouvelle table `waouh_external_listings`).
  - Insert si nouveau, lien optionnel vers `waouh_articles` (status `external`).
- Trigger `waouh-notify-buyers` sur chaque insert.

### B.2 Migration DB
```sql
create table waouh_external_listings (
  id uuid pk, source text, source_url text unique, title text,
  price numeric, currency text default 'XOF', city text, condition text,
  seller_phone text, seller_name text, raw_html text, scraped_at timestamptz,
  matched_buyer_ids uuid[], status text default 'new'
);
```

### B.3 Secret
`SERPAPI_KEY` via `add_secret`.

---

## Partie C — Radar IA Vendeurs/Acheteurs (innovation)

Objectif : détecter en temps réel ou J-7 les vendeurs/acheteurs partout (sites, Facebook, groupes Facebook, WhatsApp, groupes WhatsApp) et constituer des profils IA notifiables.

### C.1 Architecture multi-source

```text
┌──────────────────────────────────────────────────────────┐
│  SOURCES                          COLLECTEUR              │
├──────────────────────────────────────────────────────────┤
│  Sites BJ (jumia, jiji,           waouh-serpapi-scout    │
│  tonaton, cocolib, expat)         (Partie B)              │
│                                                            │
│  Facebook Marketplace BJ          waouh-fb-scout          │
│  + Pages publiques                (Apify actor            │
│                                    facebook-marketplace)  │
│                                                            │
│  Groupes Facebook publics         waouh-fb-groups-scout   │
│  ("Vente Cotonou", etc.)          (Apify facebook-groups) │
│                                                            │
│  WhatsApp groupes opt-in          WAHA bot membre du      │
│  (l'admin invite @WaouhBot)       groupe → webhook        │
│                                    waouh-whatsapp-radar   │
│                                                            │
│  Telegram canaux BJ               Bot membre + getUpdates │
│                                                            │
│  Numéros perso (opt-in            User active "partage    │
│  vendeur)                         conv WA" → forward IA   │
└──────────────────────────────────────────────────────────┘
                       ↓
            ┌────────────────────────┐
            │  IA EXTRACTOR          │
            │  Gemini 2.5 Flash      │
            │  → {intent: SELL|BUY,  │
            │     product, price,    │
            │     city, contact,     │
            │     confidence}        │
            └────────────────────────┘
                       ↓
            ┌────────────────────────┐
            │  PROFIL IA             │
            │  waouh_radar_profiles  │
            │  + scoring fiabilité   │
            └────────────────────────┘
                       ↓
            ┌────────────────────────┐
            │  MATCH ENGINE          │
            │  pgvector + règles     │
            │  prix/ville/cat        │
            └────────────────────────┘
                       ↓
            ┌────────────────────────┐
            │  NOTIFY                │
            │  → Acheteur (WA/web)   │
            │  → Vendeur (WA/web)    │
            │  Message pré-rédigé IA │
            │  + lien chat WAOUH     │
            └────────────────────────┘
```

### C.2 Tables nouvelles

- `waouh_radar_sources` : `{id, type: 'site'|'fb_page'|'fb_group'|'wa_group'|'telegram', identifier, label, active, last_scan_at, scan_freq_min}`.
- `waouh_radar_signals` : `{id, source_id, raw_text, raw_url, captured_at, intent, product_jsonb, price, city, contact_phone, contact_handle, confidence, embedding vector(384), status}`.
- `waouh_radar_profiles` : `{id, contact_phone, contact_handle, role: 'seller'|'buyer'|'both', categories text[], avg_price_range, cities text[], signals_count, reliability_score (0-1), last_seen_at, opt_in bool}`.
- `waouh_radar_matches` : `{id, signal_id, target_user_id, score, notified_at, response}`.

### C.3 Edge functions

1. `waouh-radar-fb-marketplace` (cron 30 min) — Apify actor `apify/facebook-marketplace-scraper` filtré Bénin.
2. `waouh-radar-fb-groups` (cron 1h) — actor `apify/facebook-groups-scraper` sur liste de groupes publics.
3. `waouh-radar-wa-ingest` (webhook WAHA) — branche le bot WAOUH dans les groupes WA opt-in, parse chaque message.
4. `waouh-radar-extract` (queue) — pour chaque signal brut → IA extraction + embedding (`text-embedding-004`).
5. `waouh-radar-match` (trigger insert) — recherche profils opposés (BUY ↔ SELL) via similarité cosinus + filtres prix/ville.
6. `waouh-radar-notify` — envoie message WhatsApp pré-rédigé OU notif web realtime.

### C.4 Frontend (admin)

- Page `/admin/waouh/radar` :
  - Tableau sources (add/pause/scan now).
  - Feed live des signaux (realtime supabase) avec badges intent / confidence.
  - Profils détectés + bouton "Inviter sur WAOUH" (envoie WA template).
  - Stats : signaux/jour, taux match, taux conversion.

### C.5 Conformité & opt-in

- WhatsApp : bot ajouté **uniquement** par admin de groupe (consentement). Footer message "Détecté par WAOUH IA — répondez STOP pour exclure".
- Facebook : seules pages/groupes **publics**, respect ToS Apify.
- RGPD-like : profils anonymisables sur demande, suppression via RPC `waouh_radar_forget(phone)`.

### C.6 Secrets nécessaires

`APIFY_TOKEN`, `SERPAPI_KEY` (déjà), `TELEGRAM_BOT_TOKEN` (optionnel). WAHA déjà configuré.

---

## Partie D — Critères de réussite

- [ ] Paiement Qosic end-to-end depuis la card chat → escrow → release, status_history complet.
- [ ] SerpAPI cron tourne, `waouh_external_listings` se remplit, acheteurs notifiés.
- [ ] Radar : au moins 3 sources actives (Marketplace, 1 groupe FB, 1 groupe WA), feed admin live.
- [ ] Match auto : un acheteur recevant une notif < 60s après détection d'une annonce compatible.
- [ ] Aucune fuite RLS, secrets stockés via `add_secret`.

---

## Partie E — Ordre d'exécution proposé

1. Migration DB (Qosic columns + radar tables + external_listings).
2. Secrets (`SERPAPI_KEY`, `APIFY_TOKEN`, vérif Qosic).
3. Edge functions Qosic (init/status/release) + UI `WaouhPaymentDialog`.
4. Edge function `waouh-serpapi-scout` + cron pg_cron.
5. Radar : tables + extract/match/notify + page admin.
6. Activation progressive sources (Marketplace → groupes FB → WA opt-in).

---

## Questions ouvertes (à confirmer avant build)

1. **Apify** : OK pour ajouter `APIFY_TOKEN` (sourcing Facebook) ? Sinon je limite Partie C à SerpAPI + WA bot.
2. **WhatsApp groupes** : on assume opt-in admin ? (sinon risque ban WAHA).
3. **Périmètre Sprint 3** : tout ci-dessus, ou seulement Qosic + SerpAPI + tables Radar (UI radar repoussée Sprint 4) ?
