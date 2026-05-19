
# Plan : Espace Partenaire intelligent, Bénin par défaut, ultra-rapide

## Objectifs
- Remplacer les champs texte libres par des **listes intelligentes** (Combobox avec recherche + saisie libre fallback).
- Tous les champs téléphone / WhatsApp / Mobile Money → composant **PhoneInput** avec drapeau pays + indicatif, **+229 Bénin par défaut**.
- **Autocomplete ville/quartier** dès la saisie (Bénin par défaut, puis suggestions IA).
- Design intuitif, responsive, chargement ultra-rapide (lazy data, debounce, virtualization quand utile).

## Composants nouveaux

### 1. `src/components/ui/phone-input.tsx`
PhoneInput unifié :
- Sélecteur pays compact (drapeau + indicatif), **default = BJ (+229)**.
- Liste pays prioritaires Afrique de l'Ouest (BJ, TG, CI, SN, BF, NG, GH, ML, NE), puis reste du monde.
- Format automatique (espaces tous les 2 chiffres pour BJ : `97 12 34 56`).
- Validation longueur selon pays. Stocke en E.164 (`+22997123456`).
- Variant `momo` : ajoute sélecteur opérateur (MTN/Moov/Celtiis) à côté.
- Réutilise `react-phone-number-input` (déjà-ish léger) **OU** implémentation maison ~120 lignes pour rester léger et stylé via tokens.

### 2. `src/components/ui/smart-combobox.tsx`
Wrapper autour de `cmdk` (déjà présent via shadcn `Command`) :
- Props : `options`, `value`, `onChange`, `placeholder`, `allowCustom`, `onSearch?` (async pour IA).
- Affiche suggestions filtrées + option "Utiliser : {texte saisi}" si `allowCustom`.
- Debounce 250 ms pour `onSearch`.

### 3. `src/components/waouh/LocationAutocomplete.tsx`
- Deux SmartCombobox liés : **Ville** et **Quartier**.
- Données statiques `src/data/beninLocations.ts` (villes principales + quartiers connus de Cotonou, Porto-Novo, Calavi, Parakou…).
- Quand l'utilisateur tape ≥3 caractères et que rien ne matche → appel IA `geocode_address` ou nouvelle action `suggest_locations` pour récupérer suggestions OpenStreetMap (debounce 400 ms).
- Affiche drapeau 🇧🇯 et "Bénin" en pré-réglage.

### 4. `src/data/beninLocations.ts`
- Liste statique : 30+ villes du Bénin avec leurs quartiers principaux (Cotonou : Cadjèhoun, Akpakpa, Fidjrossè, Gbégamey, Sainte-Rita, Ganhi… / Calavi : Godomey, Kpota, Zogbadjè…).
- Catégories d'entreprises typiques (réutilise `africanContext.businessTypes`, étendu).
- Unités produits (kg, sac, pièce, litre, paquet, carton, plat, bouteille…).
- Opérateurs Mobile Money (MTN, Moov, Celtiis).

## Modifications pages partenaire

### `src/pages/partner/PartnerBusinessesPage.tsx`
- **Catégorie** : SmartCombobox depuis `businessTypes` (allowCustom).
- **Ville / Quartier** : `LocationAutocomplete`.
- **Téléphone / WhatsApp** : `PhoneInput` (+229 par défaut).
- **Mobile Money** : `PhoneInput variant="momo"` (sélecteur opérateur intégré, +229 par défaut).
- Pays caché — toujours Bénin par défaut, mais modifiable via le sélecteur du PhoneInput.

### `src/pages/partner/PartnerProductsPage.tsx`
- **Catégorie produit** : SmartCombobox (catégories selon type de business).
- **Unité** : SmartCombobox (unités courantes).
- Suggestions IA déjà OK, juste relier au nouveau Combobox dans le dialog.

### `src/pages/partner/PartnerDashboardPage.tsx` (enrôlement)
- Tous les champs contact → `PhoneInput`.
- Champs ville/quartier → `LocationAutocomplete`.

### Admin Waouh
- `AdminWaouhPartnersPage` : filtres ville/catégorie → SmartCombobox.
- Téléphones affichés formatés via util `formatPhone`.

## Performance

- **Lazy load** `cmdk` listes (déjà cas), virtualisation seulement si >200 items.
- `PhoneInput` : drapeaux en **SVG inline** (pas d'images), pas de lib lourde.
- `LocationAutocomplete` : index pré-construit (Map) pour filtrer en O(1) sur les villes.
- Mémoïsation (`useMemo`) des listes filtrées.
- `React.lazy` pour les dialogs lourds (déjà partiel).
- Requêtes Supabase : `select` colonnes ciblées au lieu de `*` sur les listes (businesses, products).
- Préchargement prefetch des pages partenaires depuis le sidebar (mouseover).

## Edge function

Ajouter action `suggest_locations` à `waouh-partner-ai` :
- Input : `{ query, country: 'BJ' }`
- Appelle Nominatim (`q={query}&countrycodes=bj&addressdetails=1&limit=5`)
- Retourne `[{ ville, quartier, lat, lng, label }]`

## Design

- Tokens existants uniquement (pas de couleurs en dur).
- Dialogs : `max-h-[90dvh] overflow-y-auto` (pattern projet).
- PhoneInput : hauteur cohérente avec `Input` (h-10), focus ring identique.
- Drapeau 🇧🇯 visible partout où le pays s'applique → renforce l'identité Bénin.

## Fichiers touchés

**Nouveaux**
- `src/components/ui/phone-input.tsx`
- `src/components/ui/smart-combobox.tsx`
- `src/components/waouh/LocationAutocomplete.tsx`
- `src/data/beninLocations.ts`
- `src/lib/phone.ts` (formatPhone, parsePhone, validatePhone)

**Modifiés**
- `src/pages/partner/PartnerBusinessesPage.tsx`
- `src/pages/partner/PartnerProductsPage.tsx`
- `src/pages/partner/PartnerDashboardPage.tsx`
- `src/pages/admin/AdminWaouhPartnersPage.tsx`
- `supabase/functions/waouh-partner-ai/index.ts` (action `suggest_locations`)

Aucune migration DB.
