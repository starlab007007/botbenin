# Rail latéral web = modules Flutter (parité 1:1)

## Constat

Le rail actuel (`src/erp/WebErpShell.tsx`) expose 10 entrées : Chat Command Center, Bots & Agents IA,
BI IA, Stock IA, Présence QR, Boutiques & magasins, Ventes, WhatsApp IA, Diffusion, Partenaires.

Manquent, par rapport à la liste demandée :

| Module demandé | État web actuel |
| --- | --- |
| AprèsBac IA | route `/app/apres-bac` existante mais bloquée par `FlutterParityGate` (non-admins redirigés) et absente du rail |
| FA IA | seulement le site statique `/fa`, aucune entrée applicative ni brique |
| Conversationnel | existe uniquement comme carte dans `AiAgentsListScreen` (`/app/bots/new`), pas dans le rail |
| Radar | existe comme onglet du cadre central (`RadarPanel`), pas comme entrée de rail |
| Agents IA | confondu avec « Bots & Agents IA » (une seule entrée) |
| BI / Stock / Présence QR | présents, mais ouvrent le wizard de création, pas la liste/tableau de bord comme Flutter |

## Organisation cible du rail (4 sections)

```text
ESPACE DE TRAVAIL
│
├── 1. COMMUNICATION
│   ├── Chat Command Center ....... /app/chat            (CenterCanvas, moteur monté)
│   ├── Radar ..................... /app/chat?tab=radar  (RadarPanel plein cadre)
│   ├── WhatsApp IA ............... /app/whatsapp        (sessions WAHA)
│   └── Diffusion ................. /app/diffusion       (audience ciblée)
│
├── 2. AGENTS IA
│   ├── Bots ...................... /app/bots            (liste table `bots`)
│   ├── Agents IA ................. /app/agents          (AiAgentsListScreen)
│   ├── Conversationnel ........... /app/bots/new        (création bot WhatsApp)
│   ├── BI WAOUH IA ............... /app/agents/bi       (dashboard, création en 2e)
│   ├── Stock WAOUH IA ............ /app/agents/stock    (dashboard + réappro)
│   └── Présence QR ............... /app/agents/attendance (sites, check-in, QR)
│
├── 3. COMMERCE
│   ├── Boutiques & magasins ...... /app/partner/businesses
│   ├── Ventes .................... /app/partner/sales
│   └── Partenaires ............... /app/partner
│
└── 4. SERVICES IA
    ├── AprèsBac IA ............... /app/apres-bac
    └── FA IA ..................... /app/fa
```

## Architecture d'exécution

```text
Utilisateur web (www.bot.bj)
        │
        ▼
  WebErpShell (mono-page /app, aucune navigation destructive)
        ├── Rail latéral (4 sections ci-dessus)
        └── Cadre central
              ├── CenterCanvas ......... Chat / Statuts / Radar (moteur WAOUH monté en permanence)
              └── ErpBrickCanvas ....... brique lazy-loadée selon l'entrée du rail
                        │
                        ▼
              BrickHome (cartes smart : icône, titre, compteur live, CTA, état vide)
                        │
                        ▼
        Moteur distant partagé avec l'application Flutter
              ├── Supabase (même projet, mêmes tables waouh_*, bots, waouh_ai_agents,
              │              apresbac_*, fa_*) + RLS identiques
              └── Edge functions (waouh-*, apresbac-*, waouh-fa-chat, waha-*)
```

## Ce qui sera fait

1. **Rail réorganisé** en 4 sections, chaque entrée montée en brique dans le cadre central
   (zéro navigation, moteur de chat conservé).
2. **Routes identiques à Flutter** : chaque entrée garde une URL `/app/...` réelle, donc lien direct
   et rechargement retombent sur le même écran.
3. **Déblocage AprèsBac / FA** : retrait de `FlutterParityGate` sur `/app/apres-bac`, ajout d'une route
   applicative `/app/fa` (chat FA connecté à `waouh-fa-chat`, quotas `fa_access_codes`).
4. **Cartes « smart » comme Flutter** : chaque brique s'ouvre sur une grille de cartes homogène avec
   indicateur live tiré de Supabase (agents, produits en stock, sites de présence, sessions WhatsApp,
   consultations FA, sessions AprèsBac), état vide + CTA de création.
5. **Même moteur distant** : aucune nouvelle table, aucune duplication de logique — réutilisation de
   `presenceRepository`, `stockRepository`, `biRepository` et des edge functions existantes.
6. **Vérification** : typecheck, suite de tests, puis parcours navigateur de chaque entrée du rail
   (chargement, données affichées, retour direct par URL).

## Détails techniques

- `src/erp/WebErpShell.tsx` : `navigation` restructurée en sections, extension de `routeContext`.
- `src/erp/ErpBrickCanvas.tsx` : nouveaux `BrickId` (`radar`, `agents`, `conversational`,
  `apresbac`, `fa`) ; BI/Stock/Présence pointent désormais sur les écrans tableau de bord.
- Nouveau `src/erp/BrickHome.tsx` : composant de cartes smart réutilisable (compteur live + CTA).
- `src/App.tsx` : `/app/apres-bac` sorti du gate, ajout de `/app/fa` et `/app/agents`.
- `CenterCanvas`/`CenterChatHome` inchangés hormis la prise en compte du paramètre `tab=radar`.
