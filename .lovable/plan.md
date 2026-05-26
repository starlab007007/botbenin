
## Objectif

Sur l'interface web bot.bj → Création Bots → **Ma base Diffusion WhatsApp**, chaque utilisateur connecté ne voit, n'ajoute, ne modifie et ne supprime QUE ses propres contacts. Tous les numéros sont normalisés au format Bénin officiel post-réforme, et chaque action (ajouter / modifier / activer / désactiver / supprimer) est appliquée en temps réel sur le Google Sheet partagé.

## État actuel (déjà en place)

- Hook `useWhatsAppDiffusionGoogleSheets.ts` + viewer `WhatsAppDiffusionSheetViewer.tsx` connectés aux edge functions `google-sheets-reader` / `google-sheets-writer`.
- Filtre strict `user_id === auth.uid()` côté lecture (les lignes orphelines sont rejetées).
- CRUD complet (add / update / delete / toggle statut) déjà câblé sur le Sheet.

## Ce qui manque / à corriger

1. **Normalisation téléphone Bénin (réforme 2021)**  
   La validation actuelle n'accepte que `+229XXXXXXXX` (8 chiffres). On doit accepter et convertir automatiquement :  
   - `+229XXXXXXXX` (8 chiffres, ancien format)  
   - `+22901XXXXXXXX` (10 chiffres avec préfixe `01`, nouveau format)  
   - Saisies libres `01XXXXXXXX`, `97XXXXXX`, `00229...`, espaces / tirets → normaliser  
   Canonique stocké dans le Sheet : `+229XXXXXXXX` (8 chiffres) ET `+22901XXXXXXXX` (10 chiffres) lorsque convertible, le format 10 chiffres étant le préféré pour WhatsApp post-réforme.

2. **Import intelligent de contacts**  
   Bouton "Importer" à côté de "Ajouter" qui ouvre une modale avec 3 modes :  
   - **Coller du texte** (numéros séparés par virgule, espace ou retour à la ligne, avec ou sans nom au format `Nom; +22901XXXXXXXX`)  
   - **Fichier CSV/Excel** (`nom,whatsapp` ou `name,phone` — détection auto des colonnes)  
   - **vCard** (export contacts téléphone)  
   Pipeline :  
   - parse → normalisation Bénin → déduplication contre la liste actuelle de l'utilisateur → aperçu (X valides, Y invalides, Z doublons) → confirmation → append batch dans le Sheet avec `user_id` + `id_campagne` auto.

3. **Synchronisation temps-réel bidirectionnelle**  
   - À chaque mutation : `loadSheet()` est déjà rappelé après `addRow`, mais pas après `updateRow` / `deleteRow` (optimistic UI seulement). Ajouter un refresh debounced (1.5 s) pour aligner avec ce qui est réellement dans le Sheet.  
   - Polling léger (toutes les 30 s) quand l'onglet est actif, pour récupérer les modifications faites directement dans Google Sheets.  
   - Badge "Dernière sync" déjà présent, indiquer aussi "En direct" quand le polling tourne.

4. **Isolation utilisateur renforcée**  
   - Vérifier côté edge function `google-sheets-writer` que `userId` du body correspond bien au JWT (rejeter sinon).  
   - Pour `update_row` / `delete_by_id`, vérifier que la ligne ciblée a bien `user_id === auth.uid()` avant d'écrire.

5. **UX**  
   - Champ téléphone avec drapeau 🇧🇯 +229 figé et input numérique (réutiliser `NativePhoneInput` simplifié).  
   - Affichage formaté lisible (`+229 01 97 12 34 56`) via `PhoneCell`.  
   - Message d'erreur clair : "Numéro WhatsApp invalide. Acceptés : 8 chiffres (97XXXXXX) ou 10 chiffres (0197XXXXXX)."

## Fichiers à toucher

- `src/lib/phone.ts` — ajouter `normalizeBeninWhatsApp(raw)` qui retourne `{ e164_8: '+229XXXXXXXX', e164_10: '+22901XXXXXXXX', valid: boolean }`.
- `src/components/business/knowledge-base/WhatsAppDiffusionSheetViewer.tsx` —  
  - remplacer `validatePhone` par la nouvelle helper,  
  - ajouter bouton "Importer" + modale d'import,  
  - utiliser `PhoneCell` pour l'affichage,  
  - polling 30 s.
- `src/components/business/knowledge-base/ImportWhatsAppContactsDialog.tsx` *(nouveau)* — modale d'import (texte / CSV / vCard) + parsing + aperçu + validation.
- `src/hooks/useWhatsAppDiffusionGoogleSheets.ts` —  
  - `addRows(rows[])` batch pour l'import,  
  - reload debounced après `updateRow` / `deleteRow`,  
  - polling optionnel via `enablePolling: boolean`.
- `supabase/functions/google-sheets-writer/index.ts` — vérification JWT.uid === body.userId + check propriétaire sur update/delete.

## Détails techniques

```text
Pipeline de normalisation
─────────────────────────
saisie brute ──► strip non-digits ──► detect prefix
                                    ├─ 00229XXXX  ─► strip 00
                                    ├─ 229XXXX    ─► keep
                                    ├─ 01XXXXXXXX ─► prefix 229
                                    ├─ 97XXXXXX   ─► prefix 229
                                    └─ autre      ─► invalid
                  ──► local = 8 ou 10 chiffres
                  ──► valid si local ∈ {8, 10 commençant par 01}
                  ──► e164_8  = +229 + local(8) si dispo
                  ──► e164_10 = +22901 + local(8) si 8ch, sinon +229 + local
```

Le Sheet stocke `contact_whatsapp` au format **10 chiffres** (`+22901XXXXXXXX`) en priorité, fallback 8 chiffres si non convertible.

## Hors scope

- Vérification réelle de l'existence du numéro sur WhatsApp (nécessiterait l'API WAHA `checkExists` — possible en V2).
- Édition du Sheet par des collaborateurs externes (déjà géré par Google Sheets natif).
