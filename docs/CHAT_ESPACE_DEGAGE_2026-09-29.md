# Web /app/chat : espace de chat dégagé (2026-09-29)

Décisions : PrivatAI dans « Agents IA » ; tiroir replié par défaut et épinglable ; pastilles « 99+ » remplacées par un chiffre plafonné à « 9+ », seulement sur le Chat.

## Modes (`src/app-mobile/utils/chatSpaceLayout.ts`, testé)
| Largeur | Mode | Comportement |
|---|---|---|
| < 768 px | `stack` | Parcours téléphone inchangé (liste puis conversation). |
| 768–1279 px | `drawer` | Chat pleine largeur ; tiroir de 400 px (92 vw max) par-dessus avec voile ; Échap ou tap dehors le ferme. |
| ≥ 1280 px | `drawer` ou `pinned` | Tiroir par défaut ; épinglé = colonne de 380 px à côté du chat, choix mémorisé (`waouh_chat_drawer_pinned`). |

## Où sont passés les éléments
- Échanges / Statuts / Radar + recherche + historique : dans le tiroir (contenu inchangé de `ChatListScreen`, réutilisé tel quel — aucune logique dupliquée).
- Boutons Échanges (avec pastille de non-lu), Radar, Statuts : dans l'en-tête unique de l'espace (`WaouhEmbeddedWorkspace`, emplacements `headerLeading` / `headerTrailing`). Libellés masqués sous 1024 px ; cibles tactiles de 40–48 px sur écran tactile.
- Ouvrir une conversation, un chat produit ou « Nouvel objectif » ferme le tiroir.
- Lien direct `?tab=radar` ou `?tab=statuses` : le tiroir s'ouvre sur cet onglet.
- Carte PrivatAI : plus injectée dans le chat (`privatai-chat-promo.ts`, `PROMO_IN_CHAT=false`) ; entrée « PrivatAI (IA locale) » dans le menu Agents IA (nouvel onglet vers `/privatia`).
- Pastilles : `unreadBadge` (≤ 9, sinon « 9+ ») ; le menu ne l'affiche plus que sur « Chat Command Center ».

## Non modifié
Mobile / Flutter, données, Supabase. Les invités (non connectés) gardent l'écran actuel.
