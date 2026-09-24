import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.49.8";
import {
  getRequestUser,
  jsonResponse,
  waouhCorsHeaders,
} from "../_shared/waouh-auth.ts";

type JsonObject = Record<string, unknown>;

const ALLOWED_APPROVAL_ACTIONS = new Set([
  "external_browse",
  "send_message",
  "publish_listing",
  "share_contact",
  "negotiate_offer",
  "accept_offer",
  "create_watch",
  "access_location",
  "use_media",
  "seller_policy_change",
]);
const PAYMENT_PATTERN = /(payment|checkout|purchase|payer|paiement|momo|stripe|kkiapay|fedapay)/i;

class ApiError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

function errorResponse(status: number, code: string, message?: string) {
  return jsonResponse({
    ok: false,
    error: { code, message: message ?? code },
  }, status);
}

function asObject(value: unknown, name = "payload"): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(422, "invalid_payload", `${name} must be an object`);
  }
  return value as JsonObject;
}

function asString(value: unknown, name: string, min = 1, max = 2_000): string {
  if (typeof value !== "string") throw new ApiError(422, `invalid_${name}`);
  const result = value.trim();
  if (result.length < min || result.length > max) throw new ApiError(422, `invalid_${name}`);
  return result;
}

function optionalString(value: unknown, name: string, max = 2_000): string | null {
  if (value == null || value === "") return null;
  return asString(value, name, 1, max);
}

function uuid(value: unknown, name: string): string {
  const result = asString(value, name, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new ApiError(422, `invalid_${name}`);
  }
  return result;
}

function positiveNumber(value: unknown, name: string, optional = false): number | null {
  if (optional && (value == null || value === "")) return null;
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(result) || result < 0) throw new ApiError(422, `invalid_${name}`);
  return result;
}

function integer(value: unknown, name: string, fallback: number, min: number, max: number): number {
  if (value == null) return fallback;
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) throw new ApiError(422, `invalid_${name}`);
  return result;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function jsonObject(value: unknown, name: string): JsonObject {
  if (value == null) return {};
  return asObject(value, name);
}

function stringArray(value: unknown, name: string, max = 50): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) throw new ApiError(422, `invalid_${name}`);
  return value.map((entry) => asString(entry, name, 1, 160));
}

function isoDate(value: unknown, name: string): string | null {
  if (value == null || value === "") return null;
  const raw = asString(value, name, 10, 64);
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp)) throw new ApiError(422, `invalid_${name}`);
  return new Date(timestamp).toISOString();
}

function cursor(value: unknown): string | null {
  return isoDate(value, "cursor");
}

function safeUrl(value: unknown, name: string): string | null {
  const raw = optionalString(value, name, 2_048);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
    return parsed.toString();
  } catch {
    throw new ApiError(422, `invalid_${name}`);
  }
}

function pickEnum<T extends string>(value: unknown, name: string, allowed: readonly T[], fallback?: T): T {
  if (value == null && fallback) return fallback;
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new ApiError(422, `invalid_${name}`);
  return value as T;
}

function ensureNoFinancialAction(action: string, payload: JsonObject) {
  const containsFinancialDirective = (value: unknown, parentKey = ""): boolean => {
    if (PAYMENT_PATTERN.test(parentKey)) return true;
    if (Array.isArray(value)) return value.some((entry) => containsFinancialDirective(entry, parentKey));
    if (value && typeof value === "object") {
      return Object.entries(value as JsonObject).some(([key, entry]) => containsFinancialDirective(entry, key));
    }
    return typeof value === "string"
      && ["action_type", "tool_name", "operation", "provider"].includes(parentKey)
      && PAYMENT_PATTERN.test(value);
  };
  if (PAYMENT_PATTERN.test(action) || containsFinancialDirective(payload)) {
    throw new ApiError(422, "financial_action_not_supported", "Payments are intentionally outside this API");
  }
}

async function queryOne<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>, code: string): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new ApiError(500, code, error.message);
  if (!data) throw new ApiError(404, code);
  return data;
}

async function ownedArticle(sb: SupabaseClient, authUserId: string, articleId: string) {
  const article = await queryOne<any>(
    sb.from("waouh_articles").select("id,seller_id,title,price,currency,status").eq("id", articleId).maybeSingle(),
    "article_not_found",
  );
  const seller = await queryOne<any>(
    sb.from("waouh_users").select("id,auth_user_id").eq("id", article.seller_id).maybeSingle(),
    "seller_not_found",
  );
  if (seller.auth_user_id !== authUserId) throw new ApiError(403, "article_not_owned");
  return article;
}

