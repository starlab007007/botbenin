# Diffusion mobile 100% native

Refonte complète de `/app/diffusion` pour une expérience Android native, branchée sur exactement le même backend Supabase (tables `wa_contacts`, `wa_campaigns`, `wa_send_jobs`, `whatsapp_accounts`) et les mêmes edge functions que la version web.

## Principe

- Aucune ouverture de lien web, aucun Dialog modal web. Chaque action ouvre un **écran natif plein écran** (style Activity Android), inspiré de `NativeFormScreen`.
- Réutilisation à 100 % du hook `useWaDiffusion` et `useDiffusionSessions` → mêmes données, mêmes contrôles serveur (worker, enqueue, AI variants, vérification numéros).
- Composants natifs `NativeSelectSheet`, `NativePhoneInput` déjà existants pour les sélecteurs.

## Architecture des écrans

```
/app/diffusion                       → Tabs natifs (Contacts | Campagnes | Sessions | Suivi)
/app/diffusion/contacts/new          → Form natif ajouter contact
/app/diffusion/contacts/import       → Form natif import (textarea + preview)
/app/diffusion/campaigns/new         → Wizard natif 4 étapes (Type & nom · Message & média · Audience & session · Anti-ban)
/app/diffusion/campaigns/:id         → Détails campagne (stats live + actions)
/app/diffusion/campaigns/:id/edit    → Form natif édition (mêmes champs que web)
/app/diffusion/sessions/new          → Form natif création session WAHA + QR
/app/diffusion/sessions/:id          → Détails/QR/scan session
```

Tous accessibles via `react-router-dom` sous le shell mobile existant.

## Fonctionnalités couvertes (parité web)

**Contacts**
- Ajout manuel avec `NativePhoneInput` (drapeau + indicatif Bénin par défaut, support pays via `COUNTRIES`)
- Import en masse (textarea, parse Bénin 8/10 chiffres, preview valides/invalides)
- Liste scrollable virtuelle, recherche, toggle archives
- Vérification WhatsApp (edge `whatsapp-check-numbers`)
- Actions par contact : opt-out, archive, supprimer (via bottom-sheet d'actions)

**Campagnes**
- Liste avec badges statut, `Progress` envoyés/total, ACK live (livrés/lus)
- Wizard de création 4 étapes plein écran avec persistance d'état :
  1. Nom + Type (text, photo, vidéo, audio, document, lien) via `NativeSelectSheet`
  2. Message (Textarea native) + pièce jointe native (file picker via `<input type=file>` toujours OK en Capacitor WebView ; sinon Capacitor Filesystem si présent) → upload vers `public-media` bucket
  3. Audience : sélection multi-contacts dans une liste native + session WAHA via `NativeSelectSheet`
  4. Anti-ban : envois/h, plage horaire, switch variantes IA
- Actions row : Lancer, Envoyer maintenant, Pause/Reprendre, Dupliquer, Relancer, Supprimer, Modifier — via bottom-sheet `Sheet` natif (pas DropdownMenu web)
- Édition complète (nom, type, body, média, throttle, plages) → écran natif

**Sessions WAHA**
- Liste mes sessions + sessions partagées admin
- Création/configuration via écran natif (réutilise logique de `WaSessionDialog`)
- Affichage QR + statut live (poll 20 s)

**Suivi (Stats)**
- Reprise du `StatsTab` web : totaux, succès, échecs, ACK livrés/lus via realtime sur `wa_send_jobs`

## Détails techniques

- **Backend identique** : aucun changement de schéma, RLS, edge functions. Le mobile lit/écrit les mêmes tables avec le même `user_id`.
- **Synchronisation** : `useWaDiffusion` re-fetch après chaque mutation + abonnement realtime Supabase sur `wa_campaigns` et `wa_send_jobs` pour stats live.
- **File picker natif** : sur Android, `<input type="file" accept="image/*">` ouvre le sélecteur Android natif depuis la WebView Capacitor — pas besoin de plugin. Optionnel : ajouter `@capacitor/camera` plus tard pour capture directe.
- **Aucun composant web modal** : remplacement de `Dialog` par routes plein écran et de `Select`/`DropdownMenu` par `NativeSelectSheet` + `Sheet` bottom.
- **Header sticky vert** (`hsl(var(--wa-green))`) + bouton retour Android + bouton submit sticky bas, conformes au pattern `NativeFormScreen`.
- **Tabs** en barre horizontale sticky avec scroll snap, style chip.
- **Toaster** : `sonner` déjà disponible dans `AppMobile`.

## Fichiers à créer

- `src/app-mobile/screens/diffusion/DiffusionHomeScreen.tsx` (remplace l'actuel `DiffusionScreen.tsx`)
- `src/app-mobile/screens/diffusion/tabs/NativeContactsTab.tsx`
- `src/app-mobile/screens/diffusion/tabs/NativeCampaignsTab.tsx`
- `src/app-mobile/screens/diffusion/tabs/NativeSessionsTab.tsx`
- `src/app-mobile/screens/diffusion/tabs/NativeStatsTab.tsx`
- `src/app-mobile/screens/diffusion/ContactAddScreen.tsx`
- `src/app-mobile/screens/diffusion/ContactImportScreen.tsx`
- `src/app-mobile/screens/diffusion/CampaignWizardScreen.tsx`
- `src/app-mobile/screens/diffusion/CampaignDetailsScreen.tsx`
- `src/app-mobile/screens/diffusion/CampaignEditScreen.tsx`
- `src/app-mobile/screens/diffusion/SessionFormScreen.tsx`
- `src/app-mobile/components/diffusion/NativeMediaPicker.tsx` (upload Supabase Storage avec progress)
- `src/app-mobile/components/diffusion/CampaignActionsSheet.tsx` (bottom-sheet d'actions)

## Fichiers modifiés

- `src/AppMobile.tsx` : enregistrement des nouvelles routes `diffusion/*`
- `src/app-mobile/layouts/BottomTabBar.tsx` (vérif présence onglet Diffusion)

## Hors-périmètre

- Pas de modif backend (tables, RLS, edge functions inchangées)
- Pas de modif de la version web `/whatsapp-diffusion`
- Pas d'ajout de plugins Capacitor (file picker via input HTML — fonctionne nativement Android)
