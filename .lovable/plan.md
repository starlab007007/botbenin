# Plan — Waouh Partner Intelligent + Performance

## 1. Accès & navigation aux routes Partner

Les routes existent déjà dans `src/App.tsx` (lignes 232-238) mais ne sont pas visibles dans le menu et `/admin/waouh/whatsapp-ops` est déjà câblé. Action :

- Ajouter dans la sidebar (navigation principale) un groupe **"Waouh Partner"** visible :
  - `/partner` — Espace partenaire
  - `/partner/businesses` — Mes entreprises
  - `/partner/sales` — Ventes & commissions
  - `/partner/payouts` — Versements
- Ajouter dans la section admin un groupe **"Waouh Admin"** :
  - `/admin/waouh/partners`
  - `/admin/waouh/data-control`
  - `/admin/waouh/whatsapp-ops`
  - `/admin/waouh/radar`
- Vérifier que `/partner` n'est pas bloqué par `AdminRoute` (déjà OK, juste auth requise).

## 2. IA partout — Edge function `waouh-partner-ai`

Une seule edge function multi-actions appelant **Lovable AI Gateway** (`google/gemini-3-flash-preview`) avec routage par `action` :

| Action | Entrée | Sortie (tool calling JSON) |
|---|---|---|
| `enrich_business` | nom + ville | catégorie, sous-catégorie, description SEO, tags, horaires probables |
| `suggest_products` | nom entreprise + catégorie | liste 5-10 produits typiques avec prix min/max FCFA, unité |
| `parse_product_free_text` | "j'ai 20 kg de riz à 800F" | structuré (nom, prix, unité, stock) |
| `parse_voice_business` | transcript vocal | toutes les colonnes business pré-remplies |
| `reverse_geocode` | lat/lng | ville, quartier, adresse (via Nominatim côté serveur) |
| `geocode_address` | adresse texte | lat/lng |
| `clean_catalog_entry` | entrée brute catalogue unifié | titre normalisé, catégorie, tags, dédoublonnage hint |
| `bulk_restore_suggestions` | échantillon ligne | mapping colonnes proposé pour import CSV |

## 3. Remplissage intelligent — UI Partner

**`PartnerBusinessesPage`** dialog enrôlement repensé :
- Bouton **"📍 Détecter ma position"** : capture GPS → appelle `reverse_geocode` → remplit ville/quartier/adresse automatiquement.
- Champ **adresse libre** → bouton **"Géocoder"** → calcule lat/lng.
- Bouton **"🎤 Dicter"** : enregistre voix (Web Speech API ou Whisper via edge) → `parse_voice_business` → pré-remplit tout le formulaire.
- Bouton **"✨ Compléter par IA"** : à partir du nom + ville, appelle `enrich_business` → propose catégorie, description, tags (acceptables en un clic).
- Mini-carte Leaflet (déjà dispo dans le projet ? sinon `react-leaflet`) pour valider/déplacer le pin GPS.

**`PartnerProductsPage`** :
- Bouton **"✨ Suggérer produits"** : appelle `suggest_products` → liste de cartes cochables → "Ajouter sélection" → insert batch.
- Champ unique **"Décrire en langage naturel"** (ex: "20 kg de riz à 800F l'unité, stock 50") → `parse_product_free_text` → remplit formulaire.

## 4. Admin — Restauration & contrôle base de données intelligent

**`AdminWaouhDataControlPage`** enrichie :
- Section **"Nettoyage IA"** : bouton scanne les N entrées les moins propres du `waouh_unified_catalog`, appelle `clean_catalog_entry` en batch, propose corrections (titre, catégorie, tags) → apply en bulk.
- Section **"Détection doublons IA"** : embedding ou heuristique titre+ville → propose merges.
- Section **"Import CSV intelligent"** : upload CSV → IA propose mapping de colonnes → preview → insert.
- Section **"Restauration depuis sources"** : re-trigger backfill par source (partner/chat/radar) avec compteurs live.
- Filtres rapides par source, ville, qualité, vérifié.

## 5. Performance — page lente "Chargement…"

Causes identifiées :
- `App.tsx` charge ~50+ lazy components, mais le `Suspense` global avec `<LoadingSpinner />` masque toute la page à chaque navigation. Cause du loader interminable.
- `QueryClient` `retry: 1` mais pas de `refetchOnWindowFocus: false` → refetch agressif.
- Plusieurs providers nested (Auth/User/Theme/Language) déclenchent rechargements en cascade.

Actions :
- **Préchargement** : `<link rel="modulepreload">` injecté pour les routes critiques après idle.
- Désactiver `refetchOnWindowFocus`, augmenter `gcTime`.
- Wrapper Suspense plus **local** : un Suspense par section (sidebar visible pendant que la page charge).
- `MainLayout` rendu immédiatement, contenu route en Suspense interne avec skeleton léger (pas un splash plein écran).
- `useActivityTracking` : vérifier qu'il n'appelle pas Supabase en boucle (à throttler).
- `AuthContext` : éviter double-fetch session → utiliser `getSession()` + listener une seule fois.
- Vérifier les requêtes `select('*')` sur grosses tables → cibler colonnes nécessaires.

## 6. Détails techniques

```text
supabase/functions/waouh-partner-ai/index.ts   (nouveau, multi-action)
src/hooks/useWaouhAI.ts                         (wrapper appels IA + toasts erreurs 402/429)
src/components/partner/SmartBusinessDialog.tsx  (extrait du formulaire actuel)
src/components/partner/SmartProductDialog.tsx
src/components/partner/GeoPicker.tsx            (Leaflet + reverse geocode)
src/components/admin/CatalogCleaner.tsx
src/components/admin/CatalogImporter.tsx
src/components/Sidebar*                          (ajouter groupes Partner/Waouh Admin)
src/App.tsx                                     (Suspense local, QueryClient tuning)
```

Aucune migration DB nouvelle requise (toutes les tables existent déjà).

## 7. Hors scope explicite

- Pas de refonte design.
- Pas de modification des triggers/migrations existants.
- Pas de Whisper STT si Web Speech API suffit (fallback edge function plus tard).
