## Objectif

Ajouter, **sans modifier l'existant**, un panneau gauche animé sur `/app/auth` (desktop uniquement) qui présente le flux WAOUH : Parcours Acheteur ↔ Orchestration WAOUH ↔ Parcours Vendeur, sous forme de flux animé continu.

## Portée

- **Fichier modifié** : `src/app-mobile/screens/auth/AuthHomeScreen.tsx` uniquement.
- **Aucune modification** du bloc actuel (logo WaouhApp, piliers Vendre/Acheter/Négocier, boutons WhatsApp/Email) : il est conservé intact et déplacé tel quel dans la colonne droite sur desktop.
- **Mobile (< lg)** : rien ne change, le panneau gauche est masqué (`hidden lg:flex`) pour préserver l'UX mobile actuelle.
- **Desktop (≥ lg)** : layout 2 colonnes — gauche = animation flux WAOUH, droite = écran d'auth existant inchangé.

## Contenu du panneau animé (colonne gauche, desktop)

Reproduction stylisée de l'infographie fournie, en 3 colonnes verticales :

1. **Parcours Acheteur** (bleu) — 8 étapes : Je cherche → WAOUH trouve → Produits proches → Je fais une offre → Je négocie → J'accepte → Je paie → Je suis livré
2. **Orchestration WAOUH** (centre, vert WaouhApp) — 6 nœuds : Catalogue unifié → Matching intelligent → Négociation → Accord → Livraison
3. **Parcours Vendeur** (vert) — 8 étapes : Je publie → WAOUH analyse prix → Cherche acheteurs → Reçois proposition → WAOUH conseille → Je confirme → Je prépare → Je vends

## Animations (CSS pur, aucune dépendance ajoutée)

- **Apparition séquentielle** des étapes (stagger 150 ms) via `animate-fade-in` + `animationDelay` inline, en boucle toutes les ~12 s avec `@keyframes` custom inline dans un `<style>` scoped.
- **Flèches verticales** entre étapes : trait SVG avec `stroke-dasharray` animé (effet trace continue de haut en bas).
- **Connexions latérales** Acheteur↔Orchestration et Orchestration↔Vendeur : pointillés animés (`stroke-dashoffset` qui défile) pour suggérer le flux temps réel.
- **Nœud central WAOUH** : pulsation douce (`animate-pulse` custom, scale 1 → 1.05).
- **Carte étape active** : glow/ring qui parcourt les étapes une à une (highlight roulant synchronisé entre les 3 colonnes).
- **Bandeau bas** : phrase "WAOUH connecte automatiquement le bon acheteur au bon vendeur…" avec effet shimmer léger.

Toutes les animations utilisent CSS keyframes + Tailwind, respectant le thème vert existant (`hsl(165 91% 18%)` → `hsl(165 91% 25%)`) avec accents bleu (#3b82f6) pour acheteur et vert (#10b981) pour vendeur, comme dans l'infographie.

## Structure technique

```
<div className="min-h-[100dvh] flex">
  {/* NOUVEAU — gauche, desktop only */}
  <aside className="hidden lg:flex lg:w-1/2 ... bg-gradient...">
    <WaouhFlowAnimation />  {/* composant inline dans le même fichier */}
  </aside>

  {/* EXISTANT — inchangé, juste enveloppé pour devenir colonne droite sur desktop */}
  <div className="w-full lg:w-1/2 ...">
    {/* tout le JSX actuel d'AuthHomeScreen tel quel */}
  </div>
</div>
```

Le composant `WaouhFlowAnimation` est défini dans le même fichier (pas de nouveau fichier créé) pour rester minimal.

## Hors périmètre

- Pas de modif de `EmailAuthScreen`, `WhatsAppOtpScreen`, routing, auth logic.
- Pas de nouvelle dépendance (framer-motion etc.) — CSS pur suffit et garde le bundle léger (cohérent avec les optimisations récentes de performance).
- Pas de modif mobile.
