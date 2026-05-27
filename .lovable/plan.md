## Problème

Dans `/app/bots/:id`, pour les bases en mode Google Sheets (Restauration, E-commerce, WhatsApp Diffusion), les onglets de tables (Menu, Promotions, Commandes, etc.) affichent uniquement le message "Synchronisé via Google Sheets — lecture seule". Aucune donnée n'est chargée, ni modifiable, ni supprimable.

La cause: `KnowledgeBaseDetailScreen.tsx` (lignes 116-124) court-circuite l'affichage avec un placeholder dès que `isGoogleSheetMode` est vrai, alors que les hooks existants (`useEcommerceGoogleSheets`, `useRestaurationGoogleSheets`, `useWhatsAppDiffusionGoogleSheets`) supportent déjà `loadSheet`, `addRow`, `updateRow`, `deleteRow` synchronisés bidirectionnellement avec le Sheet via les edge functions `google-sheets-reader` / `google-sheets-writer`.

## Objectif

Pour **toutes** les feuilles Google Sheets (Restauration, E-commerce, WhatsApp Diffusion), permettre depuis l'application mobile native:
- Voir la liste des lignes de la feuille
- Ajouter une nouvelle ligne (FAB `+`)
- Modifier une ligne (tap → form natif plein écran)
- Supprimer une ligne (swipe ou bouton dans le form)
- Synchronisation automatique avec Google Sheets après chaque opération
- UI 100% native (pas de WebView, pas de tableau web)

## Architecture

### Nouveau hook unifié

`src/app-mobile/hooks/useSheetCrud.ts` — wrapper qui sélectionne dynamiquement le bon hook selon `template.id`:

```ts
useSheetCrud(templateId, userId) → {
  data, isLoading, isWriting,
  loadSheet(sheetName),
  addRow(sheetName, row),
  updateRow(sheetName, rowId, fields),
  deleteRow(sheetName, rowId)
}
```

### Mapping table.id → sheetName

Utiliser l'ordre de `template.tables` ↔ `template.googleSheetConfig.sheets`:
- Restaurant: menu→Menu, commandes→Commandes, clients→Clients, reservations→Reservations, faq→(pas de sheet, fallback local)
- Ecommerce: produits→Produits, commandes→Commandes, promotions→Promotions, clients→Clients, infos→Infos_Boutique
- WhatsApp Diffusion: → Sheet1

Helper `getSheetNameForTable(template, tableId)` centralisé.

### Modifications de `KnowledgeBaseDetailScreen.tsx`

Remplacer le bloc placeholder par un rendu natif identique au mode non-Sheet:
- Liste de cards (réutiliser le composant existant)
- FAB "+ Ajouter une entrée"
- Tap sur une card → écran d'édition
- Chargement automatique de `loadSheet(sheetName)` au changement d'onglet
- État de chargement + pull-to-refresh
- Badge discret "🔄 Synchronisé Google Sheets" en haut du contenu (au lieu du gros placeholder bloquant)

### Modifications de `NativeEntryFormScreen.tsx`

Détecter si la base est en mode Google Sheets:
- Si oui → appeler `addRow` / `updateRow` / `deleteRow` du hook Sheets au lieu d'écrire dans `kb.data`
- Si non → comportement actuel (sauvegarde dans la table `knowledge_bases`)
- Bouton "Supprimer" dans le form en mode édition

### Composants natifs

- `SheetRowCard` — card mobile native pour afficher une ligne (titre + sous-titre + image éventuelle, chevron, swipe-to-delete optionnel)
- `SheetEmptyState` — état vide avec illustration et CTA
- `SheetSyncBadge` — petit badge animé indiquant le statut de sync

## Fichiers à créer

- `src/app-mobile/hooks/useSheetCrud.ts`
- `src/app-mobile/utils/sheetMapping.ts` (helper `getSheetNameForTable`)
- `src/app-mobile/components/bots/SheetRowCard.tsx`
- `src/app-mobile/components/bots/SheetSyncBadge.tsx`

## Fichiers à modifier

- `src/app-mobile/screens/bots/KnowledgeBaseDetailScreen.tsx` — retirer le placeholder, intégrer `useSheetCrud`, charger sheet à l'ouverture de l'onglet
- `src/app-mobile/screens/bots/NativeEntryFormScreen.tsx` — brancher add/update/delete sur le hook Sheets quand `isGoogleSheetMode`

## Backend

Aucune modification. Les edge functions `google-sheets-reader` et `google-sheets-writer` (opérations `append`, `update_row`, `delete_by_id`) sont déjà en place et testées par les modules web.

## Hors scope

- Modifications du module web
- Modifications des templates ou de la structure des feuilles Google Sheets
- Création de nouvelles edge functions
