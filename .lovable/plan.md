

# Plan : Module WhatsApp Diffusion

## Resume

Creer un nouveau module "WhatsApp Diffusion" accessible depuis la navigation, avec une page dediee et un formulaire de campagne WhatsApp intuitif et responsive, inspire de la capture fournie.

## Fichiers a creer

### 1. `src/pages/WhatsAppDiffusionPage.tsx`
- Page complete avec la meme structure que `WhatsAppConnectPage` (landing non-connecte avec logo WhatsApp officiel + formulaire quand connecte)
- Utilise le meme logo WhatsApp officiel (`whatsapp-icon-official.png`)
- Quand connecte : affiche le composant formulaire de campagne

### 2. `src/components/whatsapp/WhatsAppCampaignForm.tsx`
Formulaire responsive avec les champs suivants :

- **Nom de la campagne** : input texte, requis
- **Type de campagne** : select avec options Texte, Photo, Video
- **Message** : textarea avec compteur de caracteres (max 1024 pour WhatsApp), requis
- **Fichier media** : input file (affiche seulement si type = Photo ou Video), avec indication taille max (16Mo photo, 64Mo video)
- **Session WAHA** : select dynamique charge depuis `whatsapp_accounts` filtre par `user_id` de l'utilisateur connecte
- **Numero de rapport WhatsApp** : input tel avec prefixe +229 par defaut, validation format Benin (8 chiffres)
- **Configuration Webhook** : champ URL webhook avec bouton "Verrouiller". Une fois enregistre, le champ devient readonly avec un cadenas. Stocke en localStorage par utilisateur
- **Bouton Soumettre** : envoie les donnees au webhook configure via POST

Layout mobile-first : `w-full max-w-2xl mx-auto`, padding `p-4 sm:p-6`, champs en `grid-cols-1`, gaps adaptes

## Fichiers a modifier

### 3. `src/App.tsx`
- Ajouter lazy import de `WhatsAppDiffusionPage`
- Ajouter route `/whatsapp-diffusion`

### 4. `src/components/navigation/ModernSidebar.tsx`
- Ajouter entree "WhatsApp Diffusion" avec icone WhatsApp officielle, path `/whatsapp-diffusion`

### 5. `src/components/MobileSidebar.tsx`
- Ajouter entree "WhatsApp Diffusion" dans le menu mobile

### 6. `src/components/Sidebar.tsx`
- Ajouter entree "WhatsApp Diffusion"

## Details techniques

- Le webhook par defaut sera `https://ia.bot.bj/form/form-campagne-wa-v2`
- Le verrouillage du webhook utilise `localStorage` avec cle `whatsapp_campaign_webhook_{userId}`
- Les sessions WAHA sont chargees via `supabase.from('whatsapp_accounts').select('*').eq('user_id', user.id)`
- Le formulaire envoie un POST JSON au webhook avec tous les champs + `userId` + `timestamp`
- Pour le fichier media : conversion en base64 ou envoi en FormData selon la taille
- Responsive : le formulaire occupe 90% de l'ecran mobile, inputs full-width, boutons empiles sur mobile

