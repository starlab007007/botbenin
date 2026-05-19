
# Waouh Partner + Restructuration Base de Données Unifiée

## Objectif
1. Créer le module **Waouh Partner** : recrutement de partenaires terrain qui enregistrent manuellement des entreprises locales (avec géoloc, contacts, Mobile Money, classification) et touchent une commission paramétrable sur chaque vente issue d'une entreprise qu'ils ont enrôlée.
2. **Restructurer** les 3 sources de données (Chat WhatsApp, Partner manuel, Radar IA) en une couche unifiée, robuste, scalable, avec priorité de recherche : **Partner > Chat > Radar**.

---

## Partie 1 — Module Waouh Partner

### 1.1 Tables principales (nouvelles)

- **`waouh_partners`** — profil partenaire
  - `user_id` (lien auth), `code_partenaire` (unique, ex. WP-001), `nom`, `telephone`, `whatsapp`, `email`, `ville`, `pays`, `mobile_money_number`, `mobile_money_operator` (MTN/Moov), `statut` (pending/active/suspended), `kyc_doc_url`, `niveau` (Bronze/Argent/Or selon volume), `date_activation`

- **`waouh_partner_businesses`** — entreprises enrôlées par un partenaire
  - `partner_id`, `nom_entreprise`, `categorie` (alimentation, mode, électronique, services…), `sous_categorie`, `description`, `adresse_complete`, `ville`, `quartier`, `lat`, `lng`, `geohash`, `telephone`, `whatsapp`, `mobile_money_number`, `mobile_money_operator`, `email`, `site_web`, `horaires` (jsonb), `langues_parlees` (array), `photo_principale`, `photos` (array), `tags` (array), `note_qualite` (1-5 par partenaire), `verifie_admin` (bool), `statut` (active/pause/blacklisted), `gerant_nom`, `gerant_role`

- **`waouh_partner_products`** — produits/services par entreprise
  - `business_id`, `partner_id`, `nom`, `description`, `categorie`, `prix_min`, `prix_max`, `devise` (FCFA), `unite`, `disponible` (bool), `stock_estime`, `photos` (array), `tags`, `embedding` (vector pour matching IA), `derniere_maj`

- **`waouh_commission_settings`** — paramètres admin
  - `id` (singleton), `commission_plateforme_pct` (ex. 5.0), `commission_partner_pct_sur_plateforme` (ex. 40% → 2% effectifs), `bonus_volume` (jsonb par paliers), `updated_by`, `updated_at`

- **`waouh_partner_sales`** — ventes attribuées à un partenaire
  - `partner_id`, `business_id`, `product_id`, `transaction_id` (FK `waouh_transactions`), `buyer_phone`, `montant_vente`, `commission_plateforme`, `commission_partner`, `statut` (pending/confirmed/paid), `source` (chat/manual/radar), `date_vente`, `date_paiement_commission`

- **`waouh_partner_payouts`** — versements de commissions
  - `partner_id`, `periode_debut`, `periode_fin`, `montant_total`, `nb_ventes`, `mobile_money_ref`, `statut` (pending/paid/failed), `paye_par` (admin user_id), `payment_proof_url`

### 1.2 Sécurité (RLS)
- Partner voit uniquement ses propres `businesses`, `products`, `sales`, `payouts`.
- Admin (`has_role(_,'admin')`) voit tout, gère commission settings, valide KYC, marque payouts.
- Public/Chat IA peut lire `partner_businesses` et `partner_products` en lecture seule pour le matching (via une vue `waouh_marketplace_unified`).

### 1.3 Pages frontend
- **`/partner/dashboard`** — KPI (entreprises, produits, ventes du mois, commission due, commission payée)
- **`/partner/businesses`** — liste + création/édition entreprise (form avec capture GPS, photo, mobile money)
- **`/partner/businesses/:id/products`** — CRUD produits
- **`/partner/sales`** — historique ventes + statut commission
- **`/partner/payouts`** — historique versements
- **`/admin/waouh-partners`** — gestion partenaires (KYC, suspension, commission settings, payouts à effectuer)

### 1.4 Edge functions
- `waouh-partner-onboard` — création partenaire + génération code
- `waouh-partner-attribute-sale` — appelé par `waouh-payment` après confirmation paiement, détecte si l'article vient d'un `partner_business`/`partner_product` et crée la `partner_sale`
- `waouh-partner-payout-run` — admin déclenche calcul + initiation Mobile Money

---

## Partie 2 — Restructuration des 3 bases en couche unifiée

### 2.1 État actuel (problèmes)
- `waouh_articles` (chat) : focus annonces vendeurs WhatsApp, peu structuré géo.
- `waouh_external_listings` + `waouh_radar_signals` (radar IA) : non lié au reste, formats hétérogènes.
- Aucune base "Partner" aujourd'hui.
- Recherche : pas de priorisation, pas d'index unifié.

### 2.2 Architecture cible

```text
                    ┌─────────────────────────────┐
                    │   waouh_marketplace_unified │  ← VUE matérialisée
                    │   (offres et demandes)      │
                    └──────────────┬──────────────┘
                                   │ priorité
                  ┌────────────────┼─────────────────┐
                  ▼ 1              ▼ 2               ▼ 3
        waouh_partner_*     waouh_chat_*       waouh_radar_*
        (manuel terrain)    (annonces WA)     (scrap IA externe)
```

