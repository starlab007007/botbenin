

# Plan : Template "Diffusion WhatsApp" dans Création Bots

## Resume

Ajouter un nouveau template sectoriel **"Diffusion WhatsApp"** dans `Créer une Base de Connaissances`, synchronisé avec le Google Sheet `1cXuo8Kot_ypgMaCoChjuf4ah4C2XlOMFyJLAjQ-lo1k` (feuille `Sheet1`, gid=215334820). Architecture identique à E-commerce/Restauration : isolation par `user_id` aux 3 niveaux (frontend, edge function reader, edge function writer).

## Colonnes du Google Sheet

| Colonne | Generation | Editable utilisateur |
|---|---|---|
| `ID_CAMPAGNE` | Auto (UUID/timestamp) | Non (lecture seule) |
| `NOM_CAMPAGNE` | Recupere apres creation campagne (depuis WhatsApp Diffusion) | Non (lecture seule) |
| `NOM_CONTACT` | Saisie utilisateur | Oui |
| `CONTACT_WHATSAPP` | Saisie utilisateur | Oui |
| `STATUT` | Choix utilisateur (Actif / Inactif) | Oui (toggle) |
| `user_id` | Auto (auth) | Non (filtre RLS) |

## Fichiers a creer

### 1. `src/hooks/useWhatsAppDiffusionGoogleSheets.ts`
Copie adaptee de `useRestaurationGoogleSheets.ts` :
- `DEFAULT_SPREADSHEET_ID = '1cXuo8Kot_ypgMaCoChjuf4ah4C2XlOMFyJLAjQ-lo1k'`
- Feuille unique : `Sheet1` (ou nom reel a confirmer cote Sheet)
- Memes fonctions : `loadSheet`, `loadAllSheets`, `addRow`, `updateRow`, `deleteRow`
- Filtrage `user_id` cote frontend + delegation a `google-sheets-reader`/`google-sheets-writer` (deja gerent l'isolation)

### 2. `src/components/business/knowledge-base/WhatsAppDiffusionSheetViewer.tsx`
Inspire de `RestaurationSheetViewer.tsx` mais simplifie (1 seule feuille) :
- Liste responsive (table desktop / cards stackees mobile) des contacts
- Colonnes affichees : `ID_CAMPAGNE` (badge gris readonly), `NOM_CAMPAGNE` (badge readonly), `NOM_CONTACT` (editable), `CONTACT_WHATSAPP` (editable, format +229), `STATUT` (Switch Actif/Inactif inline)
- Boutons : `Ajouter contact`, `Modifier`, `Supprimer`, `Rafraichir`
- Dialog d'ajout/edition responsive (`max-h-[90dvh]`, scroll body) avec uniquement les champs editables (`NOM_CONTACT`, `CONTACT_WHATSAPP`, `STATUT`)
- A l'ajout : `ID_CAMPAGNE` genere automatiquement (`CAMP_${userId}_${timestamp}`), `NOM_CAMPAGNE` laisse vide ou pre-rempli depuis le dernier nom de campagne envoye via WhatsApp Diffusion (lu depuis `localStorage` cle `last_campaign_name_{userId}`)
- Recherche + filtre par STATUT
- Toggle Switch direct dans la liste pour basculer Actif/Inactif sans ouvrir de dialog

## Fichiers a modifier

### 3. `src/config/knowledge-base-templates.ts`
Ajouter un nouveau template a la suite :
```ts
{
  id: 'whatsapp_diffusion',
  sector: 'whatsapp_diffusion',
  name: 'Diffusion WhatsApp',
  description: 'Gerez vos contacts pour les campagnes WhatsApp',
  icon: 'MessageCircle',
  color: 'from-green-500 to-emerald-600',
  googleSheetConfig: {
    spreadsheetId: '1cXuo8Kot_ypgMaCoChjuf4ah4C2XlOMFyJLAjQ-lo1k',
    sheets: ['Sheet1']
  },
  structuralInfo: [],
  tables: [{
    id: 'contacts',
    name: 'Contacts',
    description: 'Liste des contacts WhatsApp pour campagnes',
    required: true,
    icon: 'MessageCircle',
    fields: [
      { name: 'nom_contact', type: 'text', required: true },
      { name: 'contact_whatsapp', type: 'phone', required: true },
      { name: 'statut', type: 'select', required: true, options: ['Actif', 'Inactif'] }
    ]
  }]
}
```

### 4. `src/components/business/knowledge-base/SectorTemplateSelector.tsx`
Ajouter `MessageCircle` dans `ICON_MAP`.

### 5. `src/components/business/knowledge-base/KnowledgeBaseViewer.tsx`
- Ligne 58 : etendre `isGoogleSheetMode` au template `whatsapp_diffusion`
- Lignes 127-135 : ajouter le rendu conditionnel `{template.id === 'whatsapp_diffusion' && <WhatsAppDiffusionSheetViewer knowledgeBaseId={kb.id} />}`

### 6. `src/components/whatsapp/WhatsAppCampaignForm.tsx` (deja existant)
Au moment de l'envoi reussi de la campagne, ecrire dans `localStorage` la cle `last_campaign_name_{userId}` = `campaignName`, pour que le template "Diffusion WhatsApp" puisse pre-remplir `NOM_CAMPAGNE` lors de l'ajout d'un nouveau contact.

## Points techniques

- **Isolation user_id** : geree automatiquement par les edge functions existantes `google-sheets-reader` (filtre via `scopeRecordsForUser`) et `google-sheets-writer` (verifie ownership avant `update_row`/`delete_by_id`). Aucun changement edge function necessaire.
- **Pre-requis Google Sheet** : le sheet doit etre partage avec le service account Google (meme adresse que pour Restauration/E-commerce). La colonne `user_id` sera auto-creee par le reader si absente.
- **Format telephone** : input `+229` par defaut, validation 8 chiffres (meme regex que `WhatsAppCampaignForm`).
- **Responsive mobile** : pattern existant `max-h-[90dvh]` pour les dialogs, table -> cards stackees sur mobile (meme que `RestaurationSheetViewer`).
- **STATUT toggle inline** : utilisation du composant `Switch` de `@/components/ui/switch` directement dans la ligne de la liste pour modification ultra-rapide Actif/Inactif.

