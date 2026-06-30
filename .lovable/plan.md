## 🎯 Module RADAR — Le module le plus intelligent de WAOUH

Ajouter un 3ᵉ onglet **"Radar"** à côté de *Discussions* / *Statuts · 24h* dans `ChatListScreen.tsx`. Une vue circulaire (cercles concentriques) qui balaie autour de l'utilisateur, du plus proche au plus éloigné, et affiche les opportunités (produits, statuts, annonces) issues **uniquement** de notre base unifiée (`waouh_unified_catalog` + `waouh_statuses`). Clic sur une photo → ouverture du chat WAOUH avec contexte pré-rempli (intent achat / vente / négo), exactement comme depuis Statuts.

### Stratégie & innovation

**1. Le rayon est la métrique reine.** Contrairement aux autres modules orientés pertinence textuelle, ici tout est trié par distance haversine. Géolocalisation via `useWaouhGeolocation` (déjà présent), fallback ville/quartier sinon.

**2. 4 anneaux concentriques** (configurables) :
- 🔴 Cercle 1 — ≤ 1 km (Hyper-proche, "à pied")
- 🟠 Cercle 2 — 1–5 km (Quartier élargi)
- 🟡 Cercle 3 — 5–20 km (Ville)
- 🟢 Cercle 4 — 20–100 km (Région)

**3. Mode "Urgence" 🚨** — bouton dédié qui : ① relance la géoloc HD, ② priorise le rayon 1 km, ③ trie par `last_seen_at` desc, ④ envoie un broadcast "Recherche urgente" aux vendeurs du cercle 1 (réutilise `waouh-webhook`).

**4. Filtres pré-balayage** (sheet en bas) : catégorie, sous-catégorie, fourchette de prix, type (SELL/BUY/STATUS), vérifié uniquement, photo obligatoire. Persistés en `localStorage`.

**5. Affichage radar animé** :
- Canvas SVG circulaire avec ligne de balayage tournante (effet sonar)
- Vignettes-photos positionnées sur les anneaux à leur angle réel (bearing depuis position user)
- Tap sur une vignette → bottom-sheet preview → bouton "💬 Démarrer la discussion"
- Liste alternative scrollable sous le radar (mode liste accessible)
- Vue carte optionnelle (Leaflet OSS, déjà supporté) avec cercles concentriques

**6. Intelligence** :
- Edge function `waouh-radar-scan` : reçoit `{lat, lng, filters, urgent}`, retourne le top-N par cercle avec score combiné `distance × qualite_score × fraîcheur`
- PostGIS pas requis : calcul haversine SQL ou via `earthdistance`/geohash existants
- Realtime : `postgres_changes` sur `waouh_unified_catalog` filtré par `ville` pour rafraîchir le radar live
- Cache 60 s côté client par (geohash5 + filtres)

**7. Démarrage de chat unifié** : réutilise `openWaouh()` (déjà dans `ChatListScreen`) avec un message d'amorce généré côté front :
```
Bonjour, je suis intéressé par "{titre}" vu sur le Radar WAOUH à {distance} km. Est-il toujours disponible ?
```
→ même flux que Statuts (négociation, contre-proposition, etc.).

### Périmètre technique

**Frontend (nouveau)**
- `src/app-mobile/components/radar/RadarPanel.tsx` — conteneur principal + onglet
- `src/app-mobile/components/radar/RadarCanvas.tsx` — SVG radar animé + vignettes
- `src/app-mobile/components/radar/RadarFilters.tsx` — sheet filtres
- `src/app-mobile/components/radar/RadarItemSheet.tsx` — preview + CTA chat
- `src/app-mobile/components/radar/RadarMapView.tsx` — vue Leaflet alternative
- `src/app-mobile/hooks/useRadarScan.ts` — fetch + cache + realtime
- `src/app-mobile/utils/geo.ts` — haversine, bearing, geohash bbox

**Frontend (édité)**
- `src/app-mobile/screens/ChatListScreen.tsx` — ajout onglet `radar` (3ᵉ tab) + branchement `<RadarPanel/>`

**Backend (nouveau)**
- `supabase/functions/waouh-radar-scan/index.ts` — scan paginé par anneau + scoring
- Index SQL : `CREATE INDEX ON waouh_unified_catalog (is_active, ville, last_seen_at DESC)` + index sur `(lat, lng)` pour le bbox pré-filter
- (optionnel) `waouh-radar-urgent` — diffusion broadcast cercle 1

**Aucune nouvelle table** — on consomme `waouh_unified_catalog` (déjà géo-enrichi) + `waouh_statuses`.

### Architecture du flux

```text
[Géoloc HD] ──► useRadarScan(filters)
                    │
                    ▼
        Edge fn waouh-radar-scan
        ┌──────────────────────┐
        │ bbox geohash5 prefilter
        │ haversine exact
        │ partition par anneau (1/5/20/100 km)
        │ score = freshness · qualité / (1+dist)
        └──────────────────────┘
                    │
                    ▼
        RadarCanvas (SVG sonar) ──► tap ──► RadarItemSheet ──► openWaouh(amorce)
```

### Hors périmètre (V2)
- AR caméra (boussole + overlay)
- Heatmap dynamique
- Notifications push "nouvelle opportunité à 300 m"
- Tri ML personnalisé par historique d'achat
