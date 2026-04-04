

# Plan : Responsive mobile complet pour le module Creation Bots

## Probleme

Sur mobile (Android/iPhone), plusieurs elements ne s'adaptent pas correctement :
1. **Dialog/Popup de connexion et inscription** (`AuthPage.tsx`, `AuthModal.tsx`) : le `DialogContent` utilise `sm:max-w-md` mais n'a pas de padding mobile ni de `max-h-[100dvh]` pour petits ecrans, le contenu peut deborder
2. **Tabs E-commerce/Restauration** : sur mobile les onglets n'affichent que les icones sans labels, rendant la navigation confuse
3. **Dialogs d'ajout/edition** dans `EcommerceSheetViewer` et `RestaurationSheetViewer` : `max-w-[95vw]` mais pas de gestion plein ecran mobile
4. **Base DialogContent UI** : manque `max-h-[100dvh]` et `overflow-y-auto` par defaut sur mobile

## Fichiers a modifier

### 1. `src/components/ui/dialog.tsx`
- Ajouter au `DialogContent` base des classes mobile : `max-h-[100dvh] overflow-y-auto rounded-t-xl sm:rounded-lg p-4 sm:p-6`
- Cela corrige automatiquement TOUS les dialogs de l'app (auth, edition, suppression)

### 2. `src/components/AuthModal.tsx`
- Changer `sm:max-w-md` en `max-w-[95vw] sm:max-w-md`
- Reduire les espacements internes sur mobile (gap-3 au lieu de gap-4)
- TabsTrigger : texte plus petit sur mobile (`text-xs sm:text-sm`)

### 3. `src/pages/AuthPage.tsx`
- Meme ajustement : `max-w-[95vw] sm:max-w-md` sur le DialogContent
- TabsTrigger responsive avec `text-xs sm:text-sm`
- Titre plus petit sur mobile : `text-xl sm:text-2xl`

### 4. `src/components/business/knowledge-base/EcommerceSheetViewer.tsx`
- Tabs mobile : afficher les labels courts a cote des icones (pas caches)
- Dialog edition : sur mobile utiliser `max-w-[100vw] h-[100dvh] rounded-none` pour plein ecran
- Grid formulaire : `grid-cols-1` sur mobile (deja fait), verifier gap

### 5. `src/components/business/knowledge-base/RestaurationSheetViewer.tsx`
- Memes corrections que EcommerceSheetViewer (labels tabs visibles, dialog plein ecran mobile)

### 6. `src/components/business/knowledge-base/KnowledgeBaseViewer.tsx`
- Header : empiler verticalement les boutons sur mobile
- Progress card : padding reduit

### 7. `src/components/business/knowledge-base/KnowledgeBaseCreator.tsx`
- Accordion trigger : padding reduit sur mobile
- Card resume : grid stats responsive

### 8. `src/components/business/knowledge-base/DataTableEditor.tsx`
- Dialog plein ecran sur mobile

## Details techniques

Principe central : modifier le composant `DialogContent` de base pour ajouter `max-h-[100dvh]` et `overflow-y-auto` afin que tous les popups scrollent correctement sur petits ecrans sans etre coupes.

Pour les tabs des Sheet viewers : remplacer `<span className={isMobile ? 'hidden' : ''}>` par des labels toujours visibles mais raccourcis sur mobile.

Pour les dialogs d'edition : sur mobile, utiliser des classes conditionnelles pour occuper tout l'ecran (`inset-0` style) au lieu d'un petit popup centre.

