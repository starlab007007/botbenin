# Espace Partenaire — version mobile native

Objectif : remplacer l'écran `PartnerScreen` minimaliste actuel par un véritable Espace Partenaire mobile, avec toutes les fonctionnalités du web (`/partner/*`), dans une UI 100% native (header sticky vert WAOUH, cards arrondies, sheets plein écran, FAB, bottom-tab préservé), en partageant les mêmes hooks/tables Supabase pour une synchro temps réel parfaite avec le web.

## Périmètre fonctionnel (parité web)

1. **Demande d'inscription partenaire** (si pas encore partenaire) — formulaire natif avec `PhoneInput`, `SmartCombobox`, validation Zod (`partnerEnrollmentSchema`).
2. **Tableau de bord** — stats live (`useWaouhPartnerStats`) : entreprises, produits, CA 24h/7j/30j, commission due/totale, badges statut/niveau/KYC, toast temps réel "Nouvelle vente".
3. **Mes entreprises** — liste, création/édition (dictée vocale, GPS, enrichissement IA via `useWaouhAI`), suppression/désactivation intelligente.
4. **Enrôler un commerce** — bouton FAB direct vers le formulaire entreprise.
5. **Produits par entreprise** — liste + ajout (réutilise la logique de `PartnerProductsPage`).
6. **Mes ventes & commissions** — liste cards mobile (au lieu du tableau web), filtres simples.
7. **Mes versements** — liste cards mobile (statut, montant, période, réf MoMo).
8. **Historique paiements** — réutilise `PaymentHistoryView` existant dans un sheet/screen natif.
9. **Activité temps réel** — `PartnerActivityFeed` intégré au dashboard.

## Architecture mobile

Navigation interne au tab "Partenaire" via sous-routes nested (pas de nouvelle bottom-tab) :

```text
/app/partner                       → PartnerHomeScreen  (dashboard ou form d'inscription)
/app/partner/businesses            → PartnerBusinessesScreen
/app/partner/businesses/new        → PartnerBusinessFormScreen
/app/partner/businesses/:id/edit   → PartnerBusinessFormScreen
/app/partner/businesses/:id/products → PartnerProductsScreen
/app/partner/sales                 → PartnerSalesScreen
/app/partner/payouts               → PartnerPayoutsScreen
/app/partner/payments              → PartnerPaymentsScreen
```

Chaque écran utilise un header sticky natif (back, titre, action) + `pb-[calc(64px+env(safe-area-inset-bottom))]` pour ne pas être masqué par la `BottomTabBar`.

## Composants natifs partagés

- `MobileScreenHeader` — header vert sticky avec back/title/action (extrait du pattern `WaouhChatScreen`).
- `MobileStatCard` — carte stat compacte (icône + label + valeur).
- `MobileSectionTile` — tuile navigation (icône, titre, sous-titre, chevron).
- `MobileEmpty` — empty state cohérent.
- `MobileFab` — bouton flottant en bas à droite (au-dessus de la tabbar).

## Fichiers à créer

- `src/app-mobile/screens/partner/PartnerHomeScreen.tsx` (remplace `PartnerScreen.tsx`)
- `src/app-mobile/screens/partner/PartnerEnrollScreen.tsx` (formulaire candidature, intégré dans Home si pas partenaire)
- `src/app-mobile/screens/partner/PartnerBusinessesScreen.tsx`
- `src/app-mobile/screens/partner/PartnerBusinessFormScreen.tsx` (création + édition, voix/GPS/IA)
- `src/app-mobile/screens/partner/PartnerProductsScreen.tsx`
- `src/app-mobile/screens/partner/PartnerSalesScreen.tsx`
- `src/app-mobile/screens/partner/PartnerPayoutsScreen.tsx`
- `src/app-mobile/screens/partner/PartnerPaymentsScreen.tsx`
- `src/app-mobile/components/MobileScreenHeader.tsx`
- `src/app-mobile/components/MobileStatCard.tsx`
- `src/app-mobile/components/MobileSectionTile.tsx`
- `src/app-mobile/components/MobileFab.tsx`

## Fichiers à modifier

- `src/App.tsx` — ajouter les sous-routes `/app/partner/*` (lazy imports), supprimer l'ancien `PartnerScreen`.
- `src/app-mobile/screens/PartnerScreen.tsx` — supprimer (remplacé par `partner/PartnerHomeScreen.tsx`).

## Réutilisation existante

- Hooks : `useWaouhPartner`, `useWaouhPartnerStats`, `useWaouhPartnerActivity`, `useWaouhAI`, `useMobileAuth`.
- Validation : `partnerEnrollmentSchema`, `businessSchema` (`@/lib/validation/waouh`).
- Composants : `PhoneInput`, `SmartCombobox`, `LocationAutocomplete`, `PartnerActivityFeed`, `PaymentHistoryView`.
- Données : `BENIN_CITY_NAMES`, `BUSINESS_CATEGORIES`, `MOMO_OPERATORS`.
- Tables Supabase : `waouh_partners`, `waouh_partner_businesses`, `waouh_partner_products`, `waouh_partner_sales`, `waouh_partner_payouts`, `waouh_partner_activity` — déjà en place avec RLS, donc synchro web ↔ mobile automatique.

## UI/UX natif

- Header vert sticky `hsl(var(--wa-green))` avec `safe-area-inset-top`.
- Cards arrondies `rounded-2xl`, ombres douces, pas de tableaux (transformés en cards).
- Sheets plein écran (`max-h-[100dvh]`) pour les formulaires, pas de dialogs centrés.
- FAB vert flottant `fixed bottom-[calc(64px+env(safe-area-inset-bottom)+16px)] right-4` pour les actions principales.
- Empty states avec icône + message + CTA.
- Toasts pour feedback (déjà en place).
- Pas de modifications business/backend : 100% UI mobile par-dessus la même donnée.
