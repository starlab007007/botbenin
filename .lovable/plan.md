# Plan — Espace Partenaire & Admin Waouh : intelligence, validation et traçabilité

## 1. Performance & UX des champs intelligents

**LocationAutocomplete (ville/quartier)**
- Mémoriser `BENIN_CITY_NAMES` et l'index `BENIN_CITY_INDEX` au niveau module (déjà fait) + ajouter un cache `Map<ville, quartiers[]>` exposé par `getQuartiersForCity` pour éviter les recalculs.
- Envelopper le composant dans `React.memo` + `useCallback` sur `onChange` côté parents.
- Dans `SmartCombobox`, debouncer la recherche (150 ms) avec `useDeferredValue` pour réduire les re-rendus de la liste pendant la frappe.
- Précharger en idle (`requestIdleCallback`) les quartiers des 5 villes principales (Cotonou, Calavi, Porto-Novo, Parakou, Bohicon).

**PhoneInput**
- Ajouter à droite du champ un badge inline « 🇧🇯 +229 97 12 34 56 » qui montre en direct le numéro normalisé (E.164 affiché format local), affiché en `text-muted-foreground` quand valide, en `text-destructive` quand invalide.
- État visuel `aria-invalid`, bordure `border-destructive` + texte d'aide sous le champ : « 8 chiffres requis pour le Bénin », « Format MTN/Moov attendu : 9X / 6X / 5X / 4X ».
- Helper `normalizePhone(value, defaultCountry='BJ')` dans `src/lib/phone.ts` retournant `{ e164, valid, reason }`. Utilisé avant tout `insert/update` Supabase.

**SmartCombobox — états d'erreur**
- Nouvelle prop `invalid?: boolean` + `errorMessage?: string` → bordure destructive, message en dessous.
- Appliqué aux champs catégorie entreprise, catégorie produit, unité, opérateur Mobile Money.

## 2. Validation centralisée (Zod) avant envoi

Créer `src/lib/validation/waouh.ts` :
- `partnerEnrollmentSchema`, `businessSchema`, `productSchema`, `saleSchema`
- Tous les champs téléphone passent par `phoneSchema` (normalise + valide via `normalizePhone`)
- Catégorie / unité / opérateur MM : `z.string().min(1, "Champ requis")`
- Géoloc : ville obligatoire, quartier optionnel, lat/lng optionnels mais cohérents si fournis

Les pages `PartnerDashboardPage`, `PartnerBusinessesPage`, `PartnerProductsPage` :
- `useForm` avec `zodResolver` (déjà présent dans le projet via `react-hook-form` + `@hookform/resolvers`)
- Affichage des erreurs par champ via le composant `FormMessage` existant.
- Toast récap si erreurs multiples : « Corrigez les champs en rouge ».

## 3. Partner — CRUD complet sur entreprises

`PartnerBusinessesPage.tsx` :
- Carte par entreprise → bouton **Voir** (drawer détail : toutes les infos, photos, géoloc, contacts formatés, produits liés, ventes récentes, stats commission)
- Bouton **Modifier** → réutilise le dialog actuel, pré-rempli
- Bouton **Supprimer** → `AlertDialog` de confirmation, hard delete si pas de ventes, sinon soft delete (`is_active=false`) avec explication
- Compteurs : nb produits, ventes 30j, CA, commission totale

Idem `PartnerProductsPage.tsx` : action Voir/Modifier/Supprimer + état stock visible.

## 4. Admin — Gestion complète des partenaires

`AdminWaouhPartnersPage.tsx` enrichi :
- Tableau filtrable (statut, niveau, ville, KYC) + recherche plein-texte
- Actions par ligne :
  - **Activer** (`statut=active`, `date_activation=now()`)
  - **Suspendre** (`statut=suspended`, dialog avec motif → `waouh_partner_audit_log`)
  - **Rejeter** / **Réactiver**
  - **Vérifier KYC** (`kyc_verified=true`)
  - **Changer niveau** (Bronze/Argent/Or/Platine)
  - **Voir** drawer 360° : profil + entreprises + produits + ventes + commissions + audit log
  - **Modifier** (toutes infos éditables côté admin via edge function `waouh-partner-admin-update`)
- Nouvelle page **AdminWaouhBusinessesPage** : voir/valider toutes les entreprises de tous partenaires (`verifie_admin`, suspendre, supprimer).

## 5. Système d'habilitations

Migration DB :
- Table `waouh_partner_permissions` (partner_id, permission ENUM: `can_add_business`, `can_add_product`, `can_record_sale`, `can_request_payout`, `can_invite_subagent`)
- Table `waouh_partner_audit_log` (partner_id, admin_id, action, payload jsonb, created_at)
- RLS : lecture publique aux admins, partenaire voit ses propres lignes
- Fonction `has_partner_permission(_user_id, _perm)` SECURITY DEFINER

