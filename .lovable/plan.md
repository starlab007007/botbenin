# WaouhApp AI ERP — UI web (www.bot.bj) avec le Chat en cœur du système

## Constat

- `www.bot.bj/` redirige aujourd'hui vers `/app/chat`, c'est-à-dire la **coquille mobile** (`MobileShell`) affichée telle quelle sur desktop : colonne étroite, onglets Discussions / Statuts / Radar pensés pour un téléphone (capture jointe).
- Le moteur de chat web complet existe déjà : `WaouhWebChat`, `WaouhMatchChatWindow`, `WaouhMatchChatList`, `WaouhChatTabs`, `WaouhRadarTab`, `WaouhProductCard`, `WaouhArticleSummary`, `useWaouhMatchChats` (isolation v13), notifications et corrélation bout en bout.
- Les briques IA (Stock, BI, Présence, Agents, WhatsApp/WAHA, Diffusion, Deals) existent mais vivent surtout côté mobile ou dans des pages dispersées.

Il manque donc une **surface web native** qui mette le Chat au centre et fasse graviter les briques ERP autour, au lieu d'un téléphone étiré.

## Proposition : le Chat comme poste de pilotage

Un espace de travail web `/` (workspace WaouhApp AI ERP) construit autour d'un cockpit de conversation en 3 colonnes, avec les modules ERP en satellites — le chat n'est pas un module de plus, c'est l'interface principale du système.

```text
┌──────┬─────────────────────┬──────────────────────────┬───────────────┐
│ RAIL │  CONVERSATIONS      │      CANVAS DE CHAT      │  CONTEXTE IA  │
│      │                     │                          │               │
│ Chat │ [Discussions]       │  WAOUH · Assistant IA    │ Fiche article │
│ Stock│ [Statuts] [Radar]   │  ─────────────────────   │ + photos      │
│ BI   │                     │  bulles + fiches produit │ Résumé négo   │
│ Bou- │ ▸ Sac Zara · Kofi   │  carrousels, actions     │ Prochaine     │
│ tique│ ▸ Terrain · Ayo     │                          │ étape         │
│ RH   │ ▸ iPhone · Vendeur  │  [Vendre][Acheter]       │ Paiement /    │
│ Canal│                     │  [Négocier]  composer    │ livraison     │
└──────┴─────────────────────┴──────────────────────────┴───────────────┘
```

### Colonne 1 — Rail modules (72 px)
Icônes verticales avec pastille de couleur par brique : Chat (actif par défaut), Stock IA, BI IA, Boutique IA, Présence IA, Canaux WhatsApp, Deals, Admin. Badges de compteurs (messages non lus, ruptures de stock, deals à traiter). Le rail reste visible dans tous les modules : on ne quitte jamais le chat des yeux.

### Colonne 2 — Conversations (320 px)
Reprend fidèlement la logique de la capture, en version desktop :
- Barre de recherche « Rechercher une discussion… »
- Onglets segmentés **Discussions · Statuts · Radar** (`WaouhChatTabs` existant)
- Carte WAOUH en tête : logo, « En ligne », Assistant IA, bouton **Discuter**, et les 3 actions rapides **Vendre / Acheter / Négocier**
- Liste des fenêtres dédiées (1 article × 1 interlocuteur, isolation v13 conservée) avec vignette produit, nom de l'interlocuteur, dernier message, heure, badge non-lu
- Section Archives

### Colonne 3 — Canvas de chat (flexible, cœur de l'écran)
- En-tête contextuel : article concerné + interlocuteur + statut de la négociation (badge : en cours / prix proposé / achat confirmé / vente conclue)
- Fil de messages avec les fiches produit riches existantes (carrousel photo lazy-load, plein écran zoomable, actions « Je suis intéressé / Poser une question / Annuler »)
- Composer large avec actions rapides Vendre / Acheter / Négocier, joindre photo, dictée vocale (Kpakpato)
- Suggestions IA contextuelles au-dessus du composer

