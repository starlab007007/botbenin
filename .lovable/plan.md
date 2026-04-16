

# Plan : Mapping correct entre le formulaire et le Google Sheet

## Strategie

Adapter le **front + le hook** au schema **REEL** du Google Sheet sans toucher aux colonnes metier (`STATUT_ENVOI`, `DATE_ENVOI`, `ERREUR`, `TOTAL_CONTACT_TRAITE`). Ajouter `user_id` et `id` au sheet **de maniere additive** (sans ecraser les autres colonnes), pour que :
- Le filtrage par utilisateur soit reel (chaque user voit uniquement ses lignes)
- Update/delete par `id` fonctionne sur les lignes existantes
- Le toggle `STATUT(Actif/Inactif)` ecrive dans la BONNE colonne

## Bugs identifies

| # | Bug | Cause |
|---|---|---|
| 1 | Lignes existantes invisibles | Front re-genere un nouvel `id` a chaque refresh, casse update/delete |
| 2 | Append ecrase la ligne d'entetes | Writer reecrit `headers` avec `[user_id,id,id_campagne,...,statut]` -> detruit STATUT_ENVOI/DATE_ENVOI/ERREUR |
| 3 | Statut ecrit dans la mauvaise colonne | Front envoie `statut`, sheet a `STATUT(Actif/Inactif)` |
| 4 | Update/delete impossible | Pas de colonne `id` dans le sheet -> writer renvoie 400 "Colonne id non trouvee" |
| 5 | Tous les users voient toutes les lignes | Pas de colonne `user_id` -> reader injecte `user_id=currentUser` sur tout |

## Corrections

### 1. `supabase/functions/google-sheets-writer/index.ts` — append non-destructif

**Lignes 826-852** : Au lieu de comparer `headers.every(h => existing.includes(h))` et reecrire toute la ligne 1, faire :
- Lire les entetes existants
- Pour chaque header attendu manquant (`user_id`, `id`), **APPENDER** une nouvelle colonne a la fin (PUT sur `${sheetName}!{nextCol}1`) sans toucher aux colonnes existantes
- Recharger les entetes apres ajout
- Construire la ligne a appender en **respectant l'ordre des entetes reels du sheet** (les colonnes inconnues du payload restent vides)

### 2. `supabase/functions/google-sheets-writer/index.ts` — mapping statut

Dans `normalizeRowForSheet` (ligne 22) et dans `update_row` (ligne 396-401), ajouter un alias :
- Si le payload contient `statut` ET que le sheet a `statut_actif_inactif` (apres normalisation), ecrire dans cette colonne reelle.
- Mappage explicite : `statut` -> `STATUT(Actif/Inactif)`.

### 3. `src/hooks/useWhatsAppDiffusionGoogleSheets.ts` — preserver l'id du sheet

**Ligne 92-96** : NE PAS regenerer `id` si la ligne en a deja un (le reader fournit `gs_<ts>_<idx>` ou un vrai id). Garder l'id renvoye par le reader pour que update/delete fonctionnent.

```ts
.map((item) => ({
  ...item,
  id: item.id, // garder l'id du reader, ne jamais regenerer
  user_id: userId!,
}))
```

### 4. `src/hooks/useWhatsAppDiffusionGoogleSheets.ts` — sheet name correct

Le sheet reel s'appelle probablement la valeur indiquee par gid=215334820. Ajouter ce nom probable aux candidats (`Diffusion Whatsapp`, `Contacts`, etc.) ou recuperer dynamiquement via metadata API. Plus simple : essayer par `sheetId` (gid) en parallele de `sheetName`.

### 5. `src/hooks/useWhatsAppDiffusionGoogleSheets.ts` — payload addRow/updateRow

Pour qu'aucune colonne metier ne soit ecrasee, n'envoyer QUE les champs editables :
```ts
const editablePayload = {
  id_campagne, nom_campagne, nom_contact, contact_whatsapp, statut
};
```
Les colonnes `STATUT_ENVOI`, `DATE_ENVOI`, etc. seront laissees telles quelles par le writer corrige (point 1).

### 6. Migration douce des lignes existantes

Au premier `loadSheet` post-correctif, les lignes legacy n'ont pas de `user_id`. Le reader les marque `_isOrphan=true` et les attribue a l'utilisateur courant. Pour eviter que TOUS les users voient ces lignes, modifier le frontend filter :
- Si `_isOrphan === true`, ne PAS afficher (sauf si on ajoute un bouton "Reclamer ces contacts").
- Strict : afficher uniquement les lignes ou le sheet contient un `user_id` egal a l'utilisateur.

## Resume des fichiers modifies

| Fichier | Changement |
|---|---|
| `supabase/functions/google-sheets-writer/index.ts` | Append non-destructif (ajoute colonnes manquantes sans toucher aux existantes) + alias `statut` -> `STATUT(Actif/Inactif)` |
| `src/hooks/useWhatsAppDiffusionGoogleSheets.ts` | Preserver `id` du reader, filtrer les orphelins, n'envoyer que champs editables, essayer plusieurs noms de feuille |
| `src/components/business/knowledge-base/WhatsAppDiffusionSheetViewer.tsx` | Aucun changement structurel necessaire |

## Resultat attendu

- Apres la 1re ecriture (ajout d'un contact), le sheet aura 2 nouvelles colonnes a la fin : `user_id` et `id`, **toutes les autres colonnes preservees** (STATUT_ENVOI, DATE_ENVOI, ERREUR, TOTAL_CONTACT_TRAITE intactes).
- Chaque user ne voit QUE ses propres contacts (filtre strict `user_id`).
- Toggle Actif/Inactif sur le front -> ecrit dans `STATUT(Actif/Inactif)` reel du sheet.
- Edit/Delete fonctionnent (via colonne `id` ajoutee).

