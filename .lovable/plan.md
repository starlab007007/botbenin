# WaouhApp AI ERP — Cockpit conversationnel web (www.bot.bj)

## Audit de l'existant

Capture de `/` (redirigé vers `/app/chat`, rendu desktop) :

- Le shell ERP existe déjà : rail gauche « Espace de travail » (Chat Command Center, Bots & Agents IA, BI IA, Stock IA, Boutiques, Ventes, WhatsApp IA, Diffusion, Partenaires), en-tête avec recherche ⌘K et bouton « Discuter avec WAOUH ».
- **Problème n°1 — le vide** : ~75 % de la hauteur utile est blanche. Le chat, censé être le cœur, se réduit à un bouton « Nouveau chat WAOUH ».
- **Problème n°2 — la démo à la place du produit** : deux mockups de téléphone occupent le centre. Sur un ERP, la vitrine marketing prend la place de l'outil.
- **Problème n°3 — aucun contexte** : pas de fil, pas de liste de conversations isolées, pas de panneau article/négociation, pas de KPI vivants. Rien ne relie visuellement le chat aux briques ERP du rail.
- **Problème n°4 — thème clair générique** : ne se distingue d'aucun SaaS ; les chiffres FCFA n'ont aucune présence typographique.

## Benchmark retenu

| Référence | Ce qu'on prend |
| --- | --- |
| Linear | densité maîtrisée, palette sombre, raccourcis clavier partout |
| Raycast / palette de commandes | une seule entrée `/` pour piloter tout le système |
| Bloomberg Terminal | chiffres en mono, bandeaux de télémétrie discrets en périphérie |
| Superhuman | conversation plein écran, zéro chrome inutile |
| ChatGPT Canvas | résultats riches rendus dans le fil, pas dans une autre page |

## Direction choisie

**Un cockpit conversationnel sombre, plein écran, où le fil de chat est le système d'exploitation de l'ERP.**

Verrouillé par vos choix :
- Palette : `#0B1210` fond, `#131E1A` surface, `#1F5E4B` primaire, `#3DDC97` accent
- Typographie : **JetBrains Mono** pour titres, libellés système et montants FCFA ; **Work Sans** pour le corps
- Structure : chat immersif pleine largeur, modules ERP en tiroirs contextuels (pas de colonnes permanentes)

### Anatomie de l'écran

```text
┌───────────────────────────────────────────────────────────────┐
│ ◈ WAOUH COCKPIT   Cotonou · en ligne      CA jour 1 250 000 F │  barre HUD 56px
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   ⌁ fil de conversation pleine largeur, centré à 820px        │
│                                                               │
│   ┌─ fiche article ───────────────────────────────┐           │
│   │ [photos carrousel]  Sac Zara · 6 500 F        │           │
│   │ Cotonou · Kofi   [Intéressé][Question][Annuler]│          │
│   └────────────────────────────────────────────────┘          │
│                                                               │
│   ┌─ carte ERP rendue dans le fil ───────────────┐            │
│   │ STOCK · 142 unités  ▓▓▓▓▓▓░░ 72%             │            │
│   └───────────────────────────────────────────────┘           │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│  /  Cherchez, vendez, négociez, ou tapez une commande…    [→] │  composer
│     ◦ Vendre  ◦ Acheter  ◦ Négocier  ◦ Stock  ◦ Ventes  ◦ Radar│
└───────────────────────────────────────────────────────────────┘
   ⌘K → palette conversations (Discussions · Statuts · Radar)
```

### Les 6 innovations

1. **Composer-commande unifié** — une seule barre. Texte libre = conversation marchande. `/` = commandes ERP (`/stock`, `/ventes`, `/diffusion`, `/radar`, `/presence`) avec autocomplétion. Plus besoin de choisir un module avant de parler.

