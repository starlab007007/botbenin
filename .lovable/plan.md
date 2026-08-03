# Cadre central du web = écran Chat Flutter (parité 1:1)

## Constat de l'audit

La capture montre l'accueil Chat de l'app Flutter :
barre de recherche, onglets `Discussions / Statuts / Radar`, carte WAOUH (En ligne · Assistant IA
+ bouton **Discuter** + puces **Vendre / Acheter / Négocier**), en-tête `CONVERSATIONS` avec
bouton **Archives (n)**, puis la liste des conversations (ou l'état vide « Aucune conversation »).

Le cadre central du web (`src/erp/CenterCanvas.tsx`) diverge :

| Élément Flutter | État actuel du cadre web |
| --- | --- |
| Onglets Discussions / Statuts / Radar | absents (Statuts/Radar = boutons visibles seulement en ≥ xl) |
| Carte WAOUH (En ligne, Discuter) | absente (pas de carte, seulement des puces) |
| Puces Vendre / Acheter / Négocier | présentes mais dans un ordre/format différent |
| Recherche filtrant discussions/statuts/radar | la barre du haut envoie un prompt à l'IA, elle ne filtre rien |
| Section CONVERSATIONS + Archives (n) | absente (uniquement « Négociations par article ») |
| Liste des conversations `waouh_conversations` | absente du cadre central |
| État vide « Aucune conversation » + CTA | absent (remplacé par des suggestions IA) |

La logique métier existe déjà côté web dans `ChatListScreen.tsx` (chargement conversations,
identité WAOUH, non-lus, snapshot offline) et dans `WaouhMatchChatList.tsx` (archives locales
`waouh_archived_matches_*`, compteur, restauration). Rien de nouveau n'est à créer côté backend.

## Ce qui sera fait

Réécrire uniquement la vue « home » du cadre central pour qu'elle reproduise l'écran Flutter,
en réutilisant les hooks et composants existants (aucun changement de moteur, de Supabase ni de
comportement de chat).

1. **Barre de recherche** en tête du cadre : filtre local (discussions, statuts, radar), comme
   Flutter. La saisie de commande IA reste disponible via la carte WAOUH / le chat.
2. **Onglets segmentés** `Discussions · Statuts · Radar`, toujours visibles (plus de dépendance
   au breakpoint xl). Statuts → `StatusesPanel`, Radar → `RadarPanel`, tous deux recevant `query`.
3. **Carte WAOUH** : logo, pastille « En ligne », sous-titre « Assistant IA », bouton **Discuter**
   (ouvre le chat principal monté en permanence), puces **Vendre / Acheter / Négocier** qui
   pré-remplissent le prompt exactement comme aujourd'hui (`prefill`).
4. **Bloc CONVERSATIONS** : titre + bouton **Archives (n)** branché sur le compteur d'archives de
   `WaouhMatchChatList`, la liste des fenêtres par article (isolation v13 inchangée) puis la liste
   des conversations `waouh_conversations` (libellé, badge canal, horodatage, non-lus), ouvrant la
   conversation dans le cadre central sans navigation.
5. **État vide** identique : « Aucune conversation / Démarrez une recherche, une vente ou une
   négociation avec WAOUH. » + CTA nouveau chat.
6. **Invité** : CTA de connexion conservé, redirection `/app/auth` inchangée.

## Détails techniques

- Fichier principal modifié : `src/erp/CenterCanvas.tsx` (vue `home` + états `tab`, `query`).
- Extraction d'un composant `src/erp/CenterChatHome.tsx` pour garder `CenterCanvas` lisible.
- Réutilisation : `useWaouhIdentity`, `useMobileAuth`, `useUnreadCounts`, `useWaouhMatchChats`,
  `WaouhMatchChatList`, `StatusesPanel`, `RadarPanel`, `formatConvLabel`/`channelBadge`.
- Le compteur d'archives sera exposé par `WaouhMatchChatList` via une prop callback
  (`onArchivedCountChange`) ou un état levé, sans modifier sa logique de stockage local.
- Le moteur `WaouhWebChat` et `WaouhMatchChatWindow` restent montés : aucune navigation ajoutée.
- Vérification : typecheck, suite de tests existante, puis contrôle visuel navigateur de
  `/app/chat` (onglets, carte WAOUH, archives, état vide).
