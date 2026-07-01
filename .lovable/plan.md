# Plan — Validation & Suivi Diffusion IA

## Constat
- La carte ajoutée précédemment est sur `/admin` (AdminDashboardPage), mais l'admin WAOUH travaille depuis `/admin/waouh` (WaouhPage). Aucun bouton n'y pointe vers `/admin/waouh/diffusion-approvals` → il faut l'exposer là aussi.
- L'écran de validation actuel n'affiche qu'un `audience_snapshot.total` (nombre agrégé). Impossible pour l'admin de voir, modifier ou exclure les numéros ciblés avant d'approuver.
- Après validation il n'y a pas de vue de suivi/relance rattachée à la campagne validée.

## Ce qui va être livré

### 1. Accès visible (2 emplacements)
- **`/admin/waouh` (WaouhPage)** : ajouter dans le header un bouton **📣 Validations diffusion** avec badge temps réel du nombre de demandes `pending`, pointant vers `/admin/waouh/diffusion-approvals`.
- **`/admin` (AdminDashboardPage)** : la carte existe déjà ; on la conserve.

### 2. Vue « Numéros à valider » (avant approbation)
Nouvelle section dépliable sur chaque demande dans `AdminDiffusionApprovalsPage` :

- Bouton **« Voir & éditer les numéros »** → appelle `waouh-diffusion-audience` en mode admin (payload `{ ...filters, admin_full: true, limit_sample: 500 }`) pour recevoir la **liste complète non masquée** (`phone_e164`, `display_name`, `secteur`, `ville`, `classe`, `intent_score`, `sources`).
- Tableau paginé avec :
  - Case **Inclure / Exclure** par ligne
  - Champ **Téléphone** éditable (normalisation E.164 côté client, avec validation Bénin +229 par défaut)
  - Filtres rapides (secteur, classe, ville) + recherche texte
  - Actions groupées : « Tout exclure filtré », « Tout inclure »
- Compteur en direct : « X inclus / Y total — plafond demandé Z ».
- Bouton **Enregistrer la sélection** → persiste dans `waouh_diffusion_approvals.audience_recipients` (JSONB : `[{phone_e164, name, secteur, classe, included, override_phone?}]`) et `excluded_phones` (TEXT[]).
- Le bouton **Approuver** est désactivé tant qu'aucun numéro inclus n'est présent ; le quota approuvé se cale par défaut sur le nombre inclus.

### 3. Envoi respectant la sélection
`waouh-radar-campaign-tick` lira `audience_recipients` de l'approbation liée à la campagne : n'envoie qu'aux numéros `included=true`, applique `override_phone` si présent, ignore ceux dans `excluded_phones`. Le mode « audience complète » reste le fallback si `audience_recipients` est vide.

### 4. Vue « Suivi & Relance » (après validation)
Nouveaux onglets sur `AdminDiffusionApprovalsPage` :
- **En attente** (comportement actuel)
- **Approuvées / En cours** : liste des campagnes dérivées, montée avec le composant existant `DiffusionTrackingDashboard` (envoyés / répondus / intéressés / relancés + barre de conversion) + bouton **Relance J+3** déjà câblé sur `waouh-diffusion-relaunch`.
- **Historique** : rejetées + terminées, avec motif visible.

## Détails techniques

**Migration**
```sql
ALTER TABLE public.waouh_diffusion_approvals
  ADD COLUMN IF NOT EXISTS audience_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS excluded_phones     TEXT[]  NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_wda_recipients_gin
  ON public.waouh_diffusion_approvals USING gin (audience_recipients);
```

**Edge functions**
- `waouh-diffusion-audience` : ajoute le mode `admin_full` (vérifie `has_role(admin)` via `Authorization` user-client) ; retourne phones non masqués et `contact_id` ; élargit `limit_sample` (max 1000).
- `waouh-diffusion-approve` : accepte `audience_recipients` et `excluded_phones` optionnels, persiste sur l'approbation avant activation.
- `waouh-radar-campaign-tick` : si `audience_recipients` non vide, itère cette liste (respect `included`, `override_phone`) au lieu de la vue ; sinon comportement actuel.

**Frontend**
- `AdminDiffusionApprovalsPage.tsx` : ajout `<Tabs>` (Pending / Actives / Historique), composant `<RecipientsEditor>` local (table shadcn + `<Checkbox>` + `<Input>`), intégration `<DiffusionTrackingDashboard>`.
- `WaouhPage.tsx` : ajout d'un `<Link to="/admin/waouh/diffusion-approvals">` dans le header (bouton `<Megaphone/>` + `<Badge>` count via Realtime sur `waouh_diffusion_approvals`).

**Sécurité**
- L'exposition des numéros complets est réservée aux admins (vérification `has_role` server-side, RLS déjà en place sur `waouh_diffusion_approvals`).
- Validation E.164 des overrides côté fonction (regex `^\+?[1-9]\d{7,14}$`).

## Hors périmètre
- Pas de refonte visuelle du dashboard WaouhPage.
- Pas de changement au moteur d'envoi WAHA / templates.
