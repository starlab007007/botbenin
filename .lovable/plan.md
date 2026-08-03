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

## Ce qui sera fait

1. **Rail complété** avec les entrées manquantes, chacune montée en brique dans le cadre central
   (zéro navigation, moteur de chat conservé) :
   - Chat Command Center (inchangé)
   - Radar → `RadarPanel` plein cadre
   - Bots (liste `bots`) et Agents IA (`AiAgentsListScreen`) séparés
   - Conversationnel → assistant de création de bot conversationnel
   - BI WAOUH IA, Stock WAOUH IA, Présence QR → tableau de bord d'abord, création en second
   - AprèsBac IA, FA IA
   - WhatsApp IA, Diffusion, Boutiques, Ventes, Partenaires (inchangés)
2. **Routes identiques à Flutter** : chaque entrée du rail garde son URL `/app/...` réelle
   (`/app/bots`, `/app/agents`, `/app/agents/bi`, `/app/agents/stock`, `/app/agents/attendance`,
   `/app/whatsapp`, `/app/diffusion`, `/app/partner`, `/app/apres-bac`, `/app/fa`, `/app/chat?tab=radar`),
   de sorte qu'un lien direct ou un rechargement retombe sur le même écran.
3. **Déblocage AprèsBac / FA** : retrait de `FlutterParityGate` sur `/app/apres-bac` et ajout d'une
   route applicative `/app/fa` (écran FA IA connecté à `waouh-fa-chat`, quotas `fa_access_codes`),
   ces deux modules faisant partie du périmètre Flutter demandé.
4. **Cartes « smart » comme Flutter** : chaque brique s'ouvre sur une grille de cartes homogène
   (icône, titre, sous-titre, indicateur live tiré de Supabase — nombre d'agents, produits en stock,
   sites de présence, sessions WhatsApp, consultations FA, sessions AprèsBac) plutôt que sur un
   wizard nu, avec état vide + CTA de création.
5. **Même moteur distant** : aucune nouvelle table, aucune duplication de logique. Les écrans réutilisent
   les dépôts de parité existants (`presenceRepository`, `stockRepository`, `biRepository`), les tables
   `waouh_*`, `bots`, `waouh_ai_agents`, `apresbac_*`, `fa_*`, et les mêmes edge functions que Flutter.
6. **Vérification** : typecheck, suite de tests, puis parcours navigateur de chaque entrée du rail
   (chargement, données affichées, retour direct par URL).

## Détails techniques

- `src/erp/WebErpShell.tsx` : extension du tableau `navigation` (+ regroupement en sections
  « Communication », « Agents IA », « Commerce ») et de `routeContext`.
- `src/erp/ErpBrickCanvas.tsx` : nouveaux `BrickId` (`radar`, `agents`, `conversational`,
  `apresbac`, `fa`) et lazy imports associés ; BI/Stock/Présence pointent désormais sur les
  écrans tableau de bord.
- Nouveau `src/erp/BrickHome.tsx` : composant de cartes smart réutilisable (compteur live + CTA).
- `src/App.tsx` : `/app/apres-bac` sorti du gate, ajout de `/app/fa`, `/app/agents`.
- Aucun changement dans `CenterCanvas`/`CenterChatHome` (parité écran Chat Flutter déjà livrée),
  hormis la prise en compte du paramètre `tab=radar`.
