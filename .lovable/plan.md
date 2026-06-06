# Plan — Dashboard Historique WAOUH + Persistance Chat + Traces structurées

## Décisions validées
- Dashboard **admin only** (`AdminRoute`).
- Profondeur d'historique par défaut **30 jours** (filtre période ajustable).

## Objectifs
1. Page admin **Dashboard Historique** : négociations + messages chat & WhatsApp, avec filtres par article et statut.
2. Garantir la persistance et le rechargement automatique de tous les chats (WaouhMatchChatWindow acheteur/vendeur, WAOUH principal acheteur/vendeur, WhatsApp acheteur/vendeur).
3. Trace structurée par `article_id` + `transaction_id` pour suivre le pipeline complet : chat → router → sync → queue → WhatsApp.

Aucune modification du flux WAOUH chat verrouillé. Ajout d'observabilité + vue admin en lecture seule.

---

## 1) Page Dashboard Historique

- Route : `/admin/waouh/historique` (AdminRoute).
- Fichier : `src/pages/waouh/AdminWaouhHistoriquePage.tsx`.
- Composants `src/components/waouh/historique/` :
  - `HistoriqueFilters.tsx` — article (autocomplete `waouh_articles` + `waouh_unified_catalog`), statut négociation (`open`, `counter`, `accepted`, `refused`, `paid`, `closed`), canal (`web` / `whatsapp` / `all`), période (défaut 30 j), rôle, recherche texte.
  - `HistoriqueStatsCards.tsx` — KPI (négos ouvertes, contre-offres, deals, taux livraison WA, erreurs trace).
  - `HistoriqueNegotiationsTable.tsx` — liste paginée `waouh_negotiations` enrichie (article, acheteur, vendeur, dernier prix, statut, dernier évènement). Mobile = cards empilées.
  - `HistoriqueTimelineDrawer.tsx` — timeline fusionnée triée chronologiquement : `waouh_messages` (web+WA, in+out) + `waouh_outbound_queue` + `waouh_notifications` + `waouh_pipeline_events`.
  - `HistoriqueTraceDrawer.tsx` — vue regroupée par `trace_id` (timeline visuelle par stage, badges erreurs, export JSON/CSV vers `/mnt/documents`).
- Source : nouvelle edge `waouh-historique` (agrégateur lecture admin). Vérifie `has_role(auth.uid(),'admin')`.

---

## 2) Persistance & rechargement des chats

Audit + corrections ciblées, sans toucher le flux d'envoi verrouillé.

| Chat | Composant | Source persistante | Action |
|---|---|---|---|
| WAOUH principal (vendeur & acheteur) | `WaouhWebChat.tsx` | `waouh_messages` via `waouh-history` | Vérifier chargement initial + realtime sur `user_id`. |
| WaouhMatchChatWindow (acheteur & vendeur) | `WaouhMatchChatWindow.tsx` | `waouh_messages` filtrés `article_id` | S'assurer du fetch historique complet à l'ouverture (pas que les nouveaux). Pas de changement de flux. |
| WhatsApp (vendeur & acheteur) | inbox + détails | `waouh_messages` (channel=`whatsapp`) | Vérifier que `waha-webhook` + `waouh-outbound-dispatch` écrivent systématiquement `direction`, `channel='whatsapp'`, `article_id`, `meta.intent`. Compléter résolution `article_id` sur INBOUND via `lid_phone_map` + négociation active si manquant. |

Hook partagé : `src/hooks/useWaouhPersistedHistory.ts`
- Params `{ articleId?, userIds?, channel?, limit, before }`.
- Appelle `waouh-history` (étendu) + réabonnement realtime.
- Retourne `{ messages, hasMore, loadOlder, refresh }`.
- Utilisé par WaouhMatchChatWindow (chargement initial) et la timeline du dashboard.

Extension `waouh-history` : ajouter filtres optionnels `articleId`, `negotiationId`, `channel` sans casser les appelants existants.

---

## 3) Trace structurée article_id + transaction_id

Nouvelle table `waouh_pipeline_events` :
- `id uuid PK`, `trace_id uuid` (indexé)
- `article_id uuid`, `negotiation_id uuid`, `transaction_id uuid`, `deal_id uuid` (indexés)
- `actor_user_id uuid`, `recipient_user_id uuid`, `role text`
- `stage text` — `chat_in`, `router`, `sync`, `queue_enqueue`, `queue_dispatch`, `whatsapp_send`, `whatsapp_delivered`, `whatsapp_error`, `web_mirror`
- `status text` — `ok` / `error` / `skipped`
- `intent text`, `dedup_key text`
- `payload jsonb`, `error text`
- `created_at timestamptz default now()`
- GRANTS conformes ; RLS : lecture admin via `has_role`, insert `service_role`.

Helper partagé `supabase/functions/_shared/waouh-trace.ts` :
```ts
await traceEvent(sb, { trace_id, article_id, negotiation_id, transaction_id, stage, status, intent, actor_user_id, recipient_user_id, payload, error });
```
- Insert fire-and-forget, jamais bloquant.
- Génère/propage un `trace_id` (uuid) inséré dans `waouh_messages.meta.trace_id` et `waouh_outbound_queue.payload.trace_id` pour corrélation de bout en bout.

Points d'instrumentation (5 stages obligatoires) :
1. `chat_in` — `waouh-webhook` (web), `waha-webhook` / `whatsapp-waha-webhook` (WA).
2. `router` — `waouh-negotiation-router`.
3. `sync` — `_shared/waouh-sync.ts pushSyncedEvent` (1 entrée par partie).
4. `queue_enqueue` / `queue_dispatch` — `waouh-outbound-dispatch`.
5. `whatsapp_send` / `whatsapp_delivered` / `whatsapp_error` — callbacks WAHA.

---

## 4) Sécurité & non-régression
- Flux WAOUH chat verrouillé inchangé (`mem://features/waouh-chat-sync-flow`).
- `pushSyncedEvent` : ajout d'un `traceEvent` non bloquant uniquement.
- `waouh_pipeline_events` : RLS admin lecture, pas de secrets stockés.
- Dashboard : `AdminRoute` côté front + check `has_role` côté edge.

---

## Fichiers

Migration
- `waouh_pipeline_events` (CREATE + GRANT + RLS + index sur trace_id, article_id, negotiation_id, created_at).

Edge functions
- New : `supabase/functions/_shared/waouh-trace.ts`
- New : `supabase/functions/waouh-historique/index.ts`
- Edit (filtres) : `waouh-history/index.ts`
- Edit (instrumentation trace uniquement) : `waouh-webhook`, `waouh-negotiation-router`, `_shared/waouh-sync.ts`, `waouh-outbound-dispatch`, `waha-webhook`, `whatsapp-waha-webhook`, `waouh-buyer-interest`.

Frontend
- New : `src/pages/waouh/AdminWaouhHistoriquePage.tsx`
- New : `src/components/waouh/historique/{HistoriqueFilters,HistoriqueStatsCards,HistoriqueNegotiationsTable,HistoriqueTimelineDrawer,HistoriqueTraceDrawer}.tsx`
- New : `src/hooks/useWaouhPersistedHistory.ts`
- Edit : `src/App.tsx` (route `/admin/waouh/historique`)
- Edit : `src/components/waouh/WaouhMatchChatWindow.tsx` (chargement initial via hook ; pas de changement d'envoi).

Mémoire
- Mise à jour `mem://features/waouh-chat-sync-flow` pour mentionner que le hook `useWaouhPersistedHistory` est la voie officielle de chargement (sans modifier le flux).
- Nouvelle entrée mémoire `mem://features/waouh-historique-dashboard`.
