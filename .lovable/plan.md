## Diagnostic

J'ai analysé les logs et la base de données. La campagne « ok » (et plusieurs précédentes en attente/échec) a le `type = photo` mais **aucune `media_url`**. Le worker `whatsapp-diffusion-worker` lève alors l'erreur **« Média photo manquant »** sur chaque destinataire (vu dans `wa_send_jobs.last_error` x3).

Cause racine :
1. Le formulaire « Nouvelle campagne » (`NewCampaignDialog`) n'oblige pas l'URL média quand le type est `photo / video / audio` → l'utilisateur sélectionne « Photo + texte » par défaut visuel mais laisse l'URL vide.
2. Le worker échoue brutalement au lieu de basculer en envoi texte si le média manque mais qu'un body existe.
3. Côté UI Destinataires, le statut affiché reste « En attente » visuellement car la couleur destructive n'est pas claire — l'erreur réelle est masquée.

## Corrections à apporter

### 1. Worker (`supabase/functions/whatsapp-diffusion-worker/index.ts`)
- Si `type ∈ {photo, video, audio}` mais `media_url` absent **et** `body` non vide → **fallback automatique en envoi texte** (au lieu de throw). Logger un warning dans `wa_campaign_events`.
- Garder l'échec uniquement si body ET media sont vides.

### 2. Formulaire nouvelle campagne (`WhatsAppDiffusionV2.tsx` → `NewCampaignDialog`)
- Validation client : si `type ≠ text` et `mediaUrl` vide → toast d'erreur bloquant « URL du média requise pour ce type ».
- Ajouter un bouton **Upload** à côté du champ URL (utilise le bucket Supabase Storage existant) pour éviter la saisie manuelle d'URL.
- Marquer le champ « URL du média » avec `*` quand requis.

### 3. EditCampaignDialog
- Même validation média obligatoire si type non-text.
- Permettre de changer le type vers `text` pour les anciennes campagnes ratées.

### 4. UI Destinataires (`CampaignDetailsDialog`)
- Quand `j.status === 'failed'`, afficher clairement le badge **Échec** en rouge à la place de l'horloge « En attente » (le composant le fait déjà, mais l'icône `Clock` apparaît si `status` est vide — vérifier que `j.status` est bien transmis depuis `useCampaignDetails`).
- Toujours afficher `j.last_error` même tronqué.

### 5. Action de récupération
- Pour la campagne « ok » (failed) actuellement bloquée : un simple clic sur **Relancer** dans le menu devra repasser en texte (via fallback du worker) et envoyer correctement.

## Résultat attendu
- Plus aucune campagne ne peut être créée en `photo` sans média.
- Les anciennes campagnes ratées « Média photo manquant » peuvent être relancées (fallback texte automatique).
- L'onglet Destinataires montre clairement Échec + raison au lieu de « En attente » trompeur.