Côté admin : matrice de cases à cocher par partenaire (toggle direct, write via edge function `waouh-partner-set-permission` qui log dans audit).
Côté partner : les boutons d'action sont désactivés si la permission manque, avec tooltip explicatif.

## 6. Monitoring temps réel & traçabilité

Migration DB :
- Table `waouh_partner_activity` (partner_id, business_id?, product_id?, sale_id?, event_type, metadata jsonb, created_at). Triggers d'insertion sur businesses/products/sales pour la traçabilité automatique.
- Vue `waouh_partner_stats_v` : par partenaire → nb ventes 24h/7j/30j, CA, commission, stock total, produits actifs, dernière activité.
- Vue `waouh_product_traceability_v` : produit → business → partenaire → ventes → commission.

Frontend admin **AdminWaouhMonitoringPage** (nouvelle route `/admin/waouh/monitoring`) :
- Realtime Supabase channel sur `waouh_partner_activity` → flux live (10 derniers événements, badges colorés par type).
- KPIs globaux (partenaires actifs, ventes du jour, CA, commissions à payer).
- Top partenaires + alertes (stock bas, partenaire inactif >7j, ventes anormales).

Frontend partner **PartnerDashboardPage** (enrichi) :
- Notifications temps réel à chaque vente d'un de ses produits (Supabase realtime sur `waouh_partner_sales` filtré `partner_id=eq.X` + toast + badge cloche).
- Cartes KPI : CA jour/semaine/mois, commission cumulée, commission en attente, prochaine paie.
- Section **Mes produits & stock** : liste avec stock courant, ventes 30j, commission générée, alerte stock bas (<5).
- Section **Statistiques de vente** : graphique (recharts) ventes/jour 30j, top 5 produits, répartition par entreprise.
- Chaîne de traçabilité (mini-graph) : Partenaire → Entreprises → Produits → Ventes.

## 7. Routes ajoutées / modifiées

```
/partner                                 (dashboard enrichi)
/partner/businesses                      (CRUD + drawer détail)
/partner/businesses/:id                  (drawer route)
/partner/products                        (CRUD + stats)
/partner/sales                           (historique + filtres)
/partner/payouts                         (demandes + statut)
/admin/waouh/partners                    (gestion + habilitations)
/admin/waouh/businesses                  (NEW - validation entreprises)
/admin/waouh/monitoring                  (NEW - temps réel)
/admin/waouh/data-control                (existant, conservé)
```

Toutes protégées par `PartnerRoute` / admin guard existants.

## Détails techniques

**Fichiers nouveaux** :
- `src/lib/validation/waouh.ts`
- `src/components/waouh/PartnerBusinessDetailDrawer.tsx`
- `src/components/waouh/PartnerActivityFeed.tsx`
- `src/components/waouh/PartnerStatsCards.tsx`
- `src/components/waouh/AdminPartnerDetailDrawer.tsx`
- `src/components/waouh/PartnerPermissionsMatrix.tsx`
- `src/hooks/useWaouhPartnerStats.ts` (realtime + agrégats)
- `src/hooks/useWaouhPartnerActivity.ts` (realtime feed)
- `src/hooks/useWaouhPartnerPermissions.ts`
- `src/pages/admin/AdminWaouhMonitoringPage.tsx`
- `src/pages/admin/AdminWaouhBusinessesPage.tsx`
- Edge functions : `waouh-partner-admin-update`, `waouh-partner-set-permission`, `waouh-partner-set-status`

**Fichiers modifiés** :
- `src/lib/phone.ts` (ajout `normalizePhone`)
- `src/components/ui/phone-input.tsx` (badge live, états d'erreur, helper text)
- `src/components/ui/smart-combobox.tsx` (props `invalid`, `errorMessage`, debounce)
- `src/components/waouh/LocationAutocomplete.tsx` (memo + cache)
- `src/data/beninLocations.ts` (cache Map quartiers)
- `src/pages/partner/PartnerBusinessesPage.tsx` (CRUD complet + Zod)
- `src/pages/partner/PartnerProductsPage.tsx` (CRUD + stats stock)
- `src/pages/partner/PartnerDashboardPage.tsx` (KPIs + realtime + traçabilité)
- `src/pages/partner/PartnerSalesPage.tsx` (filtres + graph)
- `src/pages/admin/AdminWaouhPartnersPage.tsx` (actions + drawer + permissions)
- `src/App.tsx` (nouvelles routes admin)
- `src/components/navigation/ModernSidebar.tsx` (liens admin monitoring + businesses)

**Migrations DB** (1 seule) :
- `waouh_partner_permissions`, `waouh_partner_audit_log`, `waouh_partner_activity` + triggers
- Vues `waouh_partner_stats_v`, `waouh_product_traceability_v`
- Fonctions `has_partner_permission`, `waouh_partner_log_activity`
- Activation realtime (`alter publication supabase_realtime add table ...`) pour `waouh_partner_sales`, `waouh_partner_activity`
- RLS sur toutes les nouvelles tables

**Pas de changement** : pricing, FCFA, modules existants hors Waouh.
