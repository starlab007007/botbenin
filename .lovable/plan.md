# WAOUH ERP AI — Plateforme web unifiée, full AI-native

## Constat de l'audit

Les briques IA existent déjà mais sont **éclatées et majoritairement mobiles** :

- Agent IA commerce/docs/website : `waouh-agent-chat`, `waouh-agent-ingest`, `waouh-agent-insights`
- BI IA : `waouh-bi-ingest`, `waouh-bi-query` — UI seulement dans `src/app-mobile/screens/agents/BiAgentDetailScreen.tsx`
- Stock IA : `waouh-stock-analyze` — UI seulement dans `StockAgentDashboard.tsx`
- Présence QR : `waouh-attendance-checkin` — UI mobile
- WhatsApp/WAHA, Diffusion IA, CRM, Deals : pages web dispersées
- Aucun **hub web ERP** ni pilotage global : pas de vue consolidée, pas de copilote transversal

Conséquence : l'utilisateur web n'a pas d'expérience « système unique ». C'est ce que corrige ce plan.

## Proposition : un ERP web à briques, chaque brique = données + IA + chatbot

Une seule coquille `/erp` façon capture jointe : **noyau central (ERP AI Core)** entouré de modules, chaque module ayant son propre copilote conversationnel, et un **copilote global** qui interroge tous les modules.

```text
                 Ressources        Clients/CRM
                      \                /
        Boutique ——  ( ERP AI CORE )  —— BI & Analytics
                      /                \
                   Stock            Présence / RH
                        \          /
                        WhatsApp / Diffusion
```

### Écrans à construire

1. `/erp` — **Hub ERP** : hero central animé (roue de modules type capture), KPI temps réel consolidés, bandeau « Key Benefits », accès à chaque brique.
2. `/erp/copilot` — **Pilotage global IA** : un chat unique qui route la question vers la bonne brique (stock, ventes, BI, présence) et répond avec chiffres + graphiques + actions proposées.
3. `/erp/stock` — Stock IA web : table produits, alertes rupture/seuil, valeur totale FCFA, chatbot stock (existant `waouh-stock-analyze`), import CSV/XLSX/Google Sheet.
4. `/erp/bi` — BI IA web : sources de données, graphiques Recharts auto-générés, chatbot « pose ta question aux données » (`waouh-bi-query`).
5. `/erp/boutique` — Gestion boutique/magasin IA : catalogue, prix, ventes, commandes/deals, chatbot vendeur.
6. `/erp/rh` — Présence au poste IA (QR + géofence) : pointages, taux de présence, chatbot RH.
7. `/erp/canaux` — WhatsApp / sessions WAHA / Diffusion, avec chatbot d'assistance.

### Modèle « brique »

Chaque module suit un contrat identique pour rester cohérent et extensible :

- Un en-tête module (icône, couleur, statut IA, dernier rafraîchissement)
- 4 tuiles KPI
- Une zone data (table ou graphiques)
- Un panneau copilote latéral, toujours au même endroit
- Des actions IA suggérées (ex. « recommander un réassort », « générer le rapport »)

Nouveau composant partagé `ErpModuleShell` + `ErpCopilotPanel` pour garantir l'uniformité.

## Style visuel (inspiré de la capture, pas copié)

- Fond clair, cartes blanches arrondies, ombres douces
- Une couleur par module (violet RH, bleu stock, vert boutique, orange production/diffusion, rose BI, cyan clients)
- Roue centrale animée en SVG avec liens pointillés animés vers chaque brique
- Tokens sémantiques ajoutés dans `index.css` (`--erp-surface`, `--erp-ring`, une variable de teinte par module) — aucune couleur en dur dans les composants
- Responsive : roue en grille de cartes sur mobile

## Volet technique

- Nouvelle route `/erp/*` avec un layout dédié (sidebar modules + topbar), lazy-loadé
- Réutilisation directe des edge functions existantes ; **aucune logique métier réécrite**
- Copilote global : nouvelle edge function `erp-copilot` qui (1) classe l'intention, (2) appelle les fonctions/vues existantes en outil, (3) synthétise en français avec `openai/gpt-5.6-sol`
- Vue SQL consolidée `v_erp_overview` pour les KPI du hub (stock, ventes, présence, agents actifs, sessions WhatsApp)
- Réutilisation des composants mobiles existants (BI, Stock, Présence) en versions web via extraction de la logique dans des hooks partagés
- SEO : titre/description propres sur `/erp`, H1 unique, données structurées SoftwareApplication

## Ordre de livraison

1. Layout ERP + hub `/erp` avec roue animée et KPI (vue `v_erp_overview`)
2. `ErpModuleShell` + `ErpCopilotPanel` partagés
3. Stock IA web, puis BI IA web
4. Boutique/magasin IA, Présence IA, Canaux
5. Copilote global `erp-copilot` avec routage multi-briques
6. Tests bout en bout et vérification console/réseau
