## Objectif

Étendre le **flux unique de synchronisation par partie** (`pushSyncedEvent` dans `_shared/waouh-sync.ts`) à **tous** les évènements du parcours WAOUH côté WhatsApp, pour les **deux parties** (acheteur + vendeur), quelle que soit la source du numéro WhatsApp :

1. Identifié depuis le **chat WhatsApp** (`waouh_users.phone_number` ou `waouh_lid_phone_map`)
2. Identifié depuis un **compte partenaire / business** (`waouh_partners`, `waouh_partner_businesses` via `article_id`)
3. Identifié depuis le **Radar IA** (`waouh_external_listings.seller_phone` via `article_id`)

La résolution multi-sources est déjà centralisée dans `resolveRealPhoneE164` (✅ couvre les 3 cas). Il reste à brancher **toutes** les notifications de parcours dessus pour garantir la livraison WhatsApp duplex.

## Diagnostic ciblé

| Évènement | Acheteur WA | Vendeur WA | État actuel |
|---|---|---|---|
| Intérêt acheteur (`waouh-buyer-interest`) | ✅ | ✅ | OK — utilise déjà `pushSyncedEvent` |
| Contre-offre / refus (`waouh-negotiation-router`) | ⚠️ partiel | ⚠️ partiel | Notifie **uniquement l'autre partie** via `pushToOther`. L'acteur ne reçoit pas de miroir WA |
| Accord conclu / deal créé (`waouh-negotiation-router`) | ⚠️ | ⚠️ | Idem : seule l'autre partie est enqueuée |
| Paiement init / succès / release (`waouh-payment` → `pushSystemMessage`) | ⚠️ | ⚠️ | Enqueue OK mais ne passe pas par le helper unifié → pas de trace, pas de dedup centralisé, pas de web-mirror systématique |
| Deal dispatch (`waouh-deal-dispatch`) | à vérifier | à vérifier | À auditer rapidement |
| Annonce publiée + 1er match radar (`waouh-sell-handler`, `waouh-radar-process`) | n/a | ⚠️ | Enqueue ad-hoc, pas via helper |

## Plan d'action

### A. Migration vers `pushSyncedEvent` (par partie)

Refactor des 5 sites de notification, en remplaçant les `rpc('waouh_enqueue_outbound_v2', …)` directs et `pushToOther` locaux par **deux** appels `pushSyncedEvent` (un par partie) avec `dedupSuffix: 'actor' | 'recipient'` pour éviter tout doublon :