async function ownedBusiness(sb: SupabaseClient, authUserId: string, businessId: string) {
  const business = await queryOne<any>(
    sb.from("waouh_partner_businesses").select("id,partner_id,nom_entreprise,statut").eq("id", businessId).maybeSingle(),
    "business_not_found",
  );
  const partner = await queryOne<any>(
    sb.from("waouh_partners").select("id,user_id").eq("id", business.partner_id).maybeSingle(),
    "partner_not_found",
  );
  if (partner.user_id !== authUserId) throw new ApiError(403, "business_not_owned");
  return business;
}

async function ownedMission(sb: SupabaseClient, authUserId: string, missionId: string) {
  const mission = await queryOne<any>(
    sb.from("waouh_agent_missions").select("*").eq("id", missionId).maybeSingle(),
    "mission_not_found",
  );
  if (mission.owner_id !== authUserId) throw new ApiError(403, "mission_not_owned");
  return mission;
}

async function audit(
  sb: SupabaseClient,
  ownerId: string,
  eventType: string,
  entityType: string,
  entityId: string | null,
  details: JsonObject = {},
  missionId: string | null = null,
  actorId: string | null = ownerId,
  actorType: "user" | "agent" | "worker" | "system" = "user",
) {
  const { error } = await sb.from("waouh_agent_audit_log").insert({
    owner_id: ownerId,
    actor_id: actorId,
    actor_type: actorType,
    mission_id: missionId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });
  if (error) throw new ApiError(500, "audit_write_failed", error.message);
}

