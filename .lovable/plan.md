## Objectif

Rendre les écrans **"Enrôler une entreprise"** et **"Ajouter un produit"** 100% natifs dans l'app mobile Android (Capacitor) : plus aucun rendu de la page web réutilisée, plus aucun popover/dialog de bureau. Le backend Supabase, les champs, les règles de validation et le comportement restent **strictement identiques** au web — seule l'UI est réécrite en composants natifs mobiles.

## Périmètre

- `src/app-mobile/screens/partner/PartnerBusinessesScreen.tsx` — ne plus lazy-load `PartnerBusinessesPage` ; afficher la liste + bouton "Enrôler" en natif.
- `src/app-mobile/screens/partner/PartnerProductsScreen.tsx` — pareil pour les produits.
- Aucune modification des pages web (`src/pages/partner/PartnerBusinessesPage.tsx`, `PartnerProductsPage.tsx`) : le web continue de fonctionner à l'identique.
- Aucune modification de schéma DB, ni d'edge function, ni du hook `useWaouhPartner`, `useWaouhAI`, `useCustomCategories`, ni du composant `ProductPhotoUploader` (déjà compatible Capacitor).

## Composants natifs à créer

Dossier nouveau : `src/app-mobile/components/native/`

1. **`NativeFormScreen.tsx`** — conteneur plein écran style Android : header sticky "Retour / Titre / Action", `pb-[env(safe-area-inset-bottom)]`, scroll fluide, bouton "Enregistrer" sticky en bas (FAB-like full-width).
2. **`NativeCategoryPicker.tsx`** — déclencheur type `<input>` natif (chevron à droite), ouvre une **bottom-sheet plein écran** (`Sheet side="bottom"` shadcn, hauteur `h-[92dvh]`) contenant :
   - Champ recherche sticky en haut (avec `inputMode="search"`),
   - Liste **virtuellement scrollable** (`overflow-y-auto overscroll-contain`, momentum iOS/Android),
   - CTA permanent en bas : **"➕ Créer la catégorie « X »"** dès que la recherche ne matche rien,
   - Tap = sélection + fermeture immédiate.
   - Props : `value`, `onChange`, `options`, `allowCustom`, `onCreate(custom)`.
3. **`NativeSelectSheet.tsx`** — variante minimaliste sans "créer" pour Opérateur MoMo et Unité produit (kg, pièce, sac…).
4. **`NativeVilleQuartierPicker.tsx`** — deux pickers natifs basés sur `beninLocations` (ville → liste quartiers filtrée). Sans dépendance sur `LocationAutocomplete` (qui est un combobox web).
5. **`NativePhoneInput.tsx`** — wrapper léger : drapeau 🇧🇯 +229 figé + `<input type="tel" inputMode="numeric">`, formatage à la frappe via `formatPhoneDisplay` existant. (Évite le `PopoverContent` du `PhoneInput` web.)

Tous ces composants utilisent uniquement `Sheet`/`Input`/`Button` shadcn et tokens du design system — aucun `Popover` (qui se comporte mal sur WebView Android).

## Nouvelles vues mobiles

### `src/app-mobile/screens/partner/PartnerBusinessesNativeScreen.tsx`

- Liste verticale de cartes entreprises (1 col, photo facultative, badges statut).
- FAB "+ Enrôler" en bas droit qui pousse vers `BusinessFormNativeScreen` (route enfant ou état local plein écran).
- Mêmes appels Supabase : `select * from waouh_partner_businesses where partner_id = ...`.
- Pull-to-refresh simple (bouton "↻" dans le header faute de gesture natif fiable en WebView).

### `src/app-mobile/screens/partner/BusinessFormNativeScreen.tsx`

Mêmes champs que la capture 1, dans l'ordre exact, mais 100% natifs :

