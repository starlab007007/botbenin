## Objectif
Corriger la responsivité de **toutes les modales (popups)** du module *Création Bots → Mes bases de connaissances* pour qu'elles s'affichent et fonctionnent correctement sur **toutes les tailles de téléphone** (320 px → 480 px), en respectant la règle projet `mem://ui/mobile-dialog-responsive-pattern` (90vw / 90dvh, structure flex-col, header/footer fixes, contenu scrollable).

## Problèmes diagnostiqués

| Fichier | Problème actuel | Symptôme mobile |
|---|---|---|
| `DataTableEditor.tsx` (popup principal *Ajouter / Modifier une entrée*) | `w-[90vw]` sans `max-w` calc, grille interne `md:grid-cols-2` non protégée, padding `p-4 sm:p-6` cumulé | Bords coupés sur écrans < 360 px, débordement horizontal |
| `EcommerceSheetViewer.tsx` | Combo `inset-0` + `translate-x/y` du Dialog de base → conflit de positionnement, plein-écran mobile sans `flex flex-col` | Boutons en dehors de l'écran, contenu non scrollable |
| `RestaurationSheetViewer.tsx` | Même pattern que Ecommerce | Idem |
| `WhatsAppDiffusionSheetViewer.tsx` | `overflow-y-auto` sur tout le dialog, footer scrolle avec le contenu | Boutons d'action inaccessibles au pouce |
| `KnowledgeBaseManager.tsx` (AlertDialog suppression) | Pas de `max-h` mobile | OK mais à harmoniser |

## Modifications à appliquer

### 1. `DataTableEditor.tsx` (le pop le plus critique)
Remplacer la classe `DialogContent` par :
```
className="flex flex-col w-[95vw] max-w-[calc(100vw-1rem)] sm:max-w-2xl
           h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[85vh]
           overflow-hidden p-0 rounded-2xl sm:rounded-lg border"
```
- Header/footer déjà `shrink-0` ✅
- Contenu central déjà `flex-1 overflow-y-auto min-h-0` ✅
- Forcer `grid-cols-1` sur mobile, `md:grid-cols-2` à partir de 768 px ✅ (déjà OK)

### 2. `EcommerceSheetViewer.tsx` & `RestaurationSheetViewer.tsx`
Remplacer le pattern plein-écran complexe par le pattern projet standard :
```
className="flex flex-col w-[95vw] max-w-[calc(100vw-1rem)] sm:max-w-3xl
           h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[85vh]
           overflow-hidden p-0 rounded-2xl sm:rounded-lg"
```
Restructurer le contenu interne en 3 zones : header `shrink-0 p-4 border-b`, body `flex-1 overflow-y-auto p-4`, footer `shrink-0 p-4 border-t`. Le bouton de fermeture Radix reste toujours visible en haut à droite.

### 3. `WhatsAppDiffusionSheetViewer.tsx`
Convertir au pattern flex-col :
```
className="flex flex-col w-[95vw] max-w-[calc(100vw-1rem)] sm:max-w-md
           h-[90dvh] sm:h-auto max-h-[90dvh] sm:max-h-[85vh]
           overflow-hidden p-0 rounded-2xl sm:rounded-lg"
```
Séparer formulaire (scrollable) des boutons (fixes en bas).

### 4. `KnowledgeBaseManager.tsx` (AlertDialog)
Harmoniser :
```
className="max-w-[95vw] sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl sm:rounded-lg"
```

### 5. `dialog.tsx` (composant de base) — défensif
Remplacer `max-h-[100dvh]` par `max-h-[95dvh]` afin d'éviter que les dialogs touchent la barre d'adresse iOS Safari par défaut (sans casser les overrides existants).

## Vérification après implémentation
- Tester en preview à 320 px (iPhone SE), 375 px (iPhone 12 mini), 414 px (iPhone Pro Max), 768 px (iPad)
- Vérifier sur chaque popup : aucun débordement horizontal, header + footer toujours visibles, contenu scrollable au centre, bouton de fermeture accessible
- Confirmer que sur desktop (≥ sm) le rendu reste identique (max-width 2xl/md, hauteur auto)

## Hors scope
- Aucun changement fonctionnel (pas de modification de la logique de sauvegarde, des champs, ou des appels Supabase)
- Aucun changement aux autres modules (ces patterns servent de référence pour la KB uniquement)
- Mémoire projet `mem://ui/mobile-dialog-responsive-pattern` déjà documentée — pas de mise à jour mémoire nécessaire
