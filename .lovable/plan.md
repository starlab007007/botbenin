# Fix Complétude 0% — Historique WAOUH

## Diagnostic

La colonne **Complétude** affiche systématiquement 0% (parfois 8%) pour deux raisons cumulatives confirmées par les données live :

### Bug A — `CORE_STAGES` contient des étapes jamais émises
`supabase/functions/waouh-historique/index.ts` ligne 13 :
```ts
const CORE_STAGES = ["chat_in", "router", "sync", "queue_enqueue", "whatsapp_send"];
```
Mais en base, les seuls `stage` réellement insérés depuis 7 jours sont :
```
sync (51), queue_enqueue (43), web_mirror (20)
```
Aucune edge function n'émet `chat_in`, `router` ni `whatsapp_send` (vérifié via `rg "stage:"` sur `waouh-channel-in`, `waouh-negotiation-router`, `waouh-outbound-dispatch`, `waouh-webhook`). Plafond mathématique : **2/5 = 40 %** au mieux.

### Bug B — La majorité des `waouh_trace_events` n'ont pas de `negotiation_id`
```
sync         : 40 lignes null_neg / 11 avec neg
queue_enqueue: 34 / 9
web_mirror   : 11 / 9
```
`completeness` est calculée via `stagesByNeg.set(t.negotiation_id, …)` (ligne 86) : les lignes sans `negotiation_id` sont jetées, donc une négo dont les traces ont été émises avant que l'ID soit connu retombe à **0/5 = 0 %**.

C'est exactement ce qu'on voit sur la capture : 50 négos, toutes à 0 % sauf quelques 8 %.

## Correctifs (un seul fichier modifié)

`supabase/functions/waouh-historique/index.ts` :

1. Remplacer `CORE_STAGES` par les étapes effectivement émises :
   ```ts
   const CORE_STAGES = ["sync", "queue_enqueue", "web_mirror"];
   ```
   (action `list` ET action `timeline`, ligne 193, partagent la même constante.)

2. Étendre la sélection `waouh_trace_events` pour récupérer aussi les lignes sans `negotiation_id` mais liées à la négo via `article_id` + acteur :
   - Charger en plus `article_id, actor_user_id, transaction_id` dans le `select`.
   - Construire `stagesByNeg` en deux passes :
     - Pass 1 : `negotiation_id` direct (comportement actuel).
     - Pass 2 : pour chaque trace `negotiation_id IS NULL`, rattacher à toute négo dont
       `(article_id === t.article_id) && (actor_user_id ∈ {buyer_user_id, seller_user_id})`
       OU `(transaction_id === n.transaction_id)`.
   - Construire deux Maps de lookup (`negsByArticleActor`, `negsByTxn`) en O(N) avant la boucle traces.

3. Bonus invariant : exposer `missing` dans la réponse `list` (déjà fait dans `timeline`) pour que la UI affiche "Étapes manquantes" dans la modale détail sans round-trip.

Aucun changement de schéma, aucun changement front (la prop `pct` reste compatible). Pas de bump de lock WAOUH (hors scope chat sync).

## Vérification

Après déploiement :
- `Bic E2E *` (négos test sans WhatsApp réel) doivent passer de 0 % à ~66 % (sync + queue_enqueue + web_mirror tous présents) ou ~33 % si seul `sync` est tracé.
- Recharger `/admin/waouh/historique` → la colonne Complétude doit refléter les barres > 0 sur les négos récentes ayant déclenché des syncs.
- Requête de contrôle :
  ```sql
  SELECT n.id, ARRAY_AGG(DISTINCT t.stage) stages
  FROM waouh_negotiations n
  LEFT JOIN waouh_trace_events t
    ON t.negotiation_id = n.id
    OR (t.article_id = n.article_id AND t.actor_user_id IN (n.buyer_user_id, n.seller_user_id))
  WHERE n.updated_at > now() - interval '24 hours'
  GROUP BY n.id LIMIT 10;
  ```
