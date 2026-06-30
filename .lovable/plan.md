# Diffusion IA — Ciblage Base Unifiée + Radar, validée par l'admin

## Objectif
Transformer le module **Diffusion** (aujourd'hui isolé : liste de campagnes + import contacts téléphone) en un moteur de **diffusion ciblée** qui puise dans :
1. **`waouh_radar_contacts`** (contacts détectés par le Radar IA — déjà catégorisés, géolocalisés, scorés)
2. **`waouh_unified_catalog`** (vendeurs/acheteurs présents dans la base unifiée — `vendeur_phone`, `categorie`, `ville`)
3. **`waouh_radar_signals`** (intentions BUY/SELL récentes avec `contact_phone`, `category`, `city`)
4. **`wa_contacts`** (contacts WhatsApp historiques tagués)

…puis applique un **modèle de segmentation par secteur/classe**, et envoie après **approbation explicite d'un admin** (quota, plafond, fenêtre horaire).

---

## 1. Modèle de segmentation proposé (le "schéma")

Chaque contact agrégé est projeté dans une **fiche unifiée de ciblage** :

```text
ContactCible {
  phone_e164            ← clé de déduplication
  display_name
  sources[]             ← ["radar","catalog","signal","wa_contact"]
  secteur               ← Mode/Beauté, Tech, Auto, Immo, Alimentaire, Services, Autre
  sous_categorie
  ville / quartier
  intent_score          ← 0–100 (BUY+SELL+récence signaux)
  freshness_days        ← jours depuis last_seen
  classe                ← A (chaud <7j, intent>70)
                         B (tiède <30j, intent 40–70)
                         C (froid 30–90j)
                         D (dormant >90j)
  opt_out, is_whatsapp, weekly_sent_count
  qualite_score         ← 0–100 (téléphone valide + nom + catégorie + ville)
}
```

**Règles d'éligibilité** (par défaut) : `is_whatsapp = true`, `opt_out = false`, `qualite_score ≥ 50`, `weekly_sent_count < 3` (plafond global existant).

---

## 2. Stratégie de ciblage (l'audience builder)

L'utilisateur (vendeur/partenaire) construit une audience via un **wizard 4 étapes** :

| Étape | Choix |
|---|---|
| **1. Source** | Radar uniquement / Catalogue unifié / Signaux récents / Toutes |
| **2. Secteur** | Multi-select sur `secteur` + `sous_categorie` (issu du catalogue) |
| **3. Géo** | Villes / rayon km autour d'un point (réutilise `waouh_radar_scan`) |
| **4. Classe & fraîcheur** | Classes A/B/C/D + `last_seen_within_days` + intent BUY/SELL |

Aperçu live : **« 1 247 contacts éligibles · 612 classe A · 8 villes »** + échantillon de 10 lignes anonymisées.

---

## 3. Workflow de validation admin

```text
[Vendeur] crée brouillon ─▶ status=draft
       │
       │ "Demander validation" (capse plafond proposé, ex: 500 envois)
       ▼
[Admin] file d'attente /admin/waouh/diffusion-approvals
       ├─ voit: audience, message, média, plafond demandé, coût estimé
       ├─ peut: ajuster plafond, exclure villes, modifier template
       └─ Approuver  ─▶ status=approved, quota_approved=N
                       └─▶ déclenche waouh-radar-campaign-tick existant
           Refuser    ─▶ status=rejected + motif
```

Garde-fous admin :
- Plafond global plateforme/jour (paramètre `waouh_settings`)
- Anti-spam : 3 messages/contact/7j (déjà en place dans `campaign-tick`)
- Fenêtre horaire autorisée (8h–20h Africa/Porto-Novo)
- Liste noire phone/préfixe

---

## 4. Suivi & évaluation

Page **Suivi de diffusion** (réutilise `waouh_radar_campaign_runs` + `_sends`) :
- KPIs temps réel : envoyés / livrés / lus / répondus / opt-out / **conversions** (chat ouvert, intention reçue, deal créé)
- Vue par **secteur** et par **classe A/B/C/D** → taux de réponse comparés
- Vue par **ville** (carte chaleur)
- Export CSV + relance automatique des non-répondants (J+3) si admin coche l'option

La conversion est attribuée en joignant `waouh_messages.counterpart_phone` ↔ `waouh_radar_campaign_sends.phone_e164` dans une fenêtre de 7 jours.

---

## 5. Changements techniques (résumé non-utilisateur)

**Base de données (1 migration)**
- Vue `public.v_diffusion_audience` qui UNION + dédup `radar_contacts` ∪ `signals.contact_phone` ∪ `unified_catalog.vendeur_phone` ∪ `wa_contacts`, calcule `secteur`, `classe`, `intent_score`, `freshness_days`, `qualite_score`.
- Table `waouh_diffusion_approvals` (campaign_id, requested_by, audience_snapshot jsonb, quota_requested, quota_approved, status, reviewed_by, reviewed_at, reason) + GRANT + RLS (créateur voit le sien, admin voit tout).
- Colonne `requires_approval boolean default true` + `approval_id uuid` sur `waouh_radar_campaigns`.
- Indexes sur `(secteur, classe, ville)` côté vue matérialisée optionnelle.

**Edge functions**
- `waouh-diffusion-audience` (POST) : prend les filtres du wizard, renvoie count + échantillon depuis la vue.
- `waouh-diffusion-submit` : crée campagne `status=pending_approval` + snapshot audience.
- `waouh-diffusion-approve` (admin only) : flip campagne `status=active`, fixe `quota_approved`, planifie `next_run_at`.
- `waouh-radar-campaign-tick` (existant) : ajouter check `quota_approved` avant chaque envoi.

**Frontend**
- `src/app-mobile/screens/DiffusionScreen.tsx` : remplacer l'écran liste actuel par le wizard 4 étapes + bouton « Demander validation ».
- `src/components/diffusion/AudienceBuilder.tsx` (nouveau, 4 sous-composants : SourceStep, SectorStep, GeoStep, ClassStep + AudiencePreview).
- `src/pages/admin/AdminDiffusionApprovalsPage.tsx` (nouveau) + route `/admin/waouh/diffusion-approvals`.
- `src/components/diffusion/DiffusionTrackingDashboard.tsx` (KPIs + tableau secteur/classe + carte).
- `RadarCampaignsTab.tsx` : ajouter colonne « Validation » + lien vers la page admin.

**Aucune modification** des flux chat/match/notif existants (verrouillage v12 respecté).

---

## 6. Livraison en 3 lots

1. **Lot A — Audience & vue unifiée** : migration vue, edge `audience`, wizard frontend, aperçu live (sans envoi).
2. **Lot B — Validation admin** : table approvals, edges submit/approve, page admin, blocage envoi tant que non approuvé.
3. **Lot C — Suivi & évaluation** : dashboard secteur/classe/ville, attribution conversions, relance J+3, export CSV.

Chaque lot est testable et déployable indépendamment.
