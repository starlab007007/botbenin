## Objectif

1. **Verrouiller** les 3 scénarios validés (A: Vendeur WA + Acheteur WA, B: Vendeur App + Acheteur WA, C: Vendeur WA + Acheteur App) dans le `waouhChatSyncLock` + test de non-régression.
2. **Multi-fenêtres `WaouhMatchChatWindow`** :
   - Côté **acheteur App** : 1 fenêtre par **article** (déjà OK aujourd'hui — chaque article du même vendeur ouvre son propre onglet, car `matchKey = art_<articleId>_buyer`).
   - Côté **vendeur App** : 1 fenêtre par **(article, acheteur)** — aujourd'hui tous les acheteurs d'un même article retombent dans un onglet unique `art_<articleId>_seller`. Il faut éclater par acheteur.

---

## Analyse du blocage actuel

Fichier : `src/components/waouh/useWaouhMatchChats.ts`

```ts
export function matchKey(articleId, role) {
  return `art_${articleId ?? "none"}_${role}`;
}
```

- ✅ Acheteur : `art_<A1>_buyer`, `art_<A2>_buyer` → fenêtres distinctes pour 2 articles du même vendeur.
- ❌ Vendeur : tous les acheteurs B1, B2, B3 sur l'article A1 → un seul onglet `art_<A1>_seller`.

De plus, dans `WaouhMatchChatWindow` le filtre realtime + l'historique ne tiennent pas compte du `counterpart_user_id` côté vendeur — donc même si on créait 3 onglets, les 3 montreraient les mêmes messages.

Côté serveur :
- `waouh-buyer-interest` envoie déjà `counterpart_user_id: buyerUserId` à `waouh-notify-dispatch`, mais ce dernier ne le lit pas et ne le propage ni dans `waouh_notifications.payload`, ni dans le `dedupe_key`. Conséquence : 2 acheteurs distincts sur le même article le même jour → **une seule notification "Nouvel acheteur intéressé"** (dédupliquée).

---

## Conception cible

### 1. Clé canonique par contrepartie

```ts
// Nouvelle signature
matchKey(articleId, role, counterpartId?) :
  role === "seller"
    ? `art_${articleId}_seller_${counterpartId ?? "any"}`
    : `art_${articleId}_buyer`;  // inchangé (1 vendeur par article)
```

Stockage `MatchChatMeta` enrichi : `counterpart_user_id` devient **obligatoire** pour `kind: "seller"`.

### 2. Filtrage messages par contrepartie (vendeur)

- `waouh-match-history` (edge function) : ajouter un paramètre `counterpartUserId`. Quand `role=seller` et `counterpartUserId` fourni → filtrer les `waouh_messages` sur `(user_id = counterpartUserId OR meta->>buyer_user_id = counterpartUserId)`. Pour role=buyer, comportement inchangé.
- Realtime dans `WaouhMatchChatWindow` : ajouter le même filtre côté client (drop si `m.user_id !== counterpart && m.meta?.buyer_user_id !== counterpart` quand `match.kind === "seller"`).

### 3. Backend : dédup + payload par acheteur

`waouh-notify-dispatch/index.ts` :
- Lire `counterpart_user_id` dans `body`.
- **Inclure** `counterpart_user_id` dans :
  - `dedupe_key` (queue WA + notification) → 1 ligne par (kind, article, recipient, jour, **counterpart**).
  - `payload.counterpart_user_id` (utilisé par le front pour calculer la `matchKey`).
- Idem pour `payload.buyer_user_id` afin que `WaouhMatchChatWindow` puisse filtrer le realtime.

### 4. Front : ouverture multi-fenêtres depuis les notifs

`src/components/waouh/notificationActions.ts` :
- Lire `payload.counterpart_user_id` (et fallback `buyer_user_id`) → passé dans `CustomEvent("waouh:open-match-chat").detail.counterpart_user_id`.

`useWaouhMatchChats.openMatchFromDetail` :
- Si `role === "seller"` : `key = matchKey(articleId, "seller", detail.counterpart_user_id)`.
- Si pas de `counterpart_user_id` → fallback `_any` (legacy / défensif).

### 5. Migration douce des clés existantes

`migrateLegacyKeys` (déjà présent) — étendre :
- Onglets `art_<A>_seller` (sans counterpart) → renommer en `art_<A>_seller_any` et conserver le snapshot.
- Flag de migration bumpé à `waouh_keys_migrated_v3_<sid>`.

### 6. Verrouillage final

`src/components/waouh/waouhChatSyncLock.ts` — bump à `v12`, ajouter invariants :
- `matchKeyPerCounterpart` (file `useWaouhMatchChats.ts`) : doit contenir `art_${articleId}_seller_` et la branche counterpart.
- `notifyDispatchCounterpart` (file `waouh-notify-dispatch/index.ts`) : doit contenir `counterpart_user_id` dans `dedupeKey` et `payload`.
- `matchHistoryCounterpart` (file `waouh-match-history/index.ts`) : doit contenir `counterpartUserId`.
- `chatWindowCounterpartFilter` (file `WaouhMatchChatWindow.tsx`) : drop realtime si counterpart mismatch.
- Renforcer les invariants existants A/B/C déjà verrouillés (v6, v9, v10, v11) — re-listés en bloc dans un commentaire `frozenScenariosABC`.

Test `waouh-chat-sync-flow.lock.test.ts` se met à jour automatiquement (il itère sur les invariants).

---

## Couverture des 3 scénarios

| | Acheteur WA | Acheteur App |
|---|---|---|
| **Vendeur WA** (A & C) | A : WA-only, pas de fenêtre App impactée. La dédup par counterpart côté `waouh-notifications` reste cohérente (1 notif in-app par buyer côté audit). | C : Vendeur sans App, donc pas de fenêtre. Acheteur App ouvre 1 fenêtre par article — déjà OK. |
| **Vendeur App** (B) | B : **cas principal**. Chaque buyer WA scrapé/spontané déclenche une notif `new_buyer` distincte (dédup inclut `counterpart_user_id`) → ouverture d'1 `WaouhMatchChatWindow` par buyer côté vendeur App. | Symétrique B↔C : vendeur App + acheteur App → idem, 1 fenêtre par (article, buyer). |

Pour l'acheteur (App) qui s'intéresse à N articles du même vendeur : `matchKey` reste `art_<articleId>_buyer` → N fenêtres distinctes (déjà fonctionnel, vérifié à l'audit + renforcé par un invariant explicite).

---

## Étapes d'implémentation

1. **Edge functions**
   - `waouh-notify-dispatch/index.ts` : lire/propager `counterpart_user_id` (dedupe + payload + queue meta).
   - `waouh-match-history/index.ts` : accepter `counterpartUserId` et filtrer.
   - Déployer les 2 fonctions.

2. **Front**
   - `useWaouhMatchChats.ts` : `matchKey(articleId, role, counterpart?)`, branche seller, migration v3.
   - `notificationActions.ts` : propager `counterpart_user_id` dans l'event.
   - `WaouhMatchChatWindow.tsx` : transmettre `counterpartUserId` à `waouh-match-history` + filtre realtime.

3. **Verrouillage**
   - `waouhChatSyncLock.ts` : bump v12, nouveaux invariants + scénarios A/B/C re-listés.
   - Le test existant valide automatiquement.

4. **Smoke tests**
   - 2 acheteurs WA distincts → article du vendeur App → 2 notifs `new_buyer`, 2 fenêtres ouvrables.
   - 1 acheteur App → 2 articles du même vendeur → 2 fenêtres distinctes côté acheteur.
   - Régression scénarios A / B / C : webhook + router + LID + radar — le test de lock garantit qu'aucun invariant antérieur n'est cassé.

---

## Bugs / risques identifiés

| # | Symptôme | Cause | Correctif |
|---|---|---|---|
| 1 | 2e acheteur WA sur même article le même jour ne déclenche pas de notif vendeur | `dedupe_key` sans counterpart dans `waouh-notify-dispatch` | inclure `counterpart_user_id` dans dedupe |
| 2 | Vendeur voit fusion des messages de plusieurs buyers dans un seul onglet | `matchKey` ne discrimine pas, realtime non filtré | clé `art_<A>_seller_<buyer>` + filtre realtime |
| 3 | `waouh-match-history` retourne tout l'historique article côté vendeur | pas de filtre counterpart | ajout param `counterpartUserId` |
| 4 | Migration : utilisateurs avec onglet `art_<A>_seller` perdent l'historique | snapshot localStorage attaché à l'ancienne clé | renommage v3 préservant le snapshot |
| 5 | Régression scénarios verrouillés A/B/C | nouveaux invariants doivent coexister | bump `v12` + test lock conserve toutes les règles v1→v11 |
