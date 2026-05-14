## Réorganisation du module WAOUH — design bot.bj + séparation Admin/Public

### Objectif
- **Tableau de bord WAOUH = admin uniquement** (avec onglets articles, acheteurs, transactions, paramètres, WhatsApp WAHA, etc.).
- **Module public WAOUH Chat** accessible à tous (auth ou non) via le menu latéral, ouvrant directement la page chatbot pour vendre / acheter / négocier / payer.
- **Charte graphique unifiée bot.bj** : sortir des tokens custom `--waouh-*` partout où la cohérence avec la plateforme l'impose, et adopter les composants/cartes/typo de la plateforme principale (gradients indigo/cyan, `from-cyan-500 to-blue-500`, cartes blanches arrondies, `MainLayout`).

### 1. Routes & accès

| Route | Page | Accès |
|---|---|---|
| `/waouh-chat` | `WaouhChatPage` (chat plein écran) | **Public** (auth ou non) |
| `/waouh` | `WaouhPage` (dashboard admin réorganisé) | **Admin uniquement** (`AdminRoute`) |
| `/waouh/demo` | `WaouhDemoPage` | Admin uniquement |

- Modifier `src/App.tsx` :
  - Ajouter route publique `/waouh-chat` (hors `MainLayout` ou dans `MainLayout` selon préférence — voir Q1).
  - Wrapper `/waouh` et `/waouh/demo` avec `<AdminRoute>`.

### 2. Menu latéral (`ModernSidebar.tsx`)

- Ajouter une entrée **« WAOUH Chat »** visible pour tous, pointant vers `/waouh-chat`, icône `ShoppingBag`, gradient cyan→blue, badge « New ».
- Déplacer **« WAOUH Admin »** sous la section **Administration** (visible seulement si `isAdmin`), pointant vers `/waouh`.
- Respecter la mémoire « Core Modules Navigation » (5 modules + WAOUH Chat ajouté en cohérence avec la mention « WhatsApp IA »).

### 3. Nouvelle page publique `WaouhChatPage`

Fichier : `src/pages/waouh/WaouhChatPage.tsx`

- Layout plein écran avec **header bot.bj** (logo, titre « WAOUH — Achetez · Vendez · Négociez · Payez », sous-titre).
- 4 cartes d'action rapides en haut (Vendre / Acheter / Négocier / Payer) qui pré-remplissent le champ de saisie.
- Chat principal central reprenant `WaouhWebChat` en mode `embedded`, hauteur `calc(100dvh - header)`.
- Sidebar droite (desktop) avec aide rapide + exemples de phrases en français/Fon/Yoruba.
- Si utilisateur authentifié → afficher prénom dans le header et lier `web_session_id` à son `user_id` (best effort).
- Mobile-first : cartes empilées, chat occupe 100dvh, conformément à la mémoire « Mobile Dialog Responsive Pattern ».

### 4. Refonte visuelle dashboard admin (`WaouhPage.tsx`)

- Remplacer le fond `bg-[hsl(var(--waouh-bg))]` par le fond standard `bg-gray-50` du `MainLayout`.
- Cartes KPI : style identique à `DashboardPage` (cartes blanches, gradient d'icône `from-* to-*`, ombre douce).
- Header : bandeau avec gradient cyan→blue, icône `ShoppingBag` blanche, titre + sous-titre, badge système, bouton démo.
- Onglets : style `TabsList` blanc/gris cohérent avec le reste de la plateforme (pas de `bg-card border-[hsl(var(--waouh-border))]`).
- Tableaux : adopter le style des tableaux existants (header gris clair, hover indigo léger, badges arrondis pleins).
- Graphiques Recharts : palette indigo/cyan/emerald de la plateforme.
- Onglets « Web Chat » et « WhatsApp (WAHA) » conservés mais restylés.
- Réorganiser l'ordre des onglets : **Vue d'ensemble · Annonces · Acheteurs · Transactions · WhatsApp · Paramètres** (suppression de l'onglet « Web Chat » qui n'a plus de sens côté admin — remplacé par un lien direct vers `/waouh-chat`).

### 5. Sécurité / DB

Aucune migration nécessaire. Les RLS de `waouh_messages` (web_session_id anon + admin full) couvrent déjà le besoin. Si l'utilisateur est authentifié, on remplit `user_id` dans `waouh-channel-in` (déjà supporté).

### 6. Suppression du `WaouhPage`-tab `webchat`

Le panneau « Web Chat » dans le dashboard admin devient un simple lien « Ouvrir le chat public ↗ » → cohérence avec la séparation des rôles.

### Points techniques

- Pas de nouvelle edge function.
- Pas de nouvelle table.
- Réutilise `WaouhWebChat` (mode `embedded`) dans la nouvelle page publique.
- `AdminRoute` déjà existant (`src/components/auth/AdminRoute.tsx`).
- Tokens HSL bot.bj (déjà dans `index.css`/`tailwind.config.ts`) utilisés en priorité ; les tokens `--waouh-*` ne servent plus qu'aux accents secondaires.

### Questions

1. Voulez-vous la page publique `/waouh-chat` **dans le `MainLayout`** (avec sidebar de la plateforme à gauche pour utilisateurs connectés, masquée pour anonymes) ou en **plein écran indépendant** (style landing focalisé chatbot, sans sidebar) ?
2. Confirmer le **libellé exact** dans la sidebar : `WAOUH Chat`, `Marketplace WAOUH`, ou autre ?
