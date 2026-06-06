---
name: WAOUH Historique Dashboard
description: Admin-only dashboard at /admin/waouh/historique aggregating negotiations + chat/WhatsApp messages with article/status filters and end-to-end traces.
type: feature
---
- Route: `/admin/waouh/historique` (AdminRoute, admin-only).
- Edge function `waouh-historique` (admin-checked via `has_role`) returns negotiations + KPIs + per-negotiation timeline (messages, outbound queue, notifications, trace events).
- Default window: 30 days (filter adjustable 7–365).
- Trace table: `waouh_trace_events` (trace_id, article_id, negotiation_id, transaction_id, stage, status, intent, payload, error). Stages: `chat_in`, `router`, `sync`, `queue_enqueue`, `queue_dispatch`, `whatsapp_send`, `whatsapp_delivered`, `whatsapp_error`, `web_mirror`.
- Trace helper: `supabase/functions/_shared/waouh-trace.ts` (`traceEvent`, `newTraceId`), fire-and-forget non-blocking.
- `pushSyncedEvent` (`_shared/waouh-sync.ts`) accepts optional `traceId`, generates one if missing, propagates into `waouh_messages.meta.trace_id` and queue `payload.trace_id`, emits `sync` + `queue_enqueue` + `web_mirror` trace events.
- WAOUH locked chat flow remains unchanged — only observability added.