| Champ | Composant natif |
|---|---|
| Détecter ma position | `Button` plein largeur, appelle `navigator.geolocation` + `ai.run('reverse_geocode')` (logique copiée du web) |
| Nom de l'entreprise * | `Input` standard |
| Catégorie * | `NativeCategoryPicker` avec `useCustomCategories('business', BUSINESS_CATEGORIES)` |
| Ville / Quartier | `NativeVilleQuartierPicker` |
| Téléphone / WhatsApp | `NativePhoneInput` |
| Opérateur MoMo | `NativeSelectSheet` (MTN/Moov/Celtiis) |
| Numéro MoMo | `NativePhoneInput` |
| Enregistrer | bouton sticky bas + `businessSchema.safeParse` (validation identique au web) |

Mode édition : même écran, pré-rempli, titre "Modifier".

### `src/app-mobile/screens/partner/PartnerProductsNativeScreen.tsx` + `ProductFormNativeScreen.tsx`

Mêmes champs que la capture 2 :

| Champ | Composant natif |
|---|---|
| Photos (3 max) | `ProductPhotoUploader` existant (déjà supporte file input mobile) |
| Nom * | `Input` |
| Catégorie | `NativeCategoryPicker` avec `useCustomCategories('product', PRODUCT_CATEGORIES)` |
| Unité | `NativeSelectSheet` (kg, pièce, sac, litre…) |
| Prix (FCFA) | `Input type="number" inputMode="decimal"` |
| Stock estimé | `Input type="number" inputMode="numeric"` |
| Disponible | `Switch` shadcn |
| Enregistrer | bouton sticky bas |

La feuille "Suggérer produits IA" est conservée mais montée en `Sheet side="bottom"` plein écran natif au lieu du `Dialog` centré.

## Routage / branchement

Dans `PartnerBusinessesScreen.tsx` et `PartnerProductsScreen.tsx` :

```ts
// avant : lazy(() => import('@/pages/partner/PartnerBusinessesPage'))
// après :
import PartnerBusinessesNative from './PartnerBusinessesNativeScreen';
return <PartnerMobileWrap title="Mes entreprises" back="/app/partner">
  <PartnerBusinessesNative />
</PartnerMobileWrap>;
```

Le bouton **"Produits"** d'une carte entreprise navigue vers `/app/partner/businesses/:code/products` (déjà câblé) qui rend désormais `PartnerProductsNative`.

## Parité backend (vérifiée)

Toutes les écritures réutilisent les mêmes tables / mêmes payloads que les pages web :
- `waouh_partner_businesses` (insert/update/delete + soft-pause si ventes liées)
- `waouh_partner_products` (insert/update/delete)
- Mêmes edge functions IA via `useWaouhAI` (`reverse_geocode`, `enrich_business`, `parse_voice_business`, `parse_product_free_text`, `suggest_products`)
- Catégories custom partagées via `localStorage` (`waouh:custom-cat:business` / `…:product`) — déjà compatible web ↔ APK puisque c'est le même bundle.

## Hors périmètre

- Pas d'intégration Capacitor Camera/Geolocation natifs (les APIs web fonctionnent déjà dans la WebView Android).
- Pas de refonte des autres écrans partenaire (ventes, payouts).
- Pas de migration DB.

## Livrables (fichiers)

**Créés**
- `src/app-mobile/components/native/NativeFormScreen.tsx`
- `src/app-mobile/components/native/NativeCategoryPicker.tsx`
- `src/app-mobile/components/native/NativeSelectSheet.tsx`
- `src/app-mobile/components/native/NativeVilleQuartierPicker.tsx`
- `src/app-mobile/components/native/NativePhoneInput.tsx`
- `src/app-mobile/screens/partner/PartnerBusinessesNativeScreen.tsx`
- `src/app-mobile/screens/partner/BusinessFormNativeScreen.tsx`
- `src/app-mobile/screens/partner/PartnerProductsNativeScreen.tsx`
- `src/app-mobile/screens/partner/ProductFormNativeScreen.tsx`

**Modifiés**
- `src/app-mobile/screens/partner/PartnerBusinessesScreen.tsx` (utilise la version native au lieu de lazy-load web)
- `src/app-mobile/screens/partner/PartnerProductsScreen.tsx` (idem)

Aucun autre fichier touché. Web inchangé.
