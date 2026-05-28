
## Objectif

Sur `/app/chat`, pour un utilisateur **non connecté / invité uniquement**, afficher sous le bouton "Nouveau chat WAOUH" une démo animée (~10s, en boucle) de deux téléphones côte à côte montrant une transaction marketplace au Bénin (gourde). La démo disparaît dès que l'utilisateur se connecte ou clique sur "Nouveau chat WAOUH".

## Fichiers à créer / modifier

### 1. `src/assets/gourde.jpg` (nouveau)
Copier l'image fournie `user-uploads://gourde.jpg` dans les assets pour pouvoir l'importer en ES6 (gourde réaliste demandée).

### 2. `src/app-mobile/components/WaouhDemoMockup.tsx` (nouveau)
Composant autonome qui rend les 2 téléphones côte à côte avec animation séquentielle.

**Structure visuelle :**
```text
┌─────────────┐   ┌─────────────┐
│ ▔ encoche ▔ │   │ ▔ encoche ▔ │
│ 09:41 BOT.BJ│   │ 09:41 BOT.BJ│
│─────────────│   │─────────────│
│ Vendeur 🏪  │   │ WAOUH 🤖    │
│             │   │             │
│  [bulles]   │   │  [bulles]   │
│             │   │             │
└─────────────┘   └─────────────┘
   Vendeur          Acheteur IA
```

**Scénario chronologique (~10s, boucle infinie) :**

| t (s) | Téléphone Vendeur | Téléphone WAOUH |
|-------|-------------------|-----------------|
| 0.5 | Publie annonce (carte avec photo gourde + "Gourde 2L · 3 500 CFA · Cotonou") | — |
| 1.5 | — | Saisie recherche: "je cherche gourde Cotonou" |
| 2.5 | — | Carte résultat: photo gourde, 3 500 CFA, ⭐ 4.8 |
| 3.5 | 🔔 "Nouvel acheteur trouvé !" (toast animé) | Msg out: "Bonjour, gourde dispo ?" |
| 4.5 | Msg in: "Bonjour, gourde dispo ?" / out: "Oui, disponible ✅" | Msg in: "Oui, disponible ✅" |
| 5.5 | Msg in: "Je propose 3 000 CFA" | Msg out: "Je propose 3 000 CFA" |
| 6.5 | Msg out: "OK pour 3 200 CFA 🤝" | Msg in: "OK pour 3 200 CFA 🤝" |
| 7.5 | Msg in: "Marché conclu 👍" | Msg out: "Marché conclu 👍" |
| 8.5 | 🛵 "Livraison Express Cotonou en route" | ✅ "Livreur assigné · Suivi activé" |
| 9.5 | Pause | Pause |
| 10  | Reset → boucle | Reset → boucle |

**Implémentation animation :**
- `framer-motion` (déjà disponible) : `AnimatePresence` + `motion.div` pour l'apparition progressive des bulles (fade+slide-up).
- État local `step` (0→10) avancé par un `setInterval` toutes les ~1s.
- Reset automatique à la fin → effet boucle.
- Bulles vert WhatsApp (`bg-[hsl(165_91%_25%)]` pour out, `bg-white` pour in) réutilisant le style chat existant.
- Photo gourde : import ES6 de `@/assets/gourde.jpg`, affichée en `aspect-square` arrondi dans la carte annonce et la carte résultat.

**Frame téléphone (CSS pur) :**
- Conteneur arrondi `rounded-[2rem]` avec bordure épaisse `border-[8px] border-slate-900`
- Encoche : pseudo-élément ou div absolue en haut `w-20 h-5 bg-slate-900 rounded-b-2xl`
- Barre de statut : "09:41" gauche, "BOT.BJ" centre, icônes batterie/wifi droite
- Header chat vert avec avatar + nom (Vendeur / WAOUH)
- Zone messages avec fond chat (réutiliser pattern `waouh-chat-list-bg` ou similaire)

**Responsive :**
- Desktop : 2 téléphones côte à côte, largeur ~260px chacun
- Mobile (<640px) : 2 téléphones côte à côte mais scaled (`scale-75`) ou largeur réduite ~150px
- Container `max-w-2xl mx-auto px-4`

### 3. `src/app-mobile/screens/ChatListScreen.tsx` (modifier)
- Importer `useMobileAuth` (déjà importé) + `WaouhDemoMockup`.
- Détecter "invité / non connecté" : `!user` (déjà fourni par `useMobileAuth`).
- Ajouter le mockup **juste après le bouton "Nouveau chat WAOUH"** dans le bloc `<main>`, conditionné par `!user`.
- Le mockup disparaît automatiquement quand l'utilisateur se connecte (re-render via `user`). Pas de logique de dismiss manuel nécessaire — quand l'utilisateur clique "Nouveau chat WAOUH", il navigue vers `/app/chat/waouh` donc le mockup est démonté.

## Notes techniques

- Aucun changement backend, aucune migration.
- Aucun changement de routing.
- Tous les textes en français, prix affichés en **CFA**.
- Tokens couleurs : réutiliser le vert existant `hsl(165 91% 25%)` / `hsl(165 91% 18%)` du header chat.
- L'animation tourne en boucle tant que l'invité est sur la page (charge CPU négligeable, juste des transitions framer-motion).
- Le mockup est purement décoratif/présentation — pas d'interaction utilisateur attendue, juste à regarder.