### Colonne 4 — Contexte IA (360 px, repliable)
- Fiche de l'article en discussion (photos, prix, ville, vendeur)
- Résumé automatique de la négociation (`WaouhArticleSummary`) : points clés, prochaine étape, décision
- Analyse « Prix Réel WAOUH » (fourchette marché)
- Actions de bouclage : paiement, livreur, clôture du deal
- Traçabilité `correlation_id` visible pour l'admin

### Accueil quand aucune conversation n'est ouverte
À la place du « Aucune conversation » vide de la capture : un **hero de chat plein écran** — logo WAOUH, une seule grande barre de saisie « Que cherchez-vous aujourd'hui ? », 6 suggestions cliquables (Chercher un produit, Vendre un article, Négocier un prix, Voir mon stock, Analyser mes ventes, Scanner le Radar) et une bande de KPI vivants sous la barre. Le chat est ainsi le premier geste possible sur bot.bj.

## Les briques ERP autour du chat

Chaque module ouvre dans la colonne 3 (le canvas), en gardant la liste de conversations à gauche — donc on peut consulter son stock tout en gardant la négociation à portée de clic. Chaque brique conserve le même contrat visuel :

| Brique | Contenu | Copilote |
| --- | --- | --- |
| Stock IA | produits, ruptures, valeur FCFA | `waouh-stock-analyze` |
| BI IA | graphiques auto, sources Sheets/CSV | `waouh-bi-query` |
| Boutique IA | catalogue, prix, ventes, deals | agent commerce |
| Présence IA | pointages QR + géofence | agent RH |
| Canaux | sessions WAHA, diffusion ciblée | assistant canal |

Le copilote de chaque brique s'affiche **dans le même canvas de chat** : une seule grammaire conversationnelle pour tout l'ERP.

## Direction visuelle

Fidèle à la capture, transposée en desktop :
- Vert profond WAOUH en accent (`#1F5E4B`-like) sur fond clair, cartes blanches très arrondies (rx 20-24), bordures fines vert pâle
- Onglets segmentés pilule, boutons d'action arrondis avec icône à gauche
- Une teinte par brique ERP pour le rail et les en-têtes de module
- Tokens sémantiques dans `index.css` (`--erp-surface`, `--erp-rail`, une teinte par module) — aucune couleur en dur dans les composants
- Densité desktop : plus d'informations visibles, mais mêmes composants qu'en mobile
- Responsive : sous `lg`, on retombe sur la pile mobile actuelle (rien de cassé sur téléphone)

## Volet technique

- Nouveau layout `WorkspaceShell` (rail + liste + canvas + panneau contexte) sous `src/components/workspace/`
- `/` sur desktop rend le workspace web ; le comportement mobile actuel (`MobileShell`) est conservé via un point de bascule `useIsDesktop`, sans toucher aux routes `/app/*`
- Réutilisation directe des composants chat existants (`WaouhWebChat`, `WaouhMatchChatList`, `WaouhMatchChatWindow`, `WaouhChatTabs`, `WaouhRadarTab`, `WaouhProductCard`, `WaouhArticleSummary`) — **aucune logique de chat, d'isolation v13 ou de corrélation n'est réécrite**
- Les modules ERP réutilisent les edge functions existantes ; extraction en hooks partagés des écrans mobiles BI/Stock/Présence pour les rendre montables côté web
- Chargement paresseux par module, colonne contexte montée à la demande
- SEO sur la page d'accueil web : `title`/`description` propres, H1 unique, JSON-LD `SoftwareApplication`

## Ordre de livraison

1. `WorkspaceShell` (rail + colonnes) et bascule desktop/mobile sur `/`
2. Colonne conversations desktop (recherche, onglets, carte WAOUH, actions rapides, liste isolée)
3. Canvas de chat + hero d'accueil conversationnel
4. Panneau contexte IA (fiche article, résumé, prix réel, bouclage)
5. Branchement des briques ERP dans le canvas, avec leur copilote
6. Passe responsive, tests bout en bout, vérification console/réseau
