## Objectif

Sur les résultats Radar, un seul tap sur **Intéressé / Négocier / Acheter** doit ouvrir le chat WAOUH **et envoyer immédiatement** un message d'intérêt rattaché à l'article — sans que l'utilisateur ait à appuyer sur « Envoyer ».
Le Radar doit aussi se **mettre en pause automatiquement** après un délai, avec un bouton **Relancer** bien visible.

---

## 1. Auto-envoi du message d'intérêt depuis le Radar

### Comportement attendu

- Tap sur l'un des 3 boutons → navigation vers `/app/chat/waouh` → la fenêtre s'ouvre sur un **nouveau fil** → le message est **déjà envoyé** (aucune action manuelle).
- Message envoyé = un seul template court, **toujours orienté « intéressé »**, quel que soit le bouton choisi (interest / negotiate / buy n'est qu'un *hint* pour l'IA). Exemple :
  > *« 👋 Intéressé par "{titre}" vu sur Radar WAOUH ({distance}{, prix si dispo}). Intent: {interest|negotiate|buy} · Article #{id} »*
- Le bloc article (photo + titre + prix + distance) est affiché en **carte attachée** au-dessus de la bulle, pour que vendeur et IA gardent le contexte.
- Le routeur WAOUH (`waouh-negotiation-router`) reçoit le `intent` + `article_id` → enchaîne la suite (proposition, contre-prop, etc.) sans changement côté backend.

### Détails techniques

- `WaouhWebChat` expose une nouvelle méthode imperative `prefillAndSend({ text, articleRef, intent })` qui :
  1. appelle `startNewThread()`,
  2. crée le message sortant avec `metadata = { source: 'radar', article_id, intent, distance_km }`,
  3. déclenche `sendMessage()` immédiatement (pas de focus composer).
- `WaouhChatScreen` lit les params URL :
  `?new=1&autosend=1&intent=interest&article=cat:xxxx&title=...&distance=...&price=...`
  et appelle `prefillAndSend(...)`. Si `autosend=0` → ancien comportement (prefill seul).
- `RadarPanel.startChat()` remplace l'URL par la version auto-envoi avec tous les paramètres encodés.
- Garde-fou : si l'utilisateur n'est pas authentifié → redirection vers `/app/auth?redirect=...` (déjà en place), et **l'URL d'origine est conservée** pour rejouer l'auto-envoi après login.
- Dé-doublonnage : un même `article_id + intent` envoyé deux fois en moins de 30 s n'est envoyé qu'une seule fois (déjà géré par `outbound_dedup_key`).

---

## 2. Minuteur d'arrêt + relance du Radar

### Comportement attendu

- Au démarrage : le sonar tourne pendant un délai configurable (par défaut **90 s**, urgence **30 s**).
- À expiration : le sonar s'arrête (animation figée), un bandeau apparaît :
  > *« 📡 Radar en pause · {N} résultats · ⏱ relance dans 60 s »* avec un bouton **▶ Relancer maintenant**.
- Décompte visible avant pause (chip « auto-pause dans 12 s » en bas du canvas).
- Le bouton **Relancer** relance un scan complet + remet le minuteur à zéro.
- Quitter l'onglet Radar coupe automatiquement le scan (économie batterie / data).
- Réglage du délai exposé dans **Filtres → Auto-pause** : 30 s / 90 s / 5 min / Jamais (persisté dans `waouh_radar_filters_v1`).

### Détails techniques

- Nouveau hook `useRadarLifecycle({ autoPauseMs, onPause, onResume })` qui :
  - démarre un `setTimeout` à chaque `scan()`,
  - expose `paused`, `countdownMs`, `resume()`, `pauseNow()`.
- `RadarCanvas` reçoit `scanning={!paused}` → l'animation sonar s'arrête proprement quand `paused = true`.
- `useRadarScan` ne relance plus en boucle ; un seul scan par activation. Le real-time est désactivé en pause.
- Ajout dans `RadarFilters` : champ `autoPauseMs` (number | null).

---

## 3. UX / fichiers touchés

```text
src/app-mobile/components/radar/
  RadarPanel.tsx           ← passe à URL autosend + bandeau pause/relance
  RadarCanvas.tsx          ← accepte `scanning` réel + halo "pause"
  RadarFilters.tsx         ← option "Auto-pause"
  RadarItemSheet.tsx       ← idem (3 boutons → autosend)
src/app-mobile/hooks/
  useRadarLifecycle.ts     ← NEW
  useRadarScan.ts          ← n'auto-relance plus, scan() one-shot
src/app-mobile/screens/
  WaouhChatScreen.tsx      ← gère ?autosend=1&intent=&article=&title=&distance=&price=
src/components/waouh/
  WaouhWebChat.tsx         ← expose prefillAndSend()
```

Aucune migration de base de données ni nouvelle edge function. Le routeur WAOUH existant traite déjà les messages avec `metadata.article_id` et `metadata.intent`.

---

## 4. Critères d'acceptation

- ✅ Tap sur n'importe lequel des 3 boutons depuis le Radar → la fenêtre s'ouvre et le message est **déjà envoyé** (visible dans le fil), sans tap supplémentaire.
- ✅ Le message porte bien l'`article_id` + `intent` + distance dans son `metadata`.
- ✅ Pas de double envoi si on re-tape rapidement le même bouton (anti-spam 30 s).
- ✅ Le Radar s'arrête tout seul après le délai choisi, affiche le bandeau, et **Relancer** marche.
- ✅ Quitter puis revenir sur l'onglet Radar repart proprement, sans scan « zombie ».
- ✅ Un utilisateur non connecté est redirigé vers `/app/auth` et l'auto-envoi est rejoué après login.