async function enqueue(
  sb: SupabaseClient,
  ownerId: string,
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  payload: JsonObject,
  dedupeKey: string,
  missionId: string | null = null,
) {
  const { error } = await sb.from("waouh_agent_outbox").upsert({
    owner_id: ownerId,
    mission_id: missionId,
    event_type: eventType,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    payload,
    dedupe_key: dedupeKey,
  }, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new ApiError(500, "outbox_write_failed", error.message);
}

function listMeta(rows: any[], limit: number) {
  return rows.length === limit ? rows[rows.length - 1]?.created_at ?? null : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: waouhCorsHeaders });
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed");

  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 1_000_000) throw new ApiError(413, "payload_too_large");

    const requestBody = asObject(await req.json(), "body");
    const action = asString(requestBody.action, "action", 3, 80);
    const payload = asObject(requestBody.payload ?? {}, "payload");
    ensureNoFinancialAction(action, payload);

    const authUser = await getRequestUser(req);
    if (!authUser) throw new ApiError(401, "authentication_required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new ApiError(500, "server_not_configured");
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const ownerId = authUser.id;

    switch (action) {
      case "mission.create": {
        const goal = asString(payload.goal, "goal", 3, 2_000);
        const channel = pickEnum(payload.channel, "channel", ["web", "mobile", "whatsapp"] as const, "web");
        const locale = optionalString(payload.locale, "locale", 20) ?? "fr-BJ";
        const constraints = jsonObject(payload.constraints, "constraints");
        const preferences = jsonObject(payload.preferences, "preferences");

        const mission = await queryOne<any>(
          sb.from("waouh_agent_missions").insert({
            owner_id: ownerId,
            goal,
            channel,
            locale,
            constraints,
            preferences,
            status: "active",
          }).select("*").single(),
          "mission_create_failed",
        );
        try {
          await queryOne<any>(
            sb.from("waouh_agent_intents").insert({
              mission_id: mission.id,
              owner_id: ownerId,
              intent_type: "purchase_search",
              normalized_query: goal,
              slots: constraints,
              confidence: 1,
            }).select("id").single(),
            "intent_create_failed",
          );
          const plan = await queryOne<any>(
            sb.from("waouh_agent_plans").insert({
              mission_id: mission.id,
              owner_id: ownerId,
              version: 1,
              status: "active",
              rationale: "Plan initial déterministe : recherche, comparaison et présentation.",
            }).select("*").single(),
            "plan_create_failed",
          );
          const { error: stepsError } = await sb.from("waouh_agent_steps").insert([
            { plan_id: plan.id, mission_id: mission.id, owner_id: ownerId, sequence_no: 1, tool_name: "catalog_search", status: "queued", input: { goal, constraints } },
            { plan_id: plan.id, mission_id: mission.id, owner_id: ownerId, sequence_no: 2, tool_name: "compare_results", status: "blocked", input: {} },
            { plan_id: plan.id, mission_id: mission.id, owner_id: ownerId, sequence_no: 3, tool_name: "present_recommendations", status: "blocked", input: {} },
          ]);
          if (stepsError) throw new ApiError(500, "steps_create_failed", stepsError.message);
          const { data: updated, error: updateError } = await sb.from("waouh_agent_missions")
            .update({ current_plan_id: plan.id }).eq("id", mission.id).select("*").single();
          if (updateError) throw new ApiError(500, "mission_plan_link_failed", updateError.message);
          await audit(sb, ownerId, "mission.created", "mission", mission.id, { channel, locale }, mission.id);
          await enqueue(sb, ownerId, "mission.created", "mission", mission.id, { mission_id: mission.id }, `mission.created:${mission.id}`, mission.id);
          return jsonResponse({ ok: true, data: { mission: updated } }, 201);
        } catch (error) {
          await sb.from("waouh_agent_missions").delete().eq("id", mission.id);
          throw error;
        }
      }

      case "mission.list": {
        const limit = integer(payload.limit, "limit", 25, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_agent_missions").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.status) query = query.eq("status", asString(payload.status, "status", 2, 32));
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "mission_list_failed", error.message);
        const missions = data ?? [];
        return jsonResponse({ ok: true, data: { missions, items: missions, next_cursor: listMeta(missions, limit) } });
      }

      case "mission.get": {
        const mission = await ownedMission(sb, ownerId, uuid(payload.mission_id, "mission_id"));
        const [intentResult, planResult, stepResult] = await Promise.all([
          sb.from("waouh_agent_intents").select("*").eq("mission_id", mission.id).order("version", { ascending: false }),
          sb.from("waouh_agent_plans").select("*").eq("mission_id", mission.id).order("version", { ascending: false }),
          sb.from("waouh_agent_steps").select("*").eq("mission_id", mission.id).order("sequence_no"),
        ]);
        for (const result of [intentResult, planResult, stepResult]) {
          if (result.error) throw new ApiError(500, "mission_detail_failed", result.error.message);
        }
        return jsonResponse({ ok: true, data: { mission, intents: intentResult.data, plans: planResult.data, steps: stepResult.data } });
      }

      case "mission.pause":
      case "mission.resume":
      case "mission.cancel": {
        const missionId = uuid(payload.mission_id, "mission_id");
        const mission = await ownedMission(sb, ownerId, missionId);
        const nextStatus = action === "mission.pause" ? "paused" : action === "mission.resume" ? "active" : "cancelled";
        const allowed = action === "mission.pause" ? ["active"] : action === "mission.resume" ? ["paused"] : ["active", "paused", "planning"];
        if (!allowed.includes(mission.status)) throw new ApiError(409, "invalid_mission_transition");
        const { data, error } = await sb.from("waouh_agent_missions")
          .update({ status: nextStatus, completed_at: nextStatus === "cancelled" ? new Date().toISOString() : null })
          .eq("id", missionId).eq("owner_id", ownerId).select("*").single();
        if (error) throw new ApiError(500, "mission_update_failed", error.message);
        await audit(sb, ownerId, `mission.${nextStatus}`, "mission", missionId, {}, missionId);
        return jsonResponse({ ok: true, data: { mission: data } });
      }

      case "mission.run": {
        const missionId = uuid(payload.mission_id, "mission_id");
        const mission = await ownedMission(sb, ownerId, missionId);
        if (!["active", "paused"].includes(mission.status)) throw new ApiError(409, "mission_not_runnable");
        const requestedAt = new Date().toISOString();
        const { data, error } = await sb.from("waouh_agent_missions").update({
          status: "active",
          next_run_at: requestedAt,
          last_error: null,
        }).eq("id", missionId).eq("owner_id", ownerId).select("*").single();
        if (error) throw new ApiError(500, "mission_run_failed", error.message);
        const runId = crypto.randomUUID();
        await enqueue(sb, ownerId, "mission.run_requested", "mission", missionId, {
          mission_id: missionId,
          run_id: runId,
        }, `mission.run_requested:${missionId}:${runId}`, missionId);
        await audit(sb, ownerId, "mission.run_requested", "mission", missionId, { run_id: runId }, missionId);
        return jsonResponse({ ok: true, data: { mission: data, run_id: runId } }, 202);
      }

      case "watch.create": {
        const queryText = asString(payload.query, "query", 2, 1_000);
        const articleId = payload.article_id ? uuid(payload.article_id, "article_id") : null;
        const sourceUrl = safeUrl(payload.source_url, "source_url");
        const targetAmount = positiveNumber(payload.target_amount, "target_amount", true);
        const watch = await queryOne<any>(
          sb.from("waouh_watchlists").insert({
            owner_id: ownerId,
            query: queryText,
            article_id: articleId,
            source_url: sourceUrl,
            target_amount: targetAmount,
            currency: pickEnum(payload.currency, "currency", ["XOF"] as const, "XOF"),
            check_interval_minutes: integer(payload.check_interval_minutes, "check_interval_minutes", 60, 15, 10_080),
            expires_at: isoDate(payload.expires_at, "expires_at"),
          }).select("*").single(),
          "watch_create_failed",
        );
        await audit(sb, ownerId, "watch.created", "watch", watch.id, { query: queryText });
        await enqueue(sb, ownerId, "watch.created", "watch", watch.id, { watch_id: watch.id }, `watch.created:${watch.id}`);
        return jsonResponse({ ok: true, data: { watch } }, 201);
      }

      case "watch.list": {
        const limit = integer(payload.limit, "limit", 25, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_watchlists").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.status) query = query.eq("status", asString(payload.status, "status", 2, 32));
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "watch_list_failed", error.message);
        const watches = data ?? [];
        return jsonResponse({ ok: true, data: { watches, items: watches, next_cursor: listMeta(watches, limit) } });
      }

      case "watch.update": {
        const watchId = uuid(payload.watch_id, "watch_id");
        const existing = await queryOne<any>(sb.from("waouh_watchlists").select("*").eq("id", watchId).eq("owner_id", ownerId).maybeSingle(), "watch_not_found");
        const patch: JsonObject = {};
        if (payload.query != null) patch.query = asString(payload.query, "query", 2, 1_000);
        if (payload.target_amount !== undefined) patch.target_amount = positiveNumber(payload.target_amount, "target_amount", true);
        if (payload.source_url !== undefined) patch.source_url = safeUrl(payload.source_url, "source_url");
        if (payload.check_interval_minutes != null) patch.check_interval_minutes = integer(payload.check_interval_minutes, "check_interval_minutes", 60, 15, 10_080);
        if (payload.expires_at !== undefined) patch.expires_at = isoDate(payload.expires_at, "expires_at");
        if (payload.status != null) patch.status = pickEnum(payload.status, "status", ["active", "paused"] as const);
        if (Object.keys(patch).length === 0) return jsonResponse({ ok: true, data: { watch: existing } });
        const { data, error } = await sb.from("waouh_watchlists").update(patch).eq("id", watchId).eq("owner_id", ownerId).select("*").single();
        if (error) throw new ApiError(500, "watch_update_failed", error.message);
        await audit(sb, ownerId, "watch.updated", "watch", watchId, { fields: Object.keys(patch) });
        return jsonResponse({ ok: true, data: { watch: data } });
      }

      case "watch.delete": {
        const watchId = uuid(payload.watch_id, "watch_id");
        await queryOne<any>(sb.from("waouh_watchlists").select("id").eq("id", watchId).eq("owner_id", ownerId).maybeSingle(), "watch_not_found");
        const { error } = await sb.from("waouh_watchlists").delete().eq("id", watchId).eq("owner_id", ownerId);
        if (error) throw new ApiError(500, "watch_delete_failed", error.message);
        await audit(sb, ownerId, "watch.deleted", "watch", watchId);
        return jsonResponse({ ok: true, data: { deleted: true, watch_id: watchId } });
      }

      case "watch.observe": {
        const watchId = uuid(payload.watch_id, "watch_id");
        const watch = await queryOne<any>(sb.from("waouh_watchlists").select("*").eq("id", watchId).eq("owner_id", ownerId).maybeSingle(), "watch_not_found");
        const amount = positiveNumber(payload.amount, "amount")!;
        const available = bool(payload.available, true);
        const previous = watch.last_observed_amount == null ? null : Number(watch.last_observed_amount);
        const source = pickEnum(payload.source, "source", ["manual"] as const, "manual");
        const observation = await queryOne<any>(
          sb.from("waouh_price_observations").insert({
            watchlist_id: watchId,
            owner_id: ownerId,
            article_id: watch.article_id,
            // Browser/API observations are written by trusted workers directly; users may only add manual evidence.
            source,
            source_url: safeUrl(payload.source_url, "source_url") ?? watch.source_url,
            amount,
            previous_amount: previous,
            currency: "XOF",
            available,
            evidence: jsonObject(payload.evidence, "evidence"),
          }).select("*").single(),
          "observation_create_failed",
        );
        const targetReached = watch.target_amount != null && amount <= Number(watch.target_amount);
        const priceDropped = previous != null && amount < previous;
        const nextCheckAt = new Date(Date.now() + Number(watch.check_interval_minutes) * 60_000).toISOString();
        const nextStatus = targetReached ? "triggered" : watch.status;
        const { error: updateError } = await sb.from("waouh_watchlists").update({
          last_observed_amount: amount,
          last_checked_at: new Date().toISOString(),
          next_check_at: nextCheckAt,
          status: nextStatus,
        }).eq("id", watchId);
        if (updateError) throw new ApiError(500, "watch_observation_update_failed", updateError.message);
        if (targetReached || priceDropped) {
          const eventType = targetReached ? "target_reached" : "price_drop";
          const event = await queryOne<any>(
            sb.from("waouh_watch_events").insert({
              watchlist_id: watchId,
              owner_id: ownerId,
              observation_id: observation.id,
              event_type: eventType,
              title: targetReached ? "Prix cible atteint" : "Baisse de prix détectée",
              body: `${amount.toLocaleString("fr-FR")} FCFA`,
              payload: { amount, previous_amount: previous },
            }).select("*").single(),
            "watch_event_create_failed",
          );
          await enqueue(sb, ownerId, `watch.${eventType}`, "watch", watchId, { watch_id: watchId, event_id: event.id }, `watch.${eventType}:${observation.id}`);
        }
        return jsonResponse({ ok: true, data: { observation, triggered: targetReached || priceDropped, status: nextStatus } }, 201);
      }

      case "watch.events": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_watch_events").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.watch_id) query = query.eq("watchlist_id", uuid(payload.watch_id, "watch_id"));
        if (payload.unread_only === true) query = query.is("read_at", null);
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "watch_events_failed", error.message);
        const events = data ?? [];
        return jsonResponse({ ok: true, data: { events, items: events, next_cursor: listMeta(events, limit) } });
      }

      case "watch.event.read": {
        const eventId = uuid(payload.event_id, "event_id");
        const { data, error } = await sb.from("waouh_watch_events")
          .update({ read_at: new Date().toISOString() }).eq("id", eventId).eq("owner_id", ownerId)
          .select("*").maybeSingle();
        if (error) throw new ApiError(500, "watch_event_update_failed", error.message);
        if (!data) throw new ApiError(404, "watch_event_not_found");
        return jsonResponse({ ok: true, data: { event: data } });
      }

      case "activity.list": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_agent_audit_log").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.mission_id) query = query.eq("mission_id", uuid(payload.mission_id, "mission_id"));
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "activity_list_failed", error.message);
        const activities = data ?? [];
        return jsonResponse({ ok: true, data: { activities, items: activities, next_cursor: listMeta(activities, limit) } });
      }

      case "approval.request": {
        const missionId = payload.mission_id ? uuid(payload.mission_id, "mission_id") : null;
        if (missionId) await ownedMission(sb, ownerId, missionId);
        const actionType = pickEnum(payload.action_type, "action_type", [...ALLOWED_APPROVAL_ACTIONS]);
        const context = jsonObject(payload.context, "context");
        ensureNoFinancialAction(actionType, context);
        const approval = await queryOne<any>(
          sb.from("waouh_agent_approvals").insert({
            owner_id: ownerId,
            mission_id: missionId,
            step_id: payload.step_id ? uuid(payload.step_id, "step_id") : null,
            action_type: actionType,
            action_summary: asString(payload.action_summary, "action_summary", 3, 500),
            context,
            expires_at: isoDate(payload.expires_at, "expires_at") ?? new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          }).select("*").single(),
          "approval_create_failed",
        );
        await audit(sb, ownerId, "approval.requested", "approval", approval.id, { action_type: actionType }, missionId);
        return jsonResponse({ ok: true, data: { approval } }, 201);
      }

      case "approval.list": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        let query = sb.from("waouh_agent_approvals").select("*").eq("owner_id", ownerId)
          .order("created_at", { ascending: false }).limit(limit);
        if (payload.status) query = query.eq("status", asString(payload.status, "status", 2, 20));
        const before = cursor(payload.cursor);
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "approval_list_failed", error.message);
        const approvals = data ?? [];
        return jsonResponse({ ok: true, data: { approvals, items: approvals, next_cursor: listMeta(approvals, limit) } });
      }

      case "approval.decide": {
        const approvalId = uuid(payload.approval_id, "approval_id");
        const decision = pickEnum(payload.decision, "decision", ["approved", "rejected"] as const);
        const approval = await queryOne<any>(
          sb.from("waouh_agent_approvals").select("*").eq("id", approvalId).eq("owner_id", ownerId).maybeSingle(),
          "approval_not_found",
        );
        if (approval.status !== "pending") throw new ApiError(409, "approval_already_decided");
        if (Date.parse(approval.expires_at) <= Date.now()) {
          await sb.from("waouh_agent_approvals").update({ status: "expired" }).eq("id", approvalId);
          throw new ApiError(409, "approval_expired");
        }
        const { data, error } = await sb.from("waouh_agent_approvals").update({
          status: decision,
          decision_note: optionalString(payload.note, "note", 1_000),
          decided_at: new Date().toISOString(),
        }).eq("id", approvalId).eq("status", "pending").select("*").single();
        if (error) throw new ApiError(500, "approval_decide_failed", error.message);
        if (approval.step_id) {
          await sb.from("waouh_agent_steps").update({ status: decision === "approved" ? "queued" : "cancelled" }).eq("id", approval.step_id);
        }
        await audit(sb, ownerId, `approval.${decision}`, "approval", approvalId, { action_type: approval.action_type }, approval.mission_id);
        await enqueue(sb, ownerId, `approval.${decision}`, "approval", approvalId, { approval_id: approvalId }, `approval.${decision}:${approvalId}`, approval.mission_id);
        return jsonResponse({ ok: true, data: { approval: data } });
      }

      case "seller_policy.get": {
        let query = sb.from("waouh_seller_policies").select("*").eq("owner_id", ownerId).eq("active", true);
        if (payload.article_id) query = query.eq("article_id", uuid(payload.article_id, "article_id"));
        if (payload.business_id) query = query.eq("business_id", uuid(payload.business_id, "business_id"));
        const { data, error } = await query.order("updated_at", { ascending: false });
        if (error) throw new ApiError(500, "seller_policy_get_failed", error.message);
        const policies = data ?? [];
        return jsonResponse({ ok: true, data: { policy: policies[0] ?? null, policies, items: policies } });
      }

      case "seller_policy.upsert": {
        const articleId = payload.article_id ? uuid(payload.article_id, "article_id") : null;
        const businessId = payload.business_id ? uuid(payload.business_id, "business_id") : null;
        if (articleId) await ownedArticle(sb, ownerId, articleId);
        if (businessId) await ownedBusiness(sb, ownerId, businessId);
        const values = {
          owner_id: ownerId,
          article_id: articleId,
          business_id: businessId,
          mode: pickEnum(payload.mode, "mode", ["manual", "assisted", "automatic"] as const),
          min_price_amount: positiveNumber(payload.min_price_amount, "min_price_amount", true),
          max_discount_percent: positiveNumber(payload.max_discount_percent, "max_discount_percent", true),
          allow_counteroffers: bool(payload.allow_counteroffers, true),
          auto_expire_minutes: integer(payload.auto_expire_minutes, "auto_expire_minutes", 1_440, 15, 43_200),
          delivery_zones: stringArray(payload.delivery_zones, "delivery_zones"),
          rules: jsonObject(payload.rules, "rules"),
          active: true,
        };
        if (values.max_discount_percent != null && values.max_discount_percent > 100) throw new ApiError(422, "invalid_max_discount_percent");
        let existingQuery = sb.from("waouh_seller_policies").select("id").eq("owner_id", ownerId).eq("active", true);
        existingQuery = articleId ? existingQuery.eq("article_id", articleId) : existingQuery.is("article_id", null);
        existingQuery = businessId ? existingQuery.eq("business_id", businessId) : existingQuery.is("business_id", null);
        const { data: existing, error: findError } = await existingQuery.maybeSingle();
        if (findError) throw new ApiError(500, "seller_policy_lookup_failed", findError.message);
        const mutation = existing
          ? sb.from("waouh_seller_policies").update(values).eq("id", existing.id).select("*").single()
          : sb.from("waouh_seller_policies").insert(values).select("*").single();
        const policy = await queryOne<any>(mutation, "seller_policy_save_failed");
        await audit(sb, ownerId, existing ? "seller_policy.updated" : "seller_policy.created", "seller_policy", policy.id, { mode: policy.mode });
        return jsonResponse({ ok: true, data: { policy } }, existing ? 200 : 201);
      }

      case "offer.create": {
        const missionId = uuid(payload.mission_id, "mission_id");
        const articleId = uuid(payload.article_id, "article_id");
        const mission = await queryOne<any>(sb.from("waouh_agent_missions").select("id,owner_id,status").eq("id", missionId).maybeSingle(), "mission_not_found");
        if (["cancelled", "failed", "completed"].includes(mission.status)) throw new ApiError(409, "mission_not_active");
        const article = await ownedArticle(sb, ownerId, articleId);
        const amount = positiveNumber(payload.amount, "amount")!;
        const quantity = integer(payload.quantity, "quantity", 1, 1, 10_000);
        const { data: policies, error: policyError } = await sb.from("waouh_seller_policies")
          .select("*").eq("owner_id", ownerId).eq("active", true)
          .or(`article_id.eq.${articleId},and(article_id.is.null,business_id.is.null)`)
          .order("article_id", { ascending: false, nullsFirst: false }).limit(1);
        if (policyError) throw new ApiError(500, "seller_policy_lookup_failed", policyError.message);
        const policy = policies?.[0] ?? null;
        if (policy?.min_price_amount != null && amount < Number(policy.min_price_amount)) throw new ApiError(422, "offer_below_policy_floor");
        if (policy?.max_discount_percent != null && article.price != null) {
          const floor = Number(article.price) * (1 - Number(policy.max_discount_percent) / 100);
          if (amount < floor) throw new ApiError(422, "offer_exceeds_discount_policy");
        }
        const expiresAt = isoDate(payload.expires_at, "expires_at")
          ?? new Date(Date.now() + Number(policy?.auto_expire_minutes ?? 1_440) * 60_000).toISOString();
        if (Date.parse(expiresAt) <= Date.now()) throw new ApiError(422, "offer_expiry_must_be_future");
        const offer = await queryOne<any>(
          sb.from("waouh_signed_offers").insert({
            mission_id: missionId,
            article_id: articleId,
            seller_policy_id: policy?.id ?? null,
            issuer_id: ownerId,
            buyer_id: mission.owner_id,
            seller_id: ownerId,
            amount,
            currency: "XOF",
            quantity,
            terms: jsonObject(payload.terms, "terms"),
            expires_at: expiresAt,
          }).select("*").single(),
          "offer_create_failed",
        );
        await sb.from("waouh_offer_events").insert({ offer_id: offer.id, buyer_id: offer.buyer_id, seller_id: offer.seller_id, actor_id: ownerId, event_type: "proposed", payload: { amount, currency: "XOF" } });
        await audit(sb, ownerId, "offer.created", "offer", offer.id, { amount, currency: "XOF" }, missionId);
        await audit(sb, mission.owner_id, "offer.received", "offer", offer.id, { article_id: articleId }, missionId, ownerId);
        await enqueue(sb, mission.owner_id, "offer.proposed", "offer", offer.id, { offer_id: offer.id, mission_id: missionId }, `offer.proposed:${offer.id}`, missionId);
        return jsonResponse({ ok: true, data: { offer } }, 201);
      }

      case "offer.list": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        const before = cursor(payload.cursor);
        let query = sb.from("waouh_signed_offers").select("*")
          .or(`buyer_id.eq.${ownerId},seller_id.eq.${ownerId}`).order("created_at", { ascending: false }).limit(limit);
        if (payload.mission_id) query = query.eq("mission_id", uuid(payload.mission_id, "mission_id"));
        if (payload.status) query = query.eq("status", asString(payload.status, "status", 2, 24));
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "offer_list_failed", error.message);
        const offers = data ?? [];
        return jsonResponse({ ok: true, data: { offers, items: offers, next_cursor: listMeta(offers, limit) } });
      }

      case "offer.respond": {
        const offerId = uuid(payload.offer_id, "offer_id");
        const decision = pickEnum(payload.decision, "decision", ["accept", "reject", "counter"] as const);
        const offer = await queryOne<any>(
          sb.from("waouh_signed_offers").select("*").eq("id", offerId)
            .or(`buyer_id.eq.${ownerId},seller_id.eq.${ownerId}`).maybeSingle(),
          "offer_not_found",
        );
        if (offer.issuer_id === ownerId) throw new ApiError(409, "issuer_cannot_respond");
        if (offer.status !== "proposed") throw new ApiError(409, "offer_not_open");
        if (Date.parse(offer.expires_at) <= Date.now()) {
          await sb.from("waouh_signed_offers").update({ status: "expired", responded_at: new Date().toISOString() }).eq("id", offerId);
          throw new ApiError(409, "offer_expired");
        }
        const now = new Date().toISOString();
        const nextStatus = decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "countered";
        const { data: updated, error: updateError } = await sb.from("waouh_signed_offers")
          .update({ status: nextStatus, responded_at: now, response_note: optionalString(payload.note, "note", 1_000) })
          .eq("id", offerId).eq("status", "proposed").select("*").single();
        if (updateError) throw new ApiError(500, "offer_response_failed", updateError.message);
        let counterOffer = null;
        if (decision === "counter") {
          const counterAmount = positiveNumber(payload.counter_amount, "counter_amount")!;
          const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
          counterOffer = await queryOne<any>(
            sb.from("waouh_signed_offers").insert({
              mission_id: offer.mission_id,
              article_id: offer.article_id,
              seller_policy_id: offer.seller_policy_id,
              parent_offer_id: offer.id,
              issuer_id: ownerId,
              buyer_id: offer.buyer_id,
              seller_id: offer.seller_id,
              amount: counterAmount,
              currency: "XOF",
              quantity: offer.quantity,
              terms: offer.terms,
              expires_at: expiresAt,
            }).select("*").single(),
            "counter_offer_create_failed",
          );
        }
        await sb.from("waouh_offer_events").insert({
          offer_id: offer.id,
          buyer_id: offer.buyer_id,
          seller_id: offer.seller_id,
          actor_id: ownerId,
          event_type: decision === "accept" ? "accepted" : decision === "reject" ? "rejected" : "countered",
          payload: counterOffer ? { counter_offer_id: counterOffer.id, amount: counterOffer.amount } : {},
        });
        const otherParty = ownerId === offer.buyer_id ? offer.seller_id : offer.buyer_id;
        await audit(sb, ownerId, `offer.${nextStatus}`, "offer", offer.id, {}, offer.mission_id);
        await audit(sb, otherParty, `offer.${nextStatus}`, "offer", offer.id, {}, offer.mission_id, ownerId);
        await enqueue(sb, otherParty, `offer.${nextStatus}`, "offer", offer.id, { offer_id: offer.id, counter_offer_id: counterOffer?.id ?? null }, `offer.${nextStatus}:${offer.id}`, offer.mission_id);
        return jsonResponse({ ok: true, data: { offer: updated, counter_offer: counterOffer } });
      }

      case "media.create": {
        const bucket = asString(payload.storage_bucket, "storage_bucket", 2, 100);
        const path = asString(payload.storage_path, "storage_path", 3, 1_024);
        if (!(path.startsWith(`${ownerId}/`) || path.startsWith(`waouh/${ownerId}/`))) throw new ApiError(403, "invalid_storage_path_owner");
        const articleId = payload.article_id ? uuid(payload.article_id, "article_id") : null;
        const businessId = payload.business_id ? uuid(payload.business_id, "business_id") : null;
        const missionId = payload.mission_id ? uuid(payload.mission_id, "mission_id") : null;
        if (articleId) await ownedArticle(sb, ownerId, articleId);
        if (businessId) await ownedBusiness(sb, ownerId, businessId);
        if (missionId) await ownedMission(sb, ownerId, missionId);
        const sizeBytes = integer(payload.size_bytes, "size_bytes", 0, 0, 20 * 1024 * 1024);
        const media = await queryOne<any>(
          sb.from("waouh_media_assets").insert({
            owner_id: ownerId,
            mission_id: missionId,
            article_id: articleId,
            business_id: businessId,
            storage_bucket: bucket,
            storage_path: path,
            media_type: pickEnum(payload.media_type, "media_type", ["image", "video", "audio", "document"] as const),
            mime_type: asString(payload.mime_type, "mime_type", 3, 120),
            size_bytes: sizeBytes,
            sha256: optionalString(payload.sha256, "sha256", 128),
            alt_text: optionalString(payload.alt_text, "alt_text", 500),
            visibility: pickEnum(payload.visibility, "visibility", ["private", "catalog"] as const, "private"),
            metadata: jsonObject(payload.metadata, "metadata"),
          }).select("*").single(),
          "media_create_failed",
        );
        await audit(sb, ownerId, "media.registered", "media", media.id, { media_type: media.media_type }, missionId);
        return jsonResponse({ ok: true, data: { media } }, 201);
      }

      case "media.list": {
        const limit = integer(payload.limit, "limit", 50, 1, 100);
        let query = sb.from("waouh_media_assets").select("*").eq("owner_id", ownerId)
          .neq("status", "deleted").order("created_at", { ascending: false }).limit(limit);
        if (payload.article_id) query = query.eq("article_id", uuid(payload.article_id, "article_id"));
        if (payload.business_id) query = query.eq("business_id", uuid(payload.business_id, "business_id"));
        if (payload.mission_id) query = query.eq("mission_id", uuid(payload.mission_id, "mission_id"));
        const before = cursor(payload.cursor);
        if (before) query = query.lt("created_at", before);
        const { data, error } = await query;
        if (error) throw new ApiError(500, "media_list_failed", error.message);
        const media = data ?? [];
        return jsonResponse({ ok: true, data: { media, items: media, next_cursor: listMeta(media, limit) } });
      }

      case "domain.list": {
        const { data, error } = await sb.from("waouh_domain_policies")
          .select("domain,access_mode,agent_identity_required,allowed_actions,rate_limit_per_minute,last_reviewed_at")
          .eq("active", true).order("domain");
        if (error) throw new ApiError(500, "domain_policy_list_failed", error.message);
        const domains = data ?? [];
        return jsonResponse({ ok: true, data: { domains, items: domains, default_policy: "deny" } });
      }

      default:
        throw new ApiError(404, "unknown_action");
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status >= 500) console.error(`[waouh-agentic-core] ${error.code}`, error.message);
      return errorResponse(error.status, error.code, error.status >= 500 ? error.code : error.message);
    }
    console.error("[waouh-agentic-core] unexpected error", error);
    return errorResponse(500, "internal_error");
  }
});
