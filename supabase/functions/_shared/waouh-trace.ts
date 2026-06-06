// WAOUH — Trace structurée pipeline (article → router → sync → queue → WA)
// Insert fire-and-forget dans `waouh_trace_events`. Jamais bloquant.

export type TraceStage =
  | "chat_in"
  | "router"
  | "sync"
  | "queue_enqueue"
  | "queue_dispatch"
  | "whatsapp_send"
  | "whatsapp_delivered"
  | "whatsapp_error"
  | "web_mirror";

export interface TraceEventArgs {
  trace_id?: string | null;
  article_id?: string | null;
  negotiation_id?: string | null;
  transaction_id?: string | null;
  deal_id?: string | null;
  actor_user_id?: string | null;
  recipient_user_id?: string | null;
  role?: string | null;
  stage: TraceStage | string;
  status?: "ok" | "error" | "skipped";
  intent?: string | null;
  dedup_key?: string | null;
  payload?: Record<string, any>;
  error?: string | null;
}

/** Génère un trace_id (uuid v4). */
export function newTraceId(): string {
  // @ts-ignore Deno fournit crypto.randomUUID
  return crypto.randomUUID();
}

/** Insert non bloquant. */
export async function traceEvent(sb: any, args: TraceEventArgs): Promise<void> {
  try {
    await sb.from("waouh_trace_events").insert({
      trace_id: args.trace_id ?? null,
      article_id: args.article_id ?? null,
      negotiation_id: args.negotiation_id ?? null,
      transaction_id: args.transaction_id ?? null,
      deal_id: args.deal_id ?? null,
      actor_user_id: args.actor_user_id ?? null,
      recipient_user_id: args.recipient_user_id ?? null,
      role: args.role ?? null,
      stage: args.stage,
      status: args.status ?? "ok",
      intent: args.intent ?? null,
      dedup_key: args.dedup_key ?? null,
      payload: args.payload ?? {},
      error: args.error ?? null,
    });
  } catch (e) {
    console.warn("[traceEvent] insert failed", e);
  }
}
