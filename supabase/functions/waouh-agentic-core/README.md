# WAOUH agentic core (sans paiement)

Cette Edge Function expose le socle acheteur/vendeur agentique. Elle exige un JWT Supabase utilisateur valide et utilise toujours le format suivant :

```json
{
  "action": "mission.list",
  "payload": {}
}
```

Une réponse réussie est `{ "ok": true, "data": ... }`. Une erreur est `{ "ok": false, "error": { "code": "...", "message": "..." } }`.

Toute action ou charge utile mentionnant une exécution de paiement est rejetée. Les tables de paiement existantes ne sont ni lues ni modifiées.

## Actions

| Action | Payload principal | Donnée retournée |
| --- | --- | --- |
| `mission.create` | `goal`, `channel?`, `locale?`, `constraints?`, `preferences?` | `mission` |
| `mission.list` | `status?`, `limit?`, `cursor?` | `missions`, `items`, `next_cursor` |
| `mission.get` | `mission_id` | `mission`, `intents`, `plans`, `steps` |
| `mission.pause` / `mission.resume` / `mission.cancel` | `mission_id` | `mission` |
| `mission.run` | `mission_id` | `mission`, `run_id` |
| `watch.create` | `query`, `target_amount?`, `article_id?`, `source_url?`, `check_interval_minutes?`, `expires_at?` | `watch` |
| `watch.list` | `status?`, `limit?`, `cursor?` | `watches`, `items`, `next_cursor` |
| `watch.update` | `watch_id` et champs modifiables | `watch` |
| `watch.delete` | `watch_id` | `deleted`, `watch_id` |
| `watch.observe` | `watch_id`, `amount`, `available?`, preuve manuelle | `observation`, `triggered`, `status` |
| `watch.events` | `watch_id?`, `unread_only?`, `limit?`, `cursor?` | `events`, `items`, `next_cursor` |
| `watch.event.read` | `event_id` | `event` |
| `activity.list` | `mission_id?`, `limit?`, `cursor?` | `activities`, `items`, `next_cursor` |
| `approval.request` | `action_type`, `action_summary`, `mission_id?`, `step_id?`, `context?`, `expires_at?` | `approval` |
| `approval.list` | `status?`, `limit?`, `cursor?` | `approvals`, `items`, `next_cursor` |
| `approval.decide` | `approval_id`, `decision`, `note?` | `approval` |
| `seller_policy.get` | `article_id?`, `business_id?` | `policy`, `policies`, `items` |
| `seller_policy.upsert` | `mode`, `article_id?`, `business_id?`, bornes et règles | `policy` |
| `offer.create` | `mission_id`, `article_id`, `amount`, `quantity?`, `expires_at?`, `terms?` | `offer` |
| `offer.list` | `mission_id?`, `status?`, `limit?`, `cursor?` | `offers`, `items`, `next_cursor` |
| `offer.respond` | `offer_id`, `decision`, `counter_amount?`, `note?` | `offer`, `counter_offer` |
| `media.create` | métadonnées Storage et rattachement optionnel | `media` |
| `media.list` | rattachement optionnel, `limit?`, `cursor?` | `media`, `items`, `next_cursor` |
| `domain.list` | aucun | `domains`, `items`, `default_policy: "deny"` |

Les mutations d'observation issues d'une API partenaire ou d'un navigateur sont réservées aux workers utilisant `service_role` directement. L'action utilisateur `watch.observe` enregistre uniquement une preuve manuelle.

## Modèle de confiance

- L'identité propriétaire vient du JWT, jamais du payload.
- Un vendeur ne crée une offre que pour un article qui lui appartient.
- Une offre est un instantané immuable signé par HMAC dans un schéma privé.
- Une décision sensible non financière reste bloquée jusqu'à une approbation explicite.
- Un domaine absent de `waouh_domain_policies` est refusé par défaut.
- Les clients ont un accès SQL en lecture limité par RLS ; toutes les écritures passent par cette fonction.
