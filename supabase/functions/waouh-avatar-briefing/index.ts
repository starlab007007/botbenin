// deno-lint-ignore-file no-explicit-any
// WAOUH — Avatar guide (point d'entrée). Actions utilisateur (jeton requis) : get_prefs, set_prefs, open, now.
// Action service (clé service) : tick — points réguliers planifiés.
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { getRequestUser, jsonResponse, waouhCorsHeaders } from "../_shared/waouh-auth.ts";
import { isServiceCaller, isTickCaller } from "../_shared/waouh-internal-auth.ts";
import { deliverBriefing, loadMissionBoard, loadPrefs, runAvatarBriefingTick, savePrefs } from "../_shared/waouh-avatar-briefing-core.ts";
import { nextBriefingAt } from "../_shared/waouh-avatar-briefing.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_RE = /^[A-Za-z0-9_.:-]{6,200}$/;

const publicPrefs = (p: Awaited<ReturnType<typeof loadPrefs>>, now: Date) => ({
  welcome: p.welcome, cadence: p.cadence, quiet_start: p.quietStart, quiet_end: p.quietEnd, notify_events: p.notifyEvents, notify_digest: p.notifyDigest,
  last_briefing_at: p.lastBriefingAt?.toISOString() ?? null, next_briefing_at: nextBriefingAt(p, p.lastBriefingAt, now)?.toISOString() ?? null,
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: waouhCorsHeaders });
  if (req.method !== "POST") return jsonResponse({ ok: false, code: "method_not_allowed" }, 405);
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "tick") {
      if (!isServiceCaller(req, SERVICE_ROLE) && !(await isTickCaller(req, sb))) return jsonResponse({ ok: false, code: "service_role_required" }, 401);
      const result = await runAvatarBriefingTick(sb, { limit: Math.min(200, Math.max(1, Number(body?.limit) || 100)) });
      return jsonResponse({ ok: true, ...result });
    }

    // Identité issue du JWT uniquement (jamais d'un identifiant du corps).
    const user = await getRequestUser(req);
    if (!user?.id) return jsonResponse({ ok: false, code: "auth_required" }, 401);
    const now = new Date();

    if (action === "get_prefs") return jsonResponse({ ok: true, prefs: publicPrefs(await loadPrefs(sb, user.id), now) });
    if (action === "status") {
      const r = await loadMissionBoard(sb, user.id, now);
      return jsonResponse({ ok: true, board: r?.board ?? null, prefs: publicPrefs(await loadPrefs(sb, user.id), now) });
    }
    if (action === "set_prefs") {
      const prefs = await savePrefs(sb, user.id, body?.prefs);
      return jsonResponse({ ok: true, prefs: publicPrefs(prefs, now) });
    }
    if (action === "open" || action === "now") {
      const sid = typeof body?.session_id === "string" && SESSION_RE.test(body.session_id) ? body.session_id : null;
      const r = await deliverBriefing(sb, { authUserId: user.id, trigger: action === "open" ? "open" : "manual", now, webSessionId: sid });
      return jsonResponse({
        ok: true, sent: r.sent, reason: r.reason, briefing: r.briefing, message: r.message, messages: r.messages,
        prefs: publicPrefs(r.prefs, now), next_briefing_at: r.nextBriefingAt,
      });
    }
    return jsonResponse({ ok: false, code: "unknown_action" }, 400);
  } catch (error) {
    console.error("[waouh-avatar-briefing]", error);
    return jsonResponse({ ok: false, code: "technical_error" }, 500);
  }
});
