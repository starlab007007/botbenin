## Plan — Normalisation Bénin (01) + Photos produits + Catalogue unifié enrichi

### 1. Normalisation numéros Bénin (format 01)

Depuis 2021, le Bénin utilise un format à **10 chiffres commençant par `01`** (ex: `01 97 12 34 56`). Mettre à jour `src/lib/phone.ts` :

- `BJ`: `length: 10`, `groups: [2,2,2,2,2]`, `prefixes: ['01']` (validation sur les 2 premiers chiffres).
- `parsePhone` / `normalizePhone` : si l'utilisateur saisit 8 chiffres legacy (`97...`), auto-préfixer `01`. Si `+229XXXXXXXX` (8 chiffres après indicatif), convertir en `+22901XXXXXXXX`.
- `formatPhoneDisplay` : afficher `+229 01 XX XX XX XX`.
- Adapter `PhoneInput` placeholder et helper.
- Helper `waToPhone(jid)` : convertir `273091318042723@lid` / `22901...@s.whatsapp.net` → `+229 01 XX XX XX XX` ; fallback vers le JID brut si non-parsable.

Mise à jour appliquée à : `PartnerEnrollmentPage`, `PartnerBusinessesPage`, `PartnerProductsPage`, `AdminWaouhPartnersPage`, et toutes les colonnes Vendeur/Acheteur des tables admin.

### 2. Partner Products — photos + catégorie + édition (capture 1)

`src/pages/partner/PartnerProductsPage.tsx` :
- Form produit : champ upload **jusqu'à 3 photos** (drag-drop + caméra mobile), stockées dans bucket Supabase `waouh-partner-products` (créer + RLS partner-only write, public read).
- Champ **catégorie** = `SmartCombobox` (liste : Alimentation, Boissons, Électronique, Mode, Maison, Beauté, Bureautique, Auto/Moto, Services, Autre) avec saisie libre.
- Carte produit : miniature, prix, statut, bouton **Voir détails** (Dialog) → modification inline + suppression.
- Dialog "Détails" : galerie 3 photos, tous champs éditables, bouton supprimer (confirm).

Migration DB : ajouter `photos text[]` à `waouh_partner_products` + colonne `categorie` si manquante.

### 3. Photos + classification + téléphones dans les 3 bases (Partner / Chat / Radar)

Pour chaque source de données produit :
- **Partner** : déjà couvert ci-dessus.
- **Chat (`waouh_chat_listings`)** : ajouter `photos text[]`, `classification` enum (`annonce`|`vendeur`|`acheteur`), `phone_normalized`, `whatsapp_normalized`. UI admin : bouton "Extraire photos du chat" (parse messages WhatsApp avec media → push vers storage).
- **Radar IA (`waouh_radar_*`)** : pareil + bouton "Extraire photos & profil" dans `AdminWaouhRadarPage`.

Edge function `waouh-extract-media` : prend un `chat_id` ou `radar_id`, télécharge les médias WAHA, upload sur storage, met à jour la ligne. Edge function `waouh-normalize-numbers` (cron + manuel) : convertit tous les JIDs en numéros normalisés.

### 4. Affichage numéros réels dans tables admin (captures 2, 3, 4)

Composant `<PhoneCell value={jidOrPhone} />` qui :
- Détecte `@lid` / `@s.whatsapp.net` → extrait chiffres → `normalizePhone(..., 'BJ')` → affiche `🇧🇯 +229 01 XX XX XX XX`.
- Fallback : affiche le JID en `text-muted` + tooltip "non normalisable".
- Boutons rapides : Appel / WhatsApp.

Appliqué dans : `AdminWaouhDataControlPage` (Annonces, Acheteurs, Transactions), `AdminWaouhRadarPage`, `AdminWaouhMonitoringPage`.

**Transactions** : ajouter colonne Actions admin → Dialog avec : marquer payé, libérer escrow, rembourser, contacter vendeur/acheteur (WhatsApp deeplink), ajouter note.

### 5. Catalogue unifié enrichi (capture 5)

Refonte de la vue/recherche unifiée (`AdminWaouhDataControlPage` onglet Recherche) — devient **la source unique** pour annonces/vendeurs/acheteurs.

Migration : créer **vue `waouh_unified_catalog_v`** unionnant Partner Products + Chat Listings + Radar Items, colonnes :

| Colonne | Source |
|---|---|
| `source` | partner / chat / radar |
| `type` | annonce / vendeur / acheteur |
| `titre`, `description`, `categorie` | normalisé |
| `prix`, `devise` | |
| `contact_phone`, `contact_whatsapp` | normalisés Bénin 01 |
| `photos[]` | merge photos |
| `ville`, `quartier`, `adresse`, `lat`, `lng` | |
| `vendeur_nom`, `acheteur_nom` | |
| `date_publication` | created_at source |
| `statut` | active / desactive / supprime |
| `score_qualite` | calculé |

UI table catalogue avec colonnes ci-dessus + actions par ligne : **Voir / Vérifier / Modifier / Activer / Désactiver / Supprimer**. Filtres : type, source, ville, statut, présence photo, présence contact WhatsApp.

Édition cross-source : edge function `waouh-catalog-update` qui route l'update vers la bonne table source selon `source`.

### Détails techniques

- **Storage bucket** : `waouh-media` (public read, authenticated write, 5MB max, image/* uniquement).
- **Migrations** : 1 seul fichier — ajout colonnes `photos`, `classification`, `phone_normalized`, `whatsapp_normalized` aux 3 tables ; vue `waouh_unified_catalog_v` ; fonction `waouh_normalize_bj_phone(text)` SQL.
- **Backfill** : trigger + script one-shot pour normaliser les numéros existants et extraire les `@lid` connus.
- **Perf** : index sur `(classification, statut, ville)` ; vue matérialisée si volume > 10k.
- **Validation Zod** : adapter `phoneRequired` pour exiger 10 chiffres BJ commençant par `01`.

### Fichiers impactés

- `src/lib/phone.ts`, `src/lib/validation/waouh.ts`
- `src/components/ui/phone-input.tsx`, nouveau `src/components/waouh/PhoneCell.tsx`
- nouveau `src/components/waouh/ProductPhotoUploader.tsx`, `src/components/waouh/ProductDetailDialog.tsx`
- `src/pages/partner/PartnerProductsPage.tsx`
- `src/pages/admin/AdminWaouhDataControlPage.tsx` (onglets Annonces, Acheteurs, Transactions, Recherche)
- `src/pages/admin/AdminWaouhRadarPage.tsx` (ou équivalent)
- nouvelles edge functions : `waouh-extract-media`, `waouh-normalize-numbers`, `waouh-catalog-update`
- 1 migration SQL
