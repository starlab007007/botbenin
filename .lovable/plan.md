## Objectif

Stabiliser le module **Waouh Partenaire** et rendre la sélection de **catégorie** (Nouvelle entreprise + Ajout produit) plus fluide, défilable, et permettre d'ajouter une nouvelle catégorie manuellement — sur web et mobile (les écrans mobile réutilisant déjà les pages web via `lazy import`, une seule correction profite aux deux).

## Problèmes constatés

1. **SmartCombobox** : le `PopoverContent` n'a pas de hauteur max explicite, la liste de 40+ catégories peut sortir de l'écran sur mobile et le scroll tactile est capricieux dans un `Dialog` à `overflow-y-auto`.
2. **Pattern « Autre » redondant** : dans `PartnerBusinessesPage` et `PartnerProductsPage`, après avoir choisi « Autre » on affiche un second `Input` — alors que le combobox accepte déjà la saisie libre (`allowCustom`). Confus et bugué (valeur sentinelle `" "` espace).
3. **Catégories personnalisées non mémorisées** : si le partenaire saisit « Vente de pagne », elle disparaît au prochain produit.
4. **Stabilité** :
   - `load()` ne gère pas les erreurs Supabase.
   - États incohérents si `partner` est `null` (écran blanc au lieu d'un message clair sur mobile).
   - Pas de garde anti double-clic sur boutons de sauvegarde (déjà via `saving` mais pas sur suggestions IA / suppression).
   - Dialog mobile peut dépasser `100dvh` quand le clavier s'ouvre.

## Changements

### 1. `src/components/ui/smart-combobox.tsx` — fluidité & mobile
- Donner au `CommandList` une `max-h-[280px] sm:max-h-[320px] overflow-y-auto overscroll-contain` pour un défilement tactile propre.
- Ajouter `sideOffset={4} collisionPadding={12}` au `PopoverContent` et `w-[min(--radix-popover-trigger-width,calc(100vw-2rem))]` pour ne jamais déborder sur petit écran.
- Quand `allowCustom` et qu'aucun item ne correspond, **transformer le `CommandEmpty`** en CTA cliquable « + Créer la catégorie « X » » (plus visible que l'actuel groupe « Personnalisé »).
- Forcer `inputMode="search"` et `autoComplete="off"` sur le champ de recherche.
- Garder la rétro-compatibilité de l'API (props inchangées).

### 2. Hook `useCustomCategories` (nouveau)
- Fichier : `src/hooks/useCustomCategories.ts`.
- Stocke les catégories personnalisées en `localStorage` par bucket (`waouh:custom-cat:business` / `waouh:custom-cat:product`) et fusionne avec la liste de base sans doublons (insensible à la casse/espaces).
- API : `{ all: string[], add: (value: string) => void }`.
- Léger, zéro backend — décision assumée (les catégories restent personnelles à l'appareil, suffisant pour le besoin « avoir la sienne sous la main »).

### 3. `src/pages/partner/PartnerBusinessesPage.tsx`
- Remplacer le bloc combobox + `Input` secondaire par **un seul** `SmartCombobox` :
  ```tsx
  const { all: categories, add: addCategory } = useCustomCategories('business', BUSINESS_CATEGORIES);
  <SmartCombobox
    value={form.categorie}
    onChange={v => { setForm({ ...form, categorie: v }); addCategory(v); }}
    options={categories}
    placeholder="Type d'activité (tape pour chercher ou créer)"
    allowCustom
    invalid={!!errors.categorie}
    errorMessage={errors.categorie}
  />
  ```
- Supprimer la valeur sentinelle `" "` et toute la logique « Autre → input ».
- Robustesse `load()` : try/catch + toast d'erreur, état `loadError` affiché si Supabase échoue.
- Garde claire si `!partner` (déjà présent, on garde).

### 4. `src/pages/partner/PartnerProductsPage.tsx`
- Même remplacement pour la catégorie produit, via `useCustomCategories('product', PRODUCT_CATEGORIES)`.
- Idem : un seul combobox, suppression du `Input` « Précisez votre catégorie ».
- `load()` enrobé try/catch + toast.
- Empêcher double-clic sur `addPicked` (flag `adding`).

### 5. Polissage Dialog mobile
- Sur les deux pages, remplacer `max-h-[90dvh]` par `max-h-[92dvh] sm:max-h-[90vh]` et ajouter `pb-[env(safe-area-inset-bottom)]` sur le contenu pour iOS/Android avec clavier ouvert.

## Hors-scope (à confirmer si tu veux que je l'ajoute)
- Persistance serveur des catégories personnalisées (table Supabase partagée entre appareils).
- Renommage / suppression d'une catégorie custom.
- Refonte visuelle des cartes entreprise/produit.

## Détails techniques

- Aucun changement de schéma DB.
- Aucune nouvelle dépendance npm.
- Les écrans mobile `PartnerBusinessesScreen` et `PartnerProductsScreen` important `PartnerBusinessesPage`/`PartnerProductsPage` en lazy : **toutes les améliorations sont automatiquement visibles dans l'APK** sans toucher au dossier `src/app-mobile/`.
- `SmartCombobox` est utilisé ailleurs (operator MoMo, unité, etc.) — l'API restant identique, aucun appel existant n'est cassé.

## Fichiers touchés

```text
src/components/ui/smart-combobox.tsx        (modifié)
src/hooks/useCustomCategories.ts            (nouveau)
src/pages/partner/PartnerBusinessesPage.tsx (modifié — bloc catégorie + load)
src/pages/partner/PartnerProductsPage.tsx   (modifié — bloc catégorie + load + addPicked)
```
