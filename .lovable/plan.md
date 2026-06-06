
## Diagnostic

J'ai inspecté la base et les logs. Le bug est confirmé côté DB :

- Le vendeur reçoit bien le 1er message « 📩 Nouvel acheteur intéressé » (id `efd0af70…`, `article_id = 2ba18517…` ✅) — celui-ci passe par `waouh-webhook → pushToOther` qui a déjà été corrigé.
- En revanche, les messages suivants destinés au vendeur :
  - « 🤝 Nouvelle offre acheteur » (id `123639ec…`) → `article_id = NULL`, `meta` sans `article_id`
  - « 🎉 Vente conclue ! » (id `9515eccd…`) → `article_id = NULL`, `meta` sans `article_id`

`WaouhMatchChatWindow` filtre strictement sur `article_id.eq.X OR meta->>article_id.eq.X` (fetch + realtime). Sans cette colonne, ces messages sont invisibles dans la fenêtre produit du vendeur, alors qu'ils s'affichent quand même dans le chat principal (qui ne filtre pas par article).

## Cause racine

Le flux contre-offre / OUI / NON passe en réalité par une **autre edge function** : `waouh-negotiation-router` (et non la branche `NEGOTIATE` de `waouh-webhook` que j'avais corrigée). Son helper `pushToOther` :
1. **N'insère le message que si `target.web_session_id` existe** → s'il manque, aucune ligne n'est créée et le vendeur ne reçoit jamais dans `WaouhMatchChatWindow`.
2. **N'écrit jamais la colonne `article_id`** dans `waouh_messages`.
3. **N'ajoute pas `article_id` dans `meta`** (le `directMeta` passé ne contient que `negotiation_id`, `deal_id`, `transaction_id`).

Conséquence : la fenêtre produit côté vendeur reste figée sur le bandeau seed et ne voit ni la contre-offre, ni la vente conclue.

## Plan de correction

### 1) `supabase/functions/waouh-negotiation-router/index.ts` — `pushToOther`

- Insérer **toujours** dans `waouh_messages` dès que `target.id` est connu (au lieu de conditionner à `web_session_id`). Mettre `channel = "web"` si web session, sinon `"system"`.
- Renseigner la colonne `article_id` à partir de `payload.article_id ?? directMeta.article_id ?? null`.
- Ajouter `article_id` dans `meta` en plus de la colonne, pour les rows legacy / sécurité du filtre realtime.

### 2) Ajouter `article_id` dans tous les `directMeta` du router

Aux 3 appels `pushToOther` du router :
- Refus (ligne 244) : `{ intent: "negotiation_closed", negotiation_id: neg.id, article_id: neg.article_id }`
- Contre-offre (ligne 263) : `{ intent: "negotiation_open", negotiation_id: neg.id, transaction_id: neg.transaction_id, article_id: neg.article_id }`
- Deal accepté (ligne 212) : `{ intent: "deal_created", negotiation_id: neg.id, deal_id: deal?.id, article_id: neg.article_id }`

### 3) Aucun changement frontend nécessaire

Le filtre actuel de `WaouhMatchChatWindow` (`article_id.eq.X OR meta->>article_id.eq.X`, plus le realtime scopé sur `user_id=eq.<seller>`) fonctionne dès que la colonne `article_id` est correctement renseignée.

### Préservé
- Chat principal vendeur, notifications WhatsApp, branche NEGOTIATE de `waouh-webhook` (déjà corrigée), composer, logique métier des négociations.
- Aucune migration SQL nécessaire.

### Fichier modifié
- `supabase/functions/waouh-negotiation-router/index.ts`