2. **Cartes ERP rendues dans le fil** — demander « mon stock » ne quitte pas le chat : une carte stock (jauges, ruptures, valeur FCFA en mono) s'insère comme un message, avec ses boutons d'action. Idem BI (mini-graphes), ventes, présence. Le fil devient l'historique de pilotage de l'entreprise.

3. **Palette de conversations ⌘K** — la liste des fenêtres isolées (1 article × 1 interlocuteur, v13) ne mange plus une colonne permanente : elle s'ouvre en palette, avec les onglets **Discussions / Statuts / Radar** en filtres et la recherche déjà présente dans l'en-tête. Navigation clavier de bout en bout.

4. **Tiroir contexte à la demande** — sur une négociation active, un tiroir droit (380 px, glissant, `Esc` pour fermer) affiche la fiche article, le résumé automatique de la négociation, l'analyse « Prix Réel WAOUH » et les actions de bouclage (paiement, livreur, clôture). Il n'existe que quand il sert.

5. **Bandeau de télémétrie vivant** — dans la barre HUD : statut marché Cotonou (point pulsé), CA du jour, deals ouverts, ruptures. Chiffres en JetBrains Mono. C'est ce qui transforme un chat en salle de contrôle.

6. **État d'accueil actif** — plus de page vide ni de mockup. À l'ouverture : signature WAOUH, une phrase, la barre de commande focalisée, 6 intentions cliquables et 4 tuiles KPI compactes. Le premier geste possible sur bot.bj est de parler.

### Micro-interactions
Messages en fondu-montée 120 ms ; pulsation lente sur l'indicateur en ligne ; tiroirs sans rebond ; focus permanent sur le composer (au chargement, après envoi, après changement de conversation) ; `Enter` envoyer, `Tab` autocompléter, `Esc` fermer.

### Responsive
Sous `lg`, on retombe sur la pile mobile actuelle (`MobileShell`) : rien de cassé sur téléphone. Le tiroir contexte devient une feuille en bas d'écran.

## Volet technique

- Thème sombre ERP en tokens sémantiques dans `index.css` (`--erp-bg`, `--erp-surface`, `--erp-primary`, `--erp-accent`, une teinte par brique) — aucune couleur en dur dans les composants. Polices via `index.html`, mappées dans `tailwind.config.ts`.
- Nouveaux composants sous `src/components/erp/` : `CockpitShell`, `CockpitHud`, `CommandComposer`, `ConversationPalette` (⌘K, sur `cmdk` déjà présent via shadcn), `ContextDrawer`, `ErpResultCard`.
- **Aucune logique métier réécrite** : réutilisation directe de `WaouhWebChat`, `useWaouhMatchChats` (isolation v13), `WaouhMatchChatWindow`, `WaouhChatTabs`, `WaouhRadarTab`, `WaouhProductCard`, `WaouhArticleSummary`, `WaouhNotificationsBell`, `waouhCorrelation`.
- Les commandes `/` mappent sur les edge functions existantes (`waouh-stock-analyze`, `waouh-bi-query`, agents, diffusion) ; leurs réponses sont rendues en `ErpResultCard` dans le fil.
- Chargement paresseux par brique ; tiroir contexte monté à la demande.
- SEO : `title`/`description` propres, H1 unique, JSON-LD `SoftwareApplication`.

## Ordre de livraison

1. Tokens du thème sombre + polices + `CockpitShell` (HUD, fil, composer) sur `/`
2. État d'accueil actif (intentions + KPI) et branchement du fil `WaouhWebChat`
3. `CommandComposer` avec routage texte / `/commandes` + autocomplétion
4. `ConversationPalette` ⌘K (Discussions / Statuts / Radar, conversations isolées)
5. `ContextDrawer` (fiche article, résumé négo, prix réel, bouclage)
6. `ErpResultCard` pour Stock, BI, Ventes, Présence, Diffusion dans le fil
7. Passe responsive, accessibilité clavier, tests bout en bout, vérification console/réseau
