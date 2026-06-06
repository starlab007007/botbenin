# Diagnostic & correctifs — pages WAOUH Admin

## Diagnostic

### Capture 1 — `/admin/waouh/health-check` → « Failed to send a request to the Edge Function »

- L'edge function `waouh-health-check` **n'est pas déployée** (réponse `404 NOT_FOUND` confirmée via test direct).
- Cause : aucune entrée `[functions.waouh-health-check]` dans `supabase/config.toml`. Lovable ne déploie que les fonctions déclarées. Toutes les fonctions WAOUH récentes (`waouh-health-check`, `waouh-historique`, `waouh-history`, `waouh-match-history`, `waouh-buy-handler`, `waouh-sell-handler`, etc.) sont absentes du `config.toml`.
- Pour `waouh-historique`, le code source est bien déployé (logs présents), mais la majorité des autres fonctions récemment ajoutées n'ont jamais été propagées.

### Capture 2 — `/admin/waouh/historique` → « Edge Function returned a non-2xx status code » (Backfill)

L'action `backfill` (et même `list`) de `waouh-historique` échoue à cause de **divergences de schéma** entre le code et la base actuelle :

| Code (`waouh-historique/index.ts`)             | Base réelle (`waouh_negotiations`)         |
|------------------------------------------------|--------------------------------------------|
| `status`                                       | `state`                                    |
| `current_price`, `last_price`, `currency`      | `last_offer_price` (pas de `currency`)     |
| `["accepted","paid","closed"].includes(n.status)` | `n.state`                                |

Et dans `waouh_trace_events` :
- `trace_id` est typé **`uuid`** en base, mais le backfill insère des chaînes `"backfill-<id>"`, `"backfill-msg-<id>"`, `"backfill-q-<id>"` → l'insert échoue silencieusement (erreur ignorée par `if (!error)`), mais la requête principale `list` plante avant à cause du `select status,current_price,...` inexistant et renvoie un 500.

C'est ce 500 qui fait que :
- toute la page reste vide (`Négociations 0`, table « Aucune négociation »),
- le Backfill renvoie « non-2xx ».

Le flux verrouillé `mem://features/waouh-chat-sync-flow` n'est pas touché : aucune des corrections ne modifie `waouh-webhook`, `waouh-negotiation-router`, ni `WaouhMatchChatWindow`.

---

## Correctifs proposés

### 1. Déployer les fonctions WAOUH manquantes
Ajouter à `supabase/config.toml` les blocs manquants (Lovable redéploie automatiquement) :

```toml
[functions.waouh-health-check]
verify_jwt = true

[functions.waouh-historique]
verify_jwt = true

[functions.waouh-history]
verify_jwt = false

[functions.waouh-match-history]
verify_jwt = false
```

(plus les autres `waouh-*-handler` si leur absence empêche d'autres écrans — à compléter en même temps pour éviter de repasser).

### 2. Aligner `waouh-historique` sur le schéma réel

Dans `supabase/functions/waouh-historique/index.ts` :

- Action `list` : remplacer le `select` par
  `"id, article_id, buyer_user_id, seller_user_id, state, last_offer_price, transaction_id, created_at, updated_at, meta"` et le tri `.order("updated_at", …)`.
- Remplacer chaque référence à `n.status` par `n.state`, idem pour le filtre `if (status && status !== "all") q = q.eq("state", status)`.
- Action `backfill` :
  - lire `state` au lieu de `status`,
  - remplacer `["accepted","paid","closed"].includes(n.status)` par la liste réelle des états terminaux (`["accepted","paid","closed","completed"]` selon les valeurs présentes en base — à vérifier via une `SELECT DISTINCT state`).
  - **`trace_id` doit être un UUID** : générer `crypto.randomUUID()` pour chaque évènement synthétique et déplacer l'ancien identifiant dans `dedup_key` (text) ou dans `payload.backfill_key` pour conserver la traçabilité.
  - logger explicitement les erreurs d'insert (`console.error`) et renvoyer `ok:false` + 500 si **toutes** les insertions échouent, pour ne plus masquer le problème.

### 3. UI — surfaces d'erreur (sans toucher au flux verrouillé)
- `AdminWaouhHistoriquePage.tsx` : afficher le message d'erreur backend (`data?.error`) au lieu de simplement « Erreur inconnue ».
- `AdminWaouhHealthCheckPage.tsx` : aucun changement nécessaire une fois la fonction déployée ; conserver le bandeau d'erreur existant.

### 4. Vérification après déploiement
- `curl` direct (anonyme) sur `/waouh-health-check` doit renvoyer 200 (la fonction n'exige pas d'auth).
- `curl` direct sur `/waouh-historique` doit renvoyer `401 unauthorized` (auth requise), et `200 ok:true` quand appelé depuis la page admin connectée comme admin.
- Lancer le bouton **Backfill traces** depuis la page Historique → toast « Backfill terminé » avec compteurs > 0 si négociations présentes.
- Relancer la suite `waouh-chat-sync-flow.lock.test.ts` pour confirmer que le flux verrouillé reste intact.

### 5. Aucune modification de
- `waouh-webhook`, `waouh-negotiation-router`, `waouh-match-history` (logique),
- `WaouhMatchChatWindow.tsx`,
- `waouhChatSyncLock.ts` (la lock v1 reste figée).

---

## Détails techniques (résumé)

```text
config.toml          → +4 blocs [functions.*]      (déploie les fonctions manquantes)
waouh-historique     → status→state, prix/currency retirés, trace_id=uuid, erreurs loggées
AdminWaouhHistoriquePage.tsx → toast.description = data?.error || error?.message
```
