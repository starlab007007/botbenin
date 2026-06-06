## Objectif

Faire en sorte que la fenêtre `WaouhMatchChatWindow` (vendeur **et** acheteur) reçoive **exactement** les mêmes messages, actions et notifications que le `WAOUH chat principal`, sans fuite des messages destinés à l'autre partie.

## Diagnostic

### Bug 1 — Fuite cross-party dans la fenêtre
`WaouhMatchChatWindow.fetchArticlePage` (lignes 148-158) filtre uniquement par `article_id` / `meta->>article_id`. Comme `waouh_messages` contient les lignes des **deux** parties (vendeur + acheteur) pour le même article, tout est affiché des deux côtés. C'est pourquoi :
- Côté vendeur : on voit en plus `✅ Demande envoyée au vendeur` (reply stocké sous le user_id de l'acheteur).
- Côté acheteur : on voit `📩 Nouvel acheteur intéressé` et `✅ Annonce publiée` (stockés sous le user_id du vendeur).

### Bug 2 — Contre-offres et "Vente conclue" absentes de la fenêtre
Dans `waouh-webhook/index.ts`, les `pushToOther` pour :
- contre-offre (`negotiation_open`, lignes 1076-1085),
- accord (`deal_accepted`, lignes 1122-1132),
- refus (`deal_refused`, lignes 1143-1152),

passent un `directMeta` qui **n'inclut pas** `article_id`. La ligne `waouh_messages` insérée par `pushToOther` (lignes 441-449) ne renseigne pas non plus la colonne `article_id`. Résultat : la fenêtre ne voit jamais ces messages (le filtre `article_id.eq.X OR meta->>article_id.eq.X` ne matche pas), mais le chat principal les voit (pas de filtre).

Idem pour le `reply` local de l'acteur d'une `NEGOTIATE` (ligne 1087) : aucun `returnedArticleId` n'est défini → `outboundArticleId` est `null` dans `waouh-channel-in` (sauf si l'envoi vient déjà de la fenêtre, qui passe `clientMeta.article_id`). Depuis le chat principal, la contre-offre tapée par l'utilisateur ne porte donc pas d'`article_id` et n'apparaît pas dans la fenêtre.

## Modifications

### 1. `src/components/waouh/WaouhMatchChatWindow.tsx`

**a) Scoper l'historique au visualisateur** dans `fetchArticlePage` :

```ts
let q = supabase.from("waouh_messages")
  .select("id,direction,text,created_at,attachments,meta,article_id")
  .or(`article_id.eq.${match.article_id},meta->>article_id.eq.${match.article_id}`)
  .order("created_at", { ascending: false })
  .limit(limit);

const viewerOrs: string[] = [];
if (sessionId) viewerOrs.push(`web_session_id.eq.${sessionId}`);
if (waouhIds.length) viewerOrs.push(`user_id.in.(${waouhIds.join(",")})`);
if (viewerOrs.length) q = q.or(viewerOrs.join(","));

if (before) q = q.lt("created_at", before);
```

Les deux `.or()` chaînés produisent `(article filter) AND (viewer filter)` — exactement ce qu'il faut. Le canal realtime est déjà scopé par `web_session_id` et `user_id`, donc aucune modification côté realtime.

**Effet** :
- Vendeur : disparition de `✅ Demande envoyée au vendeur` (appartient au session/user acheteur).
- Acheteur : disparition de `📩 Nouvel acheteur intéressé` et `✅ Annonce publiée` (appartiennent au user vendeur).
- Chacun ne voit plus que ses propres bulles + celles qui lui sont explicitement adressées.

**b)** Aucun changement de la bannière jaune, du composer ni de la logique d'envoi.

### 2. `supabase/functions/waouh-webhook/index.ts`

**a) Contre-offre — ligne 1081** : enrichir `directMeta` pour porter l'article :

```ts
directMeta: { intent: "negotiation_open", negotiation_id: neg.id, article_id: neg.article_id },
```

**b) Accord conclu — ligne 1128** :

```ts
directMeta: { intent: "deal_accepted", negotiation_id: neg.id, article_id: neg.article_id },
```

**c) Refus — ligne 1148** :

```ts
directMeta: { intent: "deal_refused", negotiation_id: neg.id, article_id: neg.article_id },
```

**d) NEGOTIATE / DECIDE_YES / DECIDE_NO — assurer `returnedArticleId`** pour que le `reply` de l'acteur (inséré par `waouh-channel-in`) porte aussi `article_id` et apparaisse dans la fenêtre côté actif :

- Dans le bloc `NEGOTIATE` (ligne 1066, branche `amount`) : ajouter `returnedArticleId = neg.article_id;` juste après l'`update`.
- Dans `DECIDE_YES` (déjà fait ligne 1135) : conserver.
- Dans `DECIDE_NO` (ligne 1136-1155) : ajouter `returnedArticleId = neg.article_id;` après l'`update`.

`waouh-channel-in` propage déjà `outboundArticleId` (lignes 470-477), donc le message sortant gagnera automatiquement la colonne `article_id` et arrivera dans la fenêtre du visualiseur.

### 3. Hors scope

- Pas de changement du composer ni de la séquence de négociation existante.
- Pas de modification du `WAOUH chat principal` ni des notifications WhatsApp / `waouh_notifications`.
- Pas de migration SQL.

## Validation

Après déploiement de l'edge function et rebuild front :

1. **Vendeur publie** une annonce dans le chat principal :
   - Chat principal vendeur : `✅ Annonce publiée` ✓
   - Fenêtre vendeur : bannière jaune seule (pas de duplication, pas de "Demande envoyée").
   - Fenêtre acheteur : rien (annonce non encore matchée).
2. **Acheteur** dit « intéressé 1 » :
   - Chat principal acheteur : `✅ Demande envoyée au vendeur` ✓
   - Fenêtre acheteur : bannière + `✅ Demande envoyée au vendeur` (sa propre bulle).
   - Chat principal vendeur : `📩 Nouvel acheteur intéressé` ✓
   - Fenêtre vendeur : bannière + `📩 Nouvel acheteur intéressé` (sans "Demande envoyée").
3. **Acheteur** propose un autre prix → fenêtre acheteur affiche sa bulle, fenêtre vendeur reçoit `💬 Nouvelle offre de l'acheteur` (grâce au `article_id` ajouté dans `directMeta`).
4. **Vendeur** répond OUI → les deux côtés affichent `🎉 Accord conclu` dans la fenêtre comme dans le chat principal.