### 2.3 Schéma unifié — table cible `waouh_unified_catalog`
Table physique (pas vue) alimentée par triggers depuis les 3 sources :
- `id`, `source` enum (`partner`|`chat`|`radar`), `source_ref_id`
- `type` (`offer`|`demand`)
- `titre`, `description`, `categorie`, `sous_categorie`, `tags[]`
- `prix_min`, `prix_max`, `devise`
- `ville`, `quartier`, `lat`, `lng`, `geohash`
- `vendeur_nom`, `vendeur_phone`, `vendeur_whatsapp`, `vendeur_mobile_money`
- `partner_id` (nullable, rempli si source=partner)
- `business_id` (nullable)
- `qualite_score` (0-100, calculé : partner=90, chat vérifié=70, radar=50, modulé par âge/photos/notes)
- `priority_rank` (int : 1 partner, 2 chat, 3 radar — utilisé pour `ORDER BY`)
- `embedding` (vector 384 dim pour recherche sémantique)
- `is_active`, `expires_at`, `verified`, `last_seen_at`
- `raw_payload` (jsonb pour traçabilité)
- Index : GIN tags, GIST geohash, IVFFlat embedding, btree (categorie, ville, priority_rank, qualite_score DESC)

### 2.4 Triggers de synchronisation
- `trg_sync_partner_product_to_unified` (AFTER INSERT/UPDATE/DELETE sur `waouh_partner_products`)
- `trg_sync_chat_article_to_unified` (sur `waouh_articles`)
- `trg_sync_radar_listing_to_unified` (sur `waouh_external_listings`)

### 2.5 Recherche unifiée
- Fonction RPC `waouh_search_unified(query text, lat, lng, radius_km, categorie)` : retourne résultats triés par `priority_rank ASC, qualite_score DESC, distance ASC`.
- Edge function `waouh-search` (utilisée par chat WhatsApp et future app) wrap cette RPC + embedding sémantique.
- Le webhook `waouh-webhook` branche `BUY` consomme ce RPC au lieu de scanner `waouh_articles` directement.

### 2.6 Contrôle admin
- Page **`/admin/waouh-data-control`** :
  - Vue volumétrie par source (compteurs, % actifs, % vérifiés)
  - Toggle activation par source (désactiver radar temporairement par ex.)
  - Réindexation manuelle
  - Curation : marquer entrées radar/chat comme "vérifiées" → boost qualité
  - Fusion de doublons (même téléphone/géoloc) entre sources avec garde de la source la plus prioritaire
- Configuration des **poids** (`priority_rank`, `qualite_score` formula) stockée dans `waouh_settings`.

### 2.7 Migration progressive
1. Créer `waouh_unified_catalog` + triggers (vide au départ).
2. Backfill : peupler depuis les 3 sources existantes (script idempotent).
3. Brancher `waouh-webhook BUY` et `waouh-radar-*` sur la nouvelle RPC.
4. Garder anciennes tables sources comme source de vérité (pas de migration destructive).

---

## Détails techniques

- **PostGIS** : activer si pas déjà fait pour `geohash`/distance. Sinon utiliser formule Haversine.
- **pgvector** : extension pour `embedding`. Embeddings générés via Lovable AI Gateway (modèle léger) au moment de l'insert via trigger → edge function `waouh-embed`.
- **Commission flow** : `waouh-payment` (confirmation Qosic) → enqueue job `waouh-partner-attribute-sale` qui regarde `transaction.article_id` → lookup `unified_catalog.source` ; si `partner`, crée `partner_sale` avec `commission_partner = montant × commission_plateforme_pct × commission_partner_pct_sur_plateforme / 10000`.
- **RLS** : toutes nouvelles tables avec `has_role()` pour admin et `partner_id IN (SELECT id FROM waouh_partners WHERE user_id = auth.uid())` pour partenaires.
- **Navigation** : ajouter "Waouh Partner" (espace partenaire) dans menu uniquement si rôle `partner` ; "Waouh Data Control" sous admin.

---

## Livrables (ordre d'implémentation suggéré)

1. **Migration SQL #1** : tables Partner + commission settings + RLS + seed commission par défaut (5% / 40%).
2. **Migration SQL #2** : `waouh_unified_catalog` + triggers + RPC search + RLS.
3. **Edge functions** : `waouh-partner-attribute-sale`, `waouh-search`, `waouh-embed`.
4. **Frontend Partner** : 5 pages (`/partner/...`).
5. **Frontend Admin** : `/admin/waouh-partners`, `/admin/waouh-data-control`.
6. **Branchement** : `waouh-webhook BUY` → `waouh-search` ; `waouh-payment` → attribution commission.
7. **Backfill** : script SQL idempotent pour peupler `unified_catalog` depuis les 3 sources existantes.

---

## Questions à confirmer avant implémentation

1. **Rôle partner** : créer un rôle `partner` dédié dans l'enum `app_role` (séparé de `user`) ?
2. **Commission par défaut** : 5% plateforme, partenaire reçoit 40% de ces 5% (= 2% effectifs sur le PV) — OK ?
3. **Payout** : versement automatique seuil (ex. ≥ 5 000 FCFA) ou manuel admin uniquement au démarrage ?
4. **KYC** : upload pièce d'identité obligatoire à l'enrôlement, ou activation immédiate puis vérification a posteriori ?
