import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const ALLOWED_ORIGINS = new Set([
  "https://bot.bj",
  "https://www.bot.bj",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const EVENT_TYPES = new Set([
  "session_start", "session_end", "page_view", "heartbeat",
  "user_message", "assistant_message", "chat_error", "chat_reset",
  "ocr_start", "ocr_success", "ocr_failure", "notes_validated",
]);

const inMemoryRate = new Map<string, number[]>();
const MAX_EVENTS_PER_REQUEST = 20;
const MAX_EVENTS_PER_MINUTE = 120;
const MAX_BODY_BYTES = 48_000;
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";

function clampInt(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function safeText(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://bot.bj";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function allowRate(sessionId: string, eventCount: number): boolean {
  const now = Date.now();
  const previous = (inMemoryRate.get(sessionId) || []).filter((stamp) => now - stamp < 60_000);
  if (previous.length + eventCount > MAX_EVENTS_PER_MINUTE) {
    inMemoryRate.set(sessionId, previous);
    return false;
  }
  for (let index = 0; index < eventCount; index += 1) previous.push(now);
  inMemoryRate.set(sessionId, previous);
  if (inMemoryRate.size > 5_000) {
    for (const [key, stamps] of inMemoryRate.entries()) {
      if (!stamps.some((stamp) => now - stamp < 60_000)) inMemoryRate.delete(key);
    }
  }
  return true;
}

function sanitizedMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const allowedKeys = [
    "notes_count", "conversation_length", "response_profile", "source",
    "success", "catalog_count", "release", "reason", "validated_count",
  ];
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    const current = input[key];
    if (typeof current === "boolean") result[key] = current;
    else if (typeof current === "number" && Number.isFinite(current)) result[key] = current;
    else if (typeof current === "string") result[key] = current.slice(0, 120);
  }
  return result;
}

function estimateTokens(chars: number | null, overhead = 0): number | null {
  if (chars == null) return null;
  return Math.max(0, Math.ceil(chars / 4) + overhead);
}

function estimateCost(model: string | null, inputTokens: number | null, outputTokens: number | null): number | null {
  if (inputTokens == null && outputTokens == null) return null;
  const normalized = (model || DEFAULT_MODEL).toLowerCase();
  let inputPerMillion = 0.30;
  let outputPerMillion = 2.50;
  if (normalized.includes("flash-lite")) {
    inputPerMillion = 0.10;
    outputPerMillion = 0.40;
  }
  return Number((((inputTokens || 0) / 1_000_000) * inputPerMillion
    + ((outputTokens || 0) / 1_000_000) * outputPerMillion).toFixed(8));
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "origin_not_allowed" }, 403, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ ok: false, error: "payload_too_large" }, 413, origin);

  try {
    const body = await req.json();
    if (body?.action === "health") {
      return json({
        ok: true,
        service: "apresbac-public-analytics",
        privacy: "metadata-only",
        default_model: DEFAULT_MODEL,
      }, 200, origin);
    }

    const session = body?.session || {};
    const sessionId = safeText(session.session_id, 128);
    const visitorId = safeText(session.visitor_id, 128);
    const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS_PER_REQUEST) : [];

    if (!sessionId || !visitorId) return json({ ok: false, error: "invalid_session" }, 400, origin);
    if (!events.length) return json({ ok: true, accepted: 0 }, 200, origin);
    if (!allowRate(sessionId, events.length)) return json({ ok: false, error: "telemetry_rate_limited" }, 429, origin);

    const visitorHash = await sha256(visitorId);
    const now = new Date().toISOString();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const sessionRow = {
      session_id: sessionId,
      visitor_hash: visitorHash,
      last_seen_at: now,
      bac_series: safeText(session.bac_series, 24),
      channel: safeText(session.channel, 40) || "public-web",
      device_type: safeText(session.device_type, 32),
      browser_family: safeText(session.browser_family, 48),
      os_family: safeText(session.os_family, 48),
      locale: safeText(session.locale, 24),
      timezone: safeText(session.timezone, 64),
      referrer_host: safeText(session.referrer_host, 120),
      campaign_source: safeText(session.campaign_source, 120),
      campaign_medium: safeText(session.campaign_medium, 120),
      campaign_name: safeText(session.campaign_name, 120),
      first_path: safeText(session.first_path, 120) || "/apresbacia",
      release: safeText(session.release, 40),
    };

    const { error: sessionError } = await supabase
      .from("apresbac_public_sessions")
      .upsert(sessionRow, { onConflict: "session_id" });
    if (sessionError) throw sessionError;

    const rows = events
      .filter((event: Record<string, unknown>) => EVENT_TYPES.has(String(event?.event_type || "")))
      .map((event: Record<string, unknown>) => {
        const eventType = String(event.event_type);
        const requestChars = clampInt(event.request_chars, 0, 500_000);
        const responseChars = clampInt(event.response_chars, 0, 500_000);
        const explicitInput = clampInt(event.input_tokens, 0, 500_000);
        const explicitOutput = clampInt(event.output_tokens, 0, 500_000);
        const inputTokens = explicitInput ?? estimateTokens(requestChars, eventType === "assistant_message" ? 2_000 : 0);
        const outputTokens = explicitOutput ?? estimateTokens(responseChars, 0);
        const model = safeText(event.model, 100) || (eventType === "assistant_message" ? DEFAULT_MODEL : null);

        return {
          session_id: sessionId,
          event_type: eventType,
          created_at: safeText(event.created_at, 40) || now,
          bac_series: safeText(event.bac_series, 24) || sessionRow.bac_series,
          duration_ms: clampInt(event.duration_ms, 0, 900_000),
          status_code: clampInt(event.status_code, 100, 599),
          request_chars: requestChars,
          response_chars: responseChars,
          estimated_input_tokens: inputTokens,
          estimated_output_tokens: outputTokens,
          estimated_cost_usd: eventType === "assistant_message"
            ? estimateCost(model, inputTokens, outputTokens)
            : null,
          model,
          error_code: safeText(event.error_code, 100),
          metadata: sanitizedMetadata(event.metadata),
        };
      });

    const persistedRows = rows.filter((row) => row.event_type !== "heartbeat");
    if (persistedRows.length) {
      const { error: eventError } = await supabase.from("apresbac_public_events").insert(persistedRows);
      if (eventError) throw eventError;
    }

    if (rows.some((row) => row.event_type === "session_end")) {
      await supabase
        .from("apresbac_public_sessions")
        .update({ ended_at: now, last_seen_at: now })
        .eq("session_id", sessionId);
    }

    return json({ ok: true, accepted: persistedRows.length }, 200, origin);
  } catch (error) {
    console.error("apresbac-public-analytics", error);
    return json({ ok: false, error: "analytics_write_failed" }, 400, origin);
  }
});