1. **`waouh-negotiation-router/index.ts`**
   - Sur `intent === "yes"` → 2× `pushSyncedEvent({ role: 'buyer', intent: 'deal_created', ... })` et `{ role: 'seller', ... }`.
   - Sur `intent === "no"` → 2× `pushSyncedEvent({ intent: 'negotiation_closed', ... })`.
   - Sur `intent === "price"` → 2× `pushSyncedEvent({ intent: 'negotiation_counter', ... })`.
   - Le texte de l'acteur reste l'ack court ; celui du destinataire reste la notification complète. Les `attachments` (photos de l'article) sont passés des deux côtés.

2. **`waouh-payment/index.ts`**
   - Remplacer `pushSystemMessage` par `pushSyncedEvent` avec `intent: 'payment_init' | 'payment_success' | 'payment_release' | 'contact_exchange'`.
   - Garder la sémantique d'`exchangeContacts` (lock atomique `contacts_exchanged_at`) inchangée.

3. **`waouh-deal-dispatch/index.ts`** (à auditer puis migrer)
   - Notifs acheteur + vendeur + ops → `pushSyncedEvent` avec `intent: 'deal_dispatch'`.

4. **`waouh-sell-handler/index.ts`** + **`waouh-radar-process/index.ts`**
   - Confirmation "✅ Annonce publiée" et 1ère notification radar côté vendeur → `pushSyncedEvent({ role: 'seller', intent: 'article_published' | 'radar_match' })`, avec photo de couverture.

### B. Garanties transverses (déjà fournies par `pushSyncedEvent`)

- Résolution multi-sources via `resolveRealPhoneE164` (chat / partenaire / business / radar IA) — **inchangée**.
- Dedup central via `dedup_key` = `sync:{article}:{intent}:{user}:{neg}:{suffix}` → idempotence stricte même si l'évènement rejoue.
- Trace bout-à-bout (`waouh_trace_events`) avec `trace_id` propagé.
- Web mirror automatique pour les users ayant une `web_session_id` active (les sessions sont déjà synchronisées dans `WaouhMatchChatWindow` — contrat verrouillé non touché).
- Déclenchement immédiat du worker `waouh-outbound-dispatch` en fire-and-forget.

### C. Test E2E (3 scénarios) — exécuté via `supabase--curl_edge_functions` + `supabase--read_query`

Préparer 3 articles de fixture (ou réutiliser les existants) :

| # | Source vendeur | Provenance numéro vendeur | Acheteur |
|---|---|---|---|
| 1 | Vendeur app (`waouh_users`) | Chat WhatsApp (`phone_number`) | Acheteur WhatsApp |
| 2 | Annonce partenaire (`waouh_partner_businesses`) | Compte partenaire | Acheteur app |
| 3 | Annonce radar IA (`waouh_external_listings`) | `seller_phone` du listing | Acheteur app |

Étapes scriptées par scénario, avec assertions sur `waouh_messages` (chat) **ET** `waouh_outbound_queue` (WA enqueue) **ET** `waouh_trace_events` (couverture):

1. `POST /waouh-buy-handler` → recherche & sélection → attendu : 1 row WA pour acheteur (ack) + 1 row WA pour vendeur (notif intérêt).
2. `POST /waouh-negotiation-router` (offre acheteur) → attendu : WA acheteur (ack) + WA vendeur (offre).
3. `POST /waouh-negotiation-router` (acceptation vendeur) → attendu : WA acheteur (deal) + WA vendeur (deal) + insertion `waouh_deals`.
4. `POST /waouh-payment` (init + succès simulé) → attendu : WA acheteur + WA vendeur sur chaque étape, et **un seul** `exchangeContacts`.
5. Pour chaque scénario, vérifier l'absence de doublons via `count(*) GROUP BY dedup_key`.

### D. Plan de déploiement

Cas A — **Tests E2E concluants** :
1. Déploiement automatique des 5 edge functions modifiées.
2. Vérification post-deploy via `supabase--edge_function_logs` (recherche `pushSyncedEvent ok`).
3. Smoke test sur les 3 scénarios en production-like.
4. Verrouillage d'une snapshot mémoire `mem://features/waouh-whatsapp-sync-flow-locked-v1`.

Cas B — **Tests E2E non concluants** : ajouter au plan de déploiement les corrections ciblées (typiquement : mauvais mapping `target_role` côté actor, doublons sur `dedup_key` insuffisamment unique, ou `attachments` non propagés pour les listings radar sans `photos[]` — fallback sur `external_listings.images`).

## Hors scope

- Contrat `waouhChatSyncLock` (synchro web `WaouhMatchChatWindow` ↔ chat principal) — verrouillé, non modifié.
- Schéma DB : aucune migration nécessaire.
- UI front : aucun changement.

## Détails techniques

- Le helper `pushSyncedEvent` insère déjà dans `waouh_messages` (avec `article_id`, `meta.role`, `meta.trace_id`) **et** enqueue dans `waouh_outbound_queue` via `waouh_enqueue_outbound_v2`, **et** trace via `traceEvent`. Aucune logique nouvelle n'est introduite — uniquement de la convergence.
- `dedupSuffix: 'actor'` vs `'recipient'` permet d'autoriser explicitement les deux miroirs (acteur + destinataire) sans collision sur le `dedup_key`.
- Les attachments (photos article / cover) sont systématiquement passés des deux côtés ; le worker WAHA enverra l'image en première position puis le texte.
- Pour les annonces radar IA sans `waouh_articles.photos`, fallback sur `waouh_external_listings.images[0]` avant l'enqueue.
