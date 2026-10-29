import { centralWhatsAppHealth } from "./waouh-central-whatsapp.ts";
import {
  componentLabels,
  effectiveStatus,
  guidance,
  validateProbes,
} from "./waouh-guardian-policy.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,apikey,content-type,x-client-info,x-waouh-session",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Cache-Control": "no-store",
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
async function rpc(sb: any, name: string, args: Record<string, unknown> = {}) {
  const { data, error } = await sb.rpc(name, args);
  if (error) throw Error(name);
  return data;
}
export async function guardianActor(
  req: Request,
  sb: any,
): Promise<{ role: string; id?: string }> {
  const probe = req.headers.get("x-guardian-probe");
  if (probe) {
    return {
      role: await rpc(sb, "waouh_guardian_probe_actor", { p_token: probe }) ||
        "none",
    };
  }
  const bearer = (req.headers.get("authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (bearer && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return { role: "service" };
  }
  const internal = req.headers.get("x-waouh-internal");
  if (
    internal &&
    await rpc(sb, "waouh_verify_runtime_internal_token", {
        p_token: internal,
      }) === true
  ) return { role: "internal" };
  if (!bearer) return { role: "none" };
  const { data, error } = await sb.auth.getUser(bearer);
  if (error || !data?.user) return { role: "none" };
  const id = data.user.id;
  const admin =
    await rpc(sb, "has_role", { _user_id: id, _role_name: "admin" }) ||
    await rpc(sb, "has_role", { _user_id: id, _role_name: "super_admin" });
  return { role: admin ? "admin" : "user", id };
}
async function observe(
  sb: any,
  component: string,
  status: string,
  cause: string,
) {
  return rpc(sb, "waouh_guardian_observe", {
    p_report_id: crypto.randomUUID(),
    p_component: component,
    p_observer: "internal",
    p_status: status,
    p_cause: cause,
    p_observed_at: new Date().toISOString(),
  });
}
async function check(
  sb: any,
  component: string,
  task: () => Promise<{ status: string; cause: string }>,
) {
  try {
    const r = await task();
    await observe(sb, component, r.status, r.cause);
  } catch {
    await observe(sb, component, "down", "CHECK_UNAVAILABLE");
  }
}
const good = { status: "healthy", cause: "OK" },
  paused = { status: "paused", cause: "POLICY_PAUSED" };
async function tick(sb: any) {
  if (!await rpc(sb, "waouh_guardian_begin_tick")) {
    return { ok: true, skipped: true };
  }
  await rpc(sb, "waouh_guardian_housekeeping");
  const { data: modules, error } = await sb.from("waouh_frontend_modules")
    .select("module_key,access_enabled,automation_enabled");
  if (error) throw Error("policy");
  const enabled = (key: string, auto = false) =>
    modules?.some((m: any) =>
      m.module_key === key && m.access_enabled &&
      (!auto || m.automation_enabled)
    );
  await observe(sb, "database", "healthy", "OK");
  const base = Deno.env.get("SUPABASE_URL")! + "/functions/v1/",
    anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  await Promise.all([
    check(sb, "discovery", async () => {
      if (!enabled("nexus")) return paused;
      const r = await fetch(base + "waouh-studio-e2e-v21465", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: "Bearer " + anon,
        },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          action: "nexus.global_discovery",
          payload: {
            query: "Samsung",
            discovery_kind: "purchase",
            mode: "find_sellers",
            limit: 1,
            smart: false,
            refresh_external: false,
          },
        }),
      });
      const d = await r.json();
      if (
        !r.ok || d.ok !== true || !Array.isArray(d.data?.results) ||
        d.data?.public_read !== true
      ) throw Error("discovery");
      return good;
    }),
    check(sb, "users_access", async () => {
      const r = await fetch(base + "list-users-admin", {
        method: "OPTIONS",
        headers: {
          Origin: "https://bot.bj",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers":
            "authorization,apikey,x-waouh-session,content-type",
        },
        signal: AbortSignal.timeout(8000),
      });
      const allowed = (r.headers.get("access-control-allow-headers") || "")
        .toLowerCase().split(",").map((x) => x.trim());
      if (
        !r.ok ||
        !["authorization", "apikey", "x-waouh-session", "content-type"].every(
          (x) => allowed.includes(x),
        )
      ) throw Error("preflight");
      const auth = await sb.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (auth.error || !Array.isArray(auth.data?.users)) throw Error("users");
      return good;
    }),
    check(sb, "whatsapp", async () => {
      if (!enabled("whatsapp", true)) return paused;
      return (await centralWhatsAppHealth()).working
        ? good
        : { status: "down", cause: "CONNECTION_REQUIRED" };
    }),
    check(sb, "collectors", async () => {
      if (!enabled("radar", true)) return paused;
      const scheduled = await rpc(sb, "waouh_guardian_collectors_enabled"),
        types = ["site", "apify"].filter((t) => scheduled?.[t] === true);
      if (!types.length) return paused;
      const { data, error } = await sb.from("waouh_radar_sources").select(
        "last_scan_at,scan_freq_min,config",
      ).eq("active", true).in("type", types).limit(100);
      if (error) throw error;
      if (!data?.length) return paused;
      return data.some((s: any) =>
          s.config?.retry_after &&
            Date.parse(s.config.retry_after) > Date.now() ||
          !s.last_scan_at ||
          Date.now() - Date.parse(s.last_scan_at) >
            Math.max(720, Number(s.scan_freq_min) * 2) * 60000
        )
        ? { status: "degraded", cause: "SOURCE_DELAYED" }
        : good;
    }),
    (async () => {
      try {
        const m = await rpc(sb, "waouh_guardian_metrics");
        await observe(
          sb,
          "queues",
          !enabled("whatsapp", true)
            ? "paused"
            : m.queue_overdue >= 10
            ? "degraded"
            : "healthy",
          !enabled("whatsapp", true)
            ? "POLICY_PAUSED"
            : m.queue_overdue >= 10
            ? "DELIVERY_DELAYED"
            : "OK",
        );
        await observe(
          sb,
          "client_errors",
          m.affected_users >= 3 || m.client_errors >= 10
            ? "degraded"
            : "healthy",
          m.affected_users >= 3 || m.client_errors >= 10
            ? "CLIENT_ERRORS"
            : "OK",
        );
      } catch {
        await observe(sb, "queues", "unknown", "CHECK_UNAVAILABLE");
        await observe(sb, "client_errors", "unknown", "CHECK_UNAVAILABLE");
      }
    })(),
  ]);
  const { data: observers, error: observerError } = await sb.from(
    "waouh_guardian_components",
  ).select("*").in("component", ["host_monitor", "external_monitor"]);
  if (observerError) throw observerError;
  const stale = observers.length !== 2 ||
    observers.some((c: any) => effectiveStatus(c) !== "healthy");
  await observe(
    sb,
    "observer_health",
    stale ? "degraded" : "healthy",
    stale ? "OBSERVATION_STALE" : "OK",
  );
  await observe(sb, "internal_monitor", "healthy", "OK");
  return { ok: true };
}
export async function guardianHandle(
  req: Request,
  sb: any,
  body: Record<string, any>,
): Promise<Response | null> {
  if (typeof body.action !== "string" || !body.action.startsWith("guardian.")) {
    return null;
  }
  const actor = await guardianActor(req, sb), action = body.action.slice(9);
  if (action === "event" && actor.id) {
    if (
      !["web", "flutter"].includes(body.platform) ||
      !["render_error", "unhandled_error", "sale_error", "users_error"]
        .includes(body.code) ||
      !["home", "avatar", "mission", "sale", "users", "other"].includes(
        body.surface,
      )
    ) return json({ ok: false }, 400);
    return json({
      ok: true,
      accepted: await rpc(sb, "waouh_guardian_client_event", {
        p_user_id: actor.id,
        p_platform: body.platform,
        p_code: body.code,
        p_surface: body.surface,
      }),
    });
  }
  if (["host", "external"].includes(actor.role)) {
    if (action === "ping") {
      const { data, error } = await sb.from("waouh_guardian_components")
        .select("status,last_seen_at,fresh_for_seconds")
        .eq("component", "internal_monitor").eq("observer", "internal")
        .maybeSingle();
      // Reachable control is not proof that the internal scheduler is alive.
      return json({
        ok: true,
        monitoring_fresh: !error && data != null &&
          effectiveStatus(data) === "healthy",
      });
    }
    if (action === "ingest") {
      let probes;
      try {
        probes = validateProbes(body, actor.role as "host" | "external");
      } catch {
        return json({ ok: false }, 400);
      }
      for (const p of probes) {
        await rpc(sb, "waouh_guardian_observe", {
          p_report_id: body.report_id,
          p_component: p.component,
          p_observer: actor.role,
          p_status: p.status,
          p_cause: p.cause,
          p_observed_at: p.observed_at,
          p_latency_ms: p.latency_ms,
          p_details: p.details,
        });
      }
      return json({ ok: true });
    }
    if (
      actor.role === "host" && action === "claim" &&
      /^[0-9a-f-]{36}$/i.test(body.request_id || "")
    ) {
      return json(
        await rpc(sb, "waouh_guardian_claim_restart", {
          p_request_id: body.request_id,
        }),
      );
    }
    if (
      actor.role === "host" && action === "finish" &&
      /^[0-9a-f-]{36}$/i.test(body.action_id || "") &&
      ["succeeded", "failed", "not_executed"].includes(body.status) &&
      [
        "VERIFIED",
        "VERIFY_FAILED",
        "RESTART_FAILED",
        "CONDITIONS_CHANGED",
        "RESULT_MISSING",
      ].includes(body.reason)
    ) {
      return json(
        await rpc(sb, "waouh_guardian_finish_restart", {
          p_action_id: body.action_id,
          p_status: body.status,
          p_reason: body.reason,
        }),
      );
    }
    return json({ ok: false }, 403);
  }
  if (action === "tick" && ["service", "internal"].includes(actor.role)) {
    return json(await tick(sb));
  }
  if (action === "activate" && ["service", "internal"].includes(actor.role)) {
    return json({ ok: await rpc(sb, "waouh_guardian_activate") });
  }
  if (actor.role !== "admin") {
    return json({ ok: false, error: "Accès réservé à l’administration." }, 403);
  }
  if (action === "configure") {
    if (
      typeof body.auto_repair !== "boolean" ||
      ![null, 0, 30, 60, 240].includes(body.maintenance_minutes)
    ) return json({ ok: false }, 400);
    await rpc(sb, "waouh_guardian_configure", {
      p_actor_id: actor.id,
      p_auto_repair: body.auto_repair,
      p_maintenance_minutes: body.maintenance_minutes,
    });
    return json({ ok: true });
  }
  if (action === "snapshot") {
    const responses = await Promise.all([
      sb.from("waouh_guardian_settings").select(
        "auto_repair_enabled,alerts_enabled,activated_at,maintenance_until",
      ).single(),
      sb.from("waouh_guardian_components").select(
        "component,observer,status,last_seen_at,latency_ms,fresh_for_seconds",
      ),
      sb.from("waouh_guardian_incidents").select(
        "id,component,status,severity,detected_at,resolved_at,resolution_code",
      ).order("detected_at", { ascending: false }).limit(30),
      sb.from("waouh_guardian_actions").select(
        "id,incident_id,status,started_at,finished_at",
      ).order("started_at", { ascending: false }).limit(20),
    ]);
    if (responses.some((r) => r.error)) throw Error("snapshot");
    const [settings, components, incidents, actions] = responses.map((r) =>
      r.data
    );
    return json({
      ok: true,
      settings,
      components: components.map((c: any) => ({
        ...c,
        status: effectiveStatus(c),
        label: componentLabels[c.component] || "Service",
        guidance: guidance(c.component),
      })),
      incidents: incidents.map((i: any) => ({
        ...i,
        label: componentLabels[i.component] || "Service",
        guidance: guidance(i.component),
      })),
      actions,
      generated_at: new Date().toISOString(),
    });
  }
  return json({ ok: false }, 400);
}
