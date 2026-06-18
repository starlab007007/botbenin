## Objectif

Afficher le panneau animé WAOUH **également sur mobile/tablette**, placé **en bas**, sous le texte "En continuant, vous acceptez nos conditions d'utilisation.", et le rendre pleinement responsive.

## Changements

**Fichier modifié** : `src/app-mobile/screens/auth/AuthHomeScreen.tsx` uniquement.

1. **Retirer `hidden lg:flex`** sur l'aside gauche desktop — il reste visible en desktop (colonne gauche, layout actuel).
2. **Ajouter une seconde instance** de `<WaouhFlowAnimation />` à l'intérieur de la colonne droite, **après** le `<p>` "En continuant, vous acceptez nos conditions d'utilisation.", **visible uniquement < lg** (`lg:hidden`). Ainsi :
   - Mobile / tablette portrait : un seul flux affiché en bas (sous le CTA).
   - Desktop (≥ lg) : un seul flux affiché à gauche (comme aujourd'hui).
3. **Responsive du composant `WaouhFlowAnimation`** :
   - Conteneur : `w-full max-w-[640px] mx-auto px-1`.
   - Colonne centrale Orchestration : passer de `w-[140px]` fixe à `w-[26%] sm:w-[140px]` (proportionnel sur petit écran).
   - Gaps : `gap-2 sm:gap-3`.
   - Tailles de texte : étapes `text-[10px] sm:text-[11px]`, titres `text-[10px] sm:text-xs`, bandeau bas `text-[10px] sm:text-[11px]`.
   - Icônes : déjà `w-3.5 h-3.5` → OK. Badge numéro `w-5 h-5` → `w-4 h-4 sm:w-5 sm:h-5`.
   - Titre H2 : `text-xl sm:text-2xl`.
   - Truncate label étapes pour éviter le débordement sur très petits écrans.
4. **Espacement mobile** : wrapper du flux mobile avec `mt-8 w-full` pour aérer sous le texte légal, et `pb-[env(safe-area-inset-bottom)]` pour iOS.

## Hors périmètre
- Pas de modif desktop (layout 2 colonnes inchangé).
- Pas de modif du contenu d'authentification existant.
- Pas de nouveau fichier, pas de dépendance.
