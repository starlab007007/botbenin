# WaouhApp AI ERP — Centre de commande mono-page (www.bot.bj)

## Cadre validé

La capture jointe **est** la page d'accueil cible. On ne change ni la coquille ni les couleurs actuelles :

- Rail gauche « Espace de travail » conservé tel quel (Chat Command Center, Bots & Agents IA, BI IA, Stock IA, Boutiques & magasins, Ventes, WhatsApp IA, Diffusion, Partenaires) + carte « Moteur WaouhApp » en pied.
- En-tête conservé : titre, sous-titre, recherche ⌘K, bouton « Discuter avec WAOUH », cloche de notifications.
- Bandeaux conservés : carte compte (Invité / Se connecter) et bandeau vert WAOUH « Achetez · Vendez · Négociez par message · Toujours actif ».

**Une seule règle nouvelle : on ne quitte plus jamais cette page.** Cliquer sur une brique du rail ne navigue plus — cela recompose uniquement la **zone centrale**. L'URL peut changer pour le partage, mais la coquille ne se remonte pas.

## Diagnostic de la zone centrale

Aujourd'hui : bouton « Nouveau chat WAOUH », une phrase, deux mockups de téléphone, puis ~55 % de hauteur vide. C'est une vitrine marketing posée à l'emplacement de l'outil.

## Ce que devient le centre

Le centre est un **canvas unique** avec trois états, toujours au même endroit, sans rechargement.

### État 1 — Accueil (par défaut)

Remplace les mockups. De haut en bas, dans la largeur du canvas :

1. **Barre de commande WAOUH** en haut, focalisée automatiquement — la vraie zone de saisie, pas un bouton. Texte libre = conversation marchande ; `/` ouvre les commandes ERP (`/stock`, `/ventes`, `/bi`, `/diffusion`, `/radar`, `/presence`, `/whatsapp`) avec autocomplétion.
2. **Six pastilles d'intention** sous la barre : Acheter · Vendre · Négocier · Mon stock · Mes ventes · Radar. Un clic pré-remplit la barre et lance l'action dans le centre.
3. **Bande KPI compacte** (4 tuiles) : CA du jour, deals ouverts, messages non lus, alertes stock — chiffres réels, cliquables, chacun ouvrant sa vue dans le centre.
4. **Conversations récentes** : liste dense des fenêtres isolées (1 article × 1 interlocuteur, v13) avec vignette article, dernier message, badge non-lu. Un clic bascule le centre en État 2.

Les mockups de démo sont déplacés en bas de l'accueil, repliés derrière un lien discret « Voir WAOUH en action », visibles uniquement pour un visiteur non connecté.

### État 2 — Conversation

Le canvas devient le fil : messages, fiches produit avec carrousel photo et actions dédiées (Intéressé / Poser une question / Annuler), résumé automatique de négociation en tête, barre de composition en bas. Un bouton « ← Accueil » ramène à l'État 1. Aucune fenêtre flottante en plus : la conversation active occupe le centre, l'isolation par article × interlocuteur reste intacte.

### État 3 — Brique ERP

Cliquer sur Stock IA / BI IA / Ventes / Diffusion / WhatsApp IA dans le rail affiche la brique **dans le même centre**, avec en permanence, en bas, la barre de commande WAOUH : on peut interroger l'IA sur la vue affichée sans la quitter. Les réponses IA s'insèrent en cartes au-dessus de la barre.

### Anatomie

```text
┌──────────┬──────────────────────────────────────────────────┐
│ rail     │ en-tête (inchangé)                               │
│ (inchangé)├─────────────────────────────────────────────────┤
│          │ carte compte + bandeau WAOUH (inchangés)         │
│          ├─────────────────────────────────────────────────┤
│          │  ╔═══ CANVAS CENTRAL — 3 états, sans navigation ═╗│
│          │  ║ [ barre de commande WAOUH  ................ ] ║│
│          │  ║  Acheter Vendre Négocier Stock Ventes Radar   ║│
│          │  ║  ┌KPI┐┌KPI┐┌KPI┐┌KPI┐                        ║│
│          │  ║  Conversations récentes                       ║│
│          │  ║   • Sac Zara · Kofi · 6 500 F        ●2       ║│
│          │  ║   • Terrain Calavi · Ama             ●        ║│
│          │  ╚═══════════════════════════════════════════════╝│
└──────────┴──────────────────────────────────────────────────┘
```

## Volet technique

- Le rail passe d'une navigation `NavLink` à un sélecteur d'état du canvas ; l'URL est synchronisée via `history.replaceState`/route sans démonter la coquille (route unique `/app/chat` avec paramètre de vue).
- Nouveaux composants sous `src/components/erp/` : `CenterCanvas` (routeur d'état), `CommandBar` (texte libre + `/commandes`), `IntentChips`, `KpiStrip`, `RecentConversations`, `ErpResultCard`.
- **Aucune logique métier réécrite.** Réutilisation directe de `WaouhWebChat`, `useWaouhMatchChats` (isolation v13), `WaouhMatchChatWindow`, `WaouhProductCard`, `WaouhArticleSummary`, `WaouhChatTabs`, `WaouhRadarTab`, `useWaouhInbox`, `waouhCorrelation`, `WaouhNotificationsBell`.
- Les commandes `/` appellent les edge functions existantes (`waouh-stock-analyze`, `waouh-bi-query`, diffusion, agents) et rendent leur résultat en `ErpResultCard` dans le centre.
- Briques ERP chargées en `lazy` + `Suspense` avec squelette ; état de canvas mémorisé pour un retour instantané.
- Palette et typographie actuelles conservées, via les tokens sémantiques existants d'`index.css`. Aucune couleur en dur.
- Focus permanent sur la barre de commande : au chargement, après envoi, après changement d'état ou de conversation.
- Responsive : sous `lg`, la pile mobile (`MobileShell`) reste inchangée.
- SEO : `title`/`description` propres, H1 unique sur l'accueil.

## Ordre de livraison

1. `CenterCanvas` + bascule du rail en sélecteur d'état (sans navigation, coquille figée)
2. Accueil : `CommandBar` focalisée, `IntentChips`, `KpiStrip`, `RecentConversations` — retrait des mockups vers un repli « Voir WAOUH en action »
3. État Conversation dans le centre (fil, fiches produit, résumé, retour Accueil)
4. Routage des commandes `/` + `ErpResultCard`
5. États briques ERP (Stock, BI, Ventes, Diffusion, WhatsApp) dans le centre avec barre de commande persistante
6. Passe responsive, clavier, tests bout en bout, vérification console/réseau
