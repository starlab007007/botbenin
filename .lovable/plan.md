
## Objectif

Sur `/app/bots` (app mobile), remplacer l'écran actuel (qui ne liste que les `bots`) par une vraie expérience **Création de Bots = Bases de Connaissances**, identique en fonctionnalité au web (`/modules/knowledge-bases`), mais en UI 100% native style Android : chaque action ouvre un écran plein écran (Activity), pas de Dialog/Popover/Accordéon web. Aucune ouverture de WebView externe. Backend, table, hooks, validations, exports : strictement identiques au web.

## Périmètre fonctionnel (parité web → mobile)

1. **Liste des bases de connaissances** (Mes Bots / Bases) — équiv. `KnowledgeBaseManager`
   - Cartes empilées (1 col) : badge secteur, nom, description, barre de complétion, badge "Bot actif", date.
   - FAB orange `+` en bas-droite (style Android) pour créer.
   - Tap carte → ouvre l'écran "Détail/Édition".
   - Long-press carte → bottom-sheet d'actions (Visualiser, Modifier, Exporter JSON/Excel/CSV/PDF, Supprimer).

2. **Wizard de création** — équiv. `KnowledgeBaseCreator` (3 étapes plein écran)
   - **Étape 1 — Secteur** : grille de templates (1 col mobile), cartes tactiles, icône secteur + couleur, badges tables.
   - **Étape 2 — Nom + Infos essentielles** : champ "Nom de la base" + tous les `structuralInfo` rendus avec inputs natifs typés (text/email/tel/url/date/time).
   - **Étape 3 — Tables de données** : liste de tables (au lieu d'Accordion). Tap sur une table → ouvre un écran plein écran listant les entrées (cards) avec FAB `+`.
   - En bas sticky : barre de progression + boutons "Précédent / Suivant / Enregistrer".

3. **Éditeur d'entrée de table** — équiv. `DataTableEditor` Dialog
   - Écran plein écran (`NativeFormScreen`), un champ par ligne, types natifs :
     - `text/number/email/phone/url/price` → `<input>` typé natif (clavier Android adapté).
     - `date/time/datetime` → `<input type=date|time|datetime-local>` (picker natif Android).
     - `textarea` → `<textarea>` plein largeur.
     - `select/multiselect` → bottom-sheet `NativeSelectSheet` (déjà existante).
     - `image/file` → bouton ouvrant le file picker natif (`<input type=file accept>` géré par Capacitor WebView → ouvre le sélecteur Android), upload vers bucket `knowledge_bases` Supabase, preview thumbnail.
     - `address` → champ texte + bouton "Utiliser ma position" (geolocation API).
   - Footer sticky : Annuler / Enregistrer.

4. **Visualisation / Édition d'une base existante** — équiv. `KnowledgeBaseViewer`
   - Header sticky vert : nom + badge secteur + bouton menu (export, supprimer).
   - Tabs scrollables horizontalement (chips) : "Infos" + une chip par table.
   - Contenu : `StructuralInfoForm` natif ou liste de cards d'entrées avec FAB `+`.
   - Bouton "Enregistrer" sticky bas (visible si modifications).
   - Mode **Google Sheet** (ecommerce/restaurant/whatsapp_diffusion) : afficher un écran natif lecture seule listant les entrées synchronisées (réutiliser hooks `useEcommerceGoogleSheets`, `useRestaurationGoogleSheets`, `useWhatsAppDiffusionGoogleSheets`), sans iframe ni WebView.

5. **Export** : JSON / Excel / CSV / PDF — réutiliser `exportKnowledgeBase` du hook (génère et télécharge via Blob/`URL.createObjectURL`). Sur Android Capacitor, le blob déclenche le téléchargement natif.

6. **Suppression** : bottom-sheet de confirmation native (au lieu d'`AlertDialog`).

## Architecture

```text
/app/bots                   → KnowledgeBasesListScreen (remplace BotsScreen actuel)
/app/bots/new               → KnowledgeBaseCreateWizard (étapes 1→2→3, plein écran)
/app/bots/:id               → KnowledgeBaseDetailScreen (édition/visualisation)
/app/bots/:id/table/:tableId → NativeTableEntriesScreen (liste des entrées d'une table)
/app/bots/:id/table/:tableId/entry/:index? → NativeEntryFormScreen (ajout/édition d'entrée)
```

Tous les écrans utilisent :
- `MobileScreenHeader` (sticky vert, safe-area-inset-top) pour l'en-tête.
- `NativeFormScreen` pour les écrans-formulaires (footer sticky bouton primaire).
- `NativeSelectSheet` pour les selects et menus d'actions.
- Pas de `Dialog`, `Popover`, `AlertDialog`, `Accordion`, `DropdownMenu`.

## Backend & synchro

- **Aucun changement DB** : utilise `knowledge_bases` existante + bucket `knowledge_bases`.
- Réutilise les hooks tels quels : `useKnowledgeBases`, `useKnowledgeBaseTemplates`, `useEcommerceGoogleSheets`, `useRestaurationGoogleSheets`, `useWhatsAppDiffusionGoogleSheets`.
- Realtime : ajouter un abonnement `postgres_changes` sur `knowledge_bases` filtré sur `user_id` pour live-update la liste (parité avec `BotsScreen` actuel).

## Détails techniques

- **File picker natif** : `<input type=file>` est intercepté par Capacitor sur Android → ouvre le sélecteur natif (galerie/fichiers). Pas besoin de plugin si ça reste un upload simple ; pas de WebView externe.
- **Pickers date/heure natifs** : `<input type=date|time|datetime-local>` rendent les pickers Android natifs sur Capacitor WebView.
- **Géoloc** : `navigator.geolocation.getCurrentPosition` (déjà utilisé dans le projet).
- **Validation** : reprise stricte des règles du web (`required`, `pattern`, `min/max`).
- **Mode Google Sheet** : pas d'iframe — on liste les entrées renvoyées par les hooks dans des cards natives, plus bouton "Rafraîchir".

## Fichiers à créer

- `src/app-mobile/screens/bots/KnowledgeBasesListScreen.tsx`
- `src/app-mobile/screens/bots/KnowledgeBaseCreateWizard.tsx`
- `src/app-mobile/screens/bots/KnowledgeBaseDetailScreen.tsx`
- `src/app-mobile/screens/bots/NativeTableEntriesScreen.tsx`
- `src/app-mobile/screens/bots/NativeEntryFormScreen.tsx`
- `src/app-mobile/components/bots/NativeSectorPicker.tsx` (grille de secteurs)
- `src/app-mobile/components/bots/NativeStructuralInfoForm.tsx`
- `src/app-mobile/components/bots/NativeFieldRenderer.tsx` (rend un champ selon son type, version mobile)
- `src/app-mobile/components/bots/NativeKbActionsSheet.tsx` (bottom-sheet actions)
- `src/app-mobile/components/bots/NativeGoogleSheetView.tsx` (lecture seule pour modes Sheet)

## Fichiers à modifier

- `src/AppMobile.tsx` :
  - Remplace `MobileBots` lazy import par `KnowledgeBasesListScreen`.
  - Remplace `MobileCreateBot` par `KnowledgeBaseCreateWizard`.
  - Ajoute routes `/app/bots/:id`, `/app/bots/:id/table/:tableId`, `/app/bots/:id/table/:tableId/entry/:index?`.
- `src/app-mobile/layouts/BottomTabBar.tsx` : libellé "Bots" inchangé (le tab pointe déjà `/app/bots`).

## Hors périmètre

- Pas de changement backend, pas de migration SQL.
- Pas de modification du web `/modules/knowledge-bases`.
- Pas d'ajout de plugin Capacitor (file picker / date picker fonctionnent via WebView).
- L'ancien `CreateBotWizard` (4 étapes "bot simple") est retiré au profit du wizard Bases de Connaissances, qui est le vrai équivalent web "Création Bots".

