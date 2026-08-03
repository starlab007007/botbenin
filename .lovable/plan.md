# Audit front + routes + synchronisation backend Flutter

## Ce qui a été vérifié

- `src/App.tsx` : routes `/app/*` réelles existantes (chat, bots, agents, apres-bac, fa, whatsapp, diffusion, partner, profile, notifications) + catch-all `/app/*` → `/app/chat`.
- `src/erp/WebErpShell.tsx` : le rail pilote un état local `activeBrick`, sans jamais changer l'URL.
- `src/erp/BrickHome.tsx` : les cartes smart naviguent vers `/app/agents/bi/:id`, `/app/agents/stock`, `/app/agents/attendance/:id`.
- Repositories partagés avec Flutter : `presenceRepository`, `stockRepository`, `biRepository` (mêmes tables/RPC, projet `mvynepqulhflxtyymtzs`).

## Problèmes identifiés

1. **Rail non synchronisé à l'URL.** Cliquer sur une brique ne change pas l'adresse : rechargement, retour navigateur, lien partagé et favori retombent tous sur le Chat. L'état actif du rail est perdu.
2. **Cibles de rail sans route réelle.** `/app/agents/bi` et `/app/agents/attendance` (sans identifiant) ne sont déclarées nulle part : y accéder directement renvoie au Chat par le catch-all.
3. **Rupture de parcours depuis les cartes smart.** Les cartes naviguent vers une vraie route, ce qui quitte le mode « zéro navigation » et vide la brique : l'utilisateur perd le contexte du rail au retour.
4. **Boutons à re-vérifier un par un** (création agent, réappro stock, import BI, création de site QR, sessions WhatsApp, diffusion, partenaire) : s'assurer que chacun appelle bien la table/RPC/edge function utilisée par Flutter et affiche une erreur lisible en cas d'échec.
5. **Fluidité.** Chaque brique est chargée en `lazy` sans préchargement ni conservation d'état : re-cliquer recharge le module et refait les requêtes Supabase.

## Ce qui sera fait

1. **URL = source de vérité du rail.** La brique active est dérivée du chemin (`/app/agents/stock` → brique Stock) et chaque clic fait un `navigate` sans démonter le moteur de chat. Deep link, rechargement, bouton retour et état actif du rail redeviennent cohérents.
2. **Compléter les routes manquantes** : `/app/agents/bi` et `/app/agents/attendance` (vues liste, mêmes données que Flutter), plus alias pour les entrées de rail existantes.
3. **Navigation interne des cartes smart** conservée dans le cadre central : ouvrir un détail garde le rail, un fil d'Ariane permet de revenir à la liste.
4. **Audit bouton par bouton** de chaque module du rail, avec correction des actions muettes ou en erreur : appel Supabase/edge function attendu, état de chargement, message d'erreur explicite, rafraîchissement de la liste après succès.
5. **Performance et fluidité** : préchargement des briques au survol du rail, cache de requêtes par module (pas de refetch à chaque retour), squelettes de chargement homogènes, transitions sans clignotement.
6. **Vérification** : typecheck, suite de tests, puis parcours navigateur de chaque entrée du rail (ouverture, données réelles affichées, action principale, retour par URL directe).

## Détails techniques

- `WebErpShell` : suppression de `activeBrick` en état local au profit d'un mapping `pathname → BrickId`; `selectItem` fait `navigate(item.to)`.
- `ErpBrickCanvas` : rendu piloté par la route, ajout d'un préchargement `onMouseEnter` des modules `lazy`.
- `App.tsx` : ajout des routes `agents/bi` et `agents/attendance`; le catch-all `/app/*` reste en dernier recours.
- Aucune nouvelle table ni duplication de logique : réutilisation stricte des repositories et edge functions déjà partagés avec Flutter.
