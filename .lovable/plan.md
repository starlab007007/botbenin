## Objectif
Remplacer toute la base sombre (`#0A0D1A`, `#0C0F1C`, noirs purs) de la page d'accueil par une palette claire et vive « Sky Electric » :

- Fond principal : `#EAF6FF` (bleu ciel lumineux)
- Surfaces / cartes : `#FFFFFF` et `#CDE8FF` (bleu pâle)
- Accents : cyan WAOUH `#00D4FF` + jaune solaire `#FFD23F`
- Texte principal : `#0B2447` (bleu nuit profond, jamais noir pur)
- Texte secondaire : `#3E5C76`
- Bordures / dividers : `#BFE0FF`

Aucun `#000`, `bg-black`, `text-black`, ni dégradés vers le noir ne doivent rester sur la home.

## Périmètre
Uniquement la page d'accueil et ses composants WAOUH dédiés (présentation pure, pas de logique métier).

## Changements

### 1. Tokens & animations (`src/index.css`)
- Ajouter une suite de variables `--home-*` (bg, surface, surface-alt, text, text-muted, border, accent, accent-warm) en HSL.
- Ajuster les keyframes existants (`waouh-typing`, `ticker`, `radar-sweep`) pour utiliser des couleurs claires (traînées cyan/jaune sur fond clair au lieu de glow sur noir).
- Garder `--waouh-bg` intact pour le module WAOUH interne (hors home).

### 2. `src/pages/HomePage.tsx`
- Wrapper racine : `bg-[hsl(var(--home-bg))]` + `text-[hsl(var(--home-text))]`.
- Supprimer toute classe `bg-black`, `bg-[#0A0D1A]`, `bg-[#0C0F1C]`, gradients vers noir.

### 3. Composants `src/components/home/waouh/*`
Repeindre chacun avec la nouvelle palette :

- **WaouhLiveHero** : fond clair, mockup iPhone blanc cassé avec liseré cyan, bulles WhatsApp en `#CDE8FF` / `#FFFFFF`, titres en `#0B2447`, CTA cyan `#00D4FF` texte foncé.
- **WaouhLiveTicker** : bandeau blanc, texte `#0B2447`, séparateurs jaune `#FFD23F`, glow cyan léger.
- **WaouhChannels** : 3 cartes blanches (chat / WhatsApp / voix), icônes cyan, badge canal jaune, ombres douces bleutées (pas de halo noir).
- **WaouhRadarLive** : SVG sur fond `#EAF6FF`, cercles `#BFE0FF`, balayage cyan translucide, points-cibles jaune.
- **WaouhHowItWorks** : 4 étapes, numéros jaunes sur pastilles cyan, cartes blanches.
- **WaouhProofStats** : bandeau cyan `#00D4FF` avec gros chiffres en `#0B2447`, étoiles jaunes.
- **BotBjEcosystem** : carte WAOUH (col-span-2) en gradient `#CDE8FF → #FFFFFF` avec accent cyan ; autres modules en cartes blanches bordure `#BFE0FF`.
- **WaouhFinalCTA** : bandeau gradient `cyan #00D4FF → jaune #FFD23F` (au lieu de cyan→violet sombre), texte `#0B2447`, bouton blanc.

### 4. Vérification finale
- `rg -n "bg-black|text-black|#000|#0A0D1A|#0C0F1C|from-black|to-black"` sur `src/pages/HomePage.tsx` et `src/components/home/waouh/` → doit ne rien retourner.
- Contrôle visuel preview : contraste WCAG AA sur titres et CTA.

## Hors périmètre
- Module WAOUH interne (`/waouh`) garde sa charte sombre.
- Aucune modification de logique, données, routes, ou autres pages.
