

# Plan : Preview WhatsApp + Selection des contacts Google Sheet

## Resume

Ajouter un bouton "Visualiser" avant "Soumettre" qui ouvre un dialog en 2 parties :
1. **Mockup WhatsApp** : apercu du message sur un ecran de telephone WhatsApp (bulle verte avec texte + media)
2. **Liste de contacts** : chargee depuis le Google Sheet `1cXuo8Kot_ypgMaCoChjuf4ah4C2XlOMFyJLAjQ-lo1k`, filtree par `user_id`, avec checkboxes pour selectionner les destinataires

## Fichiers a creer

### 1. `src/components/whatsapp/WhatsAppCampaignPreview.tsx`
Dialog responsive (90vw/90dvh sur mobile) contenant :

**Partie haute — Mockup WhatsApp :**
- Frame de telephone avec barre verte WhatsApp en haut (nom campagne)
- Zone de chat avec bulle verte a droite affichant :
  - Le media (photo en miniature, icone video, ou rien pour texte)
  - Le texte du message
  - Horodatage fictif + double check bleu
- Design inspire du vrai WhatsApp (fond beige/clair, bulles vertes)

**Partie basse — Selection des contacts :**
- Titre "Destinataires" avec compteur (X/total selectionnes)
- Checkbox "Tout selectionner" en haut
- Liste scrollable (`max-h-[40vh] overflow-y-auto`) de contacts avec :
  - Checkbox
  - Avatar placeholder avec initiale
  - NOM_CONTACT en gras
  - CONTACT_WHATSAPP en gris dessous
- Barre de recherche pour filtrer par nom ou numero

**Boutons d'action :**
- "Fermer et modifier" (outline) — ferme le dialog, retour au formulaire
- "Valider et soumettre" (vert) — declenche la soumission avec les contacts selectionnes

### 2. Chargement des contacts
- Utiliser `supabase.functions.invoke('google-sheets-reader', { body: { spreadsheetId: '1cXuo8Kot_ypgMaCoChjuf4ah4C2XlOMFyJLAjQ-lo1k', sheetName: 'Sheet1' } })`
- Filtrer cote client par `user_id` (meme pattern que E-commerce/Restauration)
- Extraire les colonnes `NOM_CONTACT` et `CONTACT_WHATSAPP`
- Charger au moment de l'ouverture du preview

## Fichier a modifier

### 3. `src/components/whatsapp/WhatsAppCampaignForm.tsx`
- Ajouter un bouton "Visualiser" entre le webhook et le bouton "Soumettre"
- Ajouter state `showPreview` et `selectedContacts`
- Le bouton "Visualiser" est actif seulement si le formulaire est valide (memes conditions que Soumettre)
- Passer les donnees du formulaire + contacts selectionnes au composant preview
- Inclure `selectedContacts` dans le payload envoye au webhook

## Details techniques

- **Google Sheet ID** : `1cXuo8Kot_ypgMaCoChjuf4ah4C2XlOMFyJLAjQ-lo1k`
- **Colonnes utilisees** : `NOM_CONTACT`, `CONTACT_WHATSAPP`
- **Filtrage user_id** : le `google-sheets-reader` filtre deja par `user_id` cote serveur via `scopeRecordsForUser()`
- **Responsive** : le dialog utilise le pattern existant `w-[90vw] max-h-[90dvh]` avec flex-col header fixe / body scrollable / footer fixe
- **Payload webhook enrichi** : ajouter `contacts: [{ name, whatsapp }]` dans le JSON envoye

