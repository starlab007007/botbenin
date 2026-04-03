

# Plan : Supprimer les doublons — afficher uniquement le contenu Google Sheets

## Probleme identifie

Dans `KnowledgeBaseViewer.tsx`, quand un template a une config Google Sheets (E-commerce ou Restauration), le composant affiche **deux fois** les memes donnees :
1. Les onglets du template (Infos Essentielles, Produits, Commandes, Clients, etc.) via `DataTableEditor` — donnees locales vides ou redondantes
2. Le viewer Google Sheets (`EcommerceSheetViewer` / `RestaurationSheetViewer`) en dessous — les vraies donnees synchronisees

Resultat : doublons visuels de Produits, Commandes, Promos, Clients, etc.

## Solution

Quand un template a `googleSheetConfig` (E-commerce ou Restauration), afficher **uniquement** le Google Sheets viewer correspondant. Masquer les onglets template (`DataTableEditor` + `StructuralInfoForm`) qui ne servent pas puisque toutes les infos essentielles sont dans le Google Sheet.

## Fichier a modifier

### `src/components/business/knowledge-base/KnowledgeBaseViewer.tsx`

- Ajouter une condition : `const isGoogleSheetMode = template.googleSheetConfig && (template.id === 'ecommerce' || template.id === 'restaurant');`
- Si `isGoogleSheetMode` est vrai : ne pas rendre le bloc `<Tabs>` (onglets Infos Essentielles + tables template), afficher uniquement le viewer Google Sheets
- Conserver le header (bouton retour, nom, badge, progression, export, save)
- Le bouton "Enregistrer" et l'export restent disponibles mais les onglets locaux disparaissent

Cela supprime tout doublon : un seul endroit pour gerer les donnees, le Google Sheet synchronise.

