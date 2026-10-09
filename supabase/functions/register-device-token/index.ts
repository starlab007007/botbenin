// deno-lint-ignore-file no-explicit-any
// Appareils et notifications push (FCM HTTP v1).
//  - Utilisateur connecté : { fcm_token, platform } enregistre l'appareil ; { action: "unregister", fcm_token } le retire.
//  - Appel interne planifié (pg_cron) : { action: "tick" } pousse les nouvelles notifications.
// Sans le secret FCM_SERVICE_ACCOUNT_JSON, le tick marque simplement les notifications comme traitées (aucune erreur).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { isServiceCaller, isTickCaller } from "../_shared/waouh-internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUSH_MAX_AGE_MS = 10 * 60_000;

// ───────── FCM HTTP v1 ─────────
type ServiceAccount = { client_email: string; private_key: string; project_id: string; token_uri?: string };
let cachedToken: { value: string; exp: number } | null = null;

function loadServiceAccount(): ServiceAccount | null {
  return serviceAccountStatus().account;
}

/** Diagnostic sans fuite : indique seulement POURQUOI la clé n'est pas utilisable. */
function serviceAccountStatus(): { account: ServiceAccount | null; reason: string } {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON");
  if (!raw || !raw.trim()) return { account: null, reason: "secret_missing" };
  try {
    const sa = JSON.parse(raw.trim());
    const missing = ["client_email", "private_key", "project_id"].filter((k) => !sa?.[k]);
    if (missing.length) return { account: null, reason: `missing_fields:${missing.join(",")}` };
    return { account: sa, reason: "ready" };
  } catch {
    return { account: null, reason: "invalid_json" };
  }
}

const b64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cachedToken && cachedToken.exp - 60_000 > Date.now()) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const assertion = `${header}.${claims}.${b64url(sig)}`;
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.access_token) throw new Error(`fcm_auth_failed_${res.status}`);
  cachedToken = { value: body.access_token, exp: Date.now() + Number(body.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

/** Retourne "ok", "invalid" (jeton à supprimer) ou "error". */
async function sendFcm(sa: ServiceAccount, token: string, msg: { title: string; body: string; data: Record<string, string> }) {
  const bearer = await accessToken(sa);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: msg.title, body: msg.body },
        data: msg.data,
        android: { priority: "HIGH", notification: { channel_id: "waouh_default" } },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return "ok" as const;
  const err = await res.json().catch(() => ({}));
  const status = String(err?.error?.status || "");
  if (res.status === 404 || status === "NOT_FOUND" || status === "UNREGISTERED" || status === "INVALID_ARGUMENT") return "invalid" as const;
  console.warn("[push] fcm send failed", res.status, status);
  return "error" as const;
}

// ───────── Contenu ─────────
const TITLES: Record<string, string> = {
  negotiation_open: "Nouvelle offre",
  match: "Nouvelle correspondance",
  new_buyer: "Nouvel acheteur intéressé",
  sale_published: "Annonce publiée",
};

const plain = (s: string) =>
  s.replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();

function safeRoute(raw: unknown): string | null {
  const v = String(raw ?? "").trim();
  return v.startsWith("/app/") && !v.startsWith("//") ? v : null;
}

function pushContent(n: any) {
  const p = n.payload || {};
  const smart = p.smart && typeof p.smart === "object" ? p.smart : {};
  const title = plain(String(smart.title || TITLES[n.notification_type] || "WAOUH")).slice(0, 60);
  const bodyRaw = String(smart.detail || smart.summary || p.text || "").trim();
  const body = plain(bodyRaw).slice(0, 140) || "Ouvrez WAOUH pour voir le détail.";
  const route = safeRoute(p.target_route) || safeRoute(smart.route) ||
    (n.conversation_id ? `/app/chat/${n.conversation_id}` : "/app/notifications");
  return { title, body, route };
}

async function countTokens(admin: any): Promise<number> {
  const { count } = await admin.from("device_tokens").select("id", { count: "exact", head: true });
  return count ?? 0;
}

// ───────── Tick ─────────
async function runTick(admin: any, limit: number) {
  const since = new Date(Date.now() - PUSH_MAX_AGE_MS).toISOString();

  // Les notifications trop anciennes ne sont jamais poussées (reprise après une panne, par exemple).
  await admin.from("waouh_notifications").update({ push_sent_at: new Date().toISOString() })
    .is("push_sent_at", null).lt("sent_at", since);

  const { data: pending, error } = await admin.from("waouh_notifications")
    .select("id,user_id,notification_type,payload,conversation_id,sent_at,read_at,channel")
    .is("push_sent_at", null).gte("sent_at", since).order("sent_at", { ascending: true }).limit(limit);
  if (error) throw error;
  if (!pending?.length) return { processed: 0, sent: 0 };

  // Réservation atomique : un tick concurrent ne renvoie pas les mêmes lignes.
  const ids = pending.map((n: any) => n.id);
  const { data: claimed } = await admin.from("waouh_notifications")
    .update({ push_sent_at: new Date().toISOString() }).in("id", ids).is("push_sent_at", null).select("id");
  const claimedIds = new Set((claimed || []).map((r: any) => r.id));
  const rows = pending.filter((n: any) => claimedIds.has(n.id) && !n.read_at);

  const sa = loadServiceAccount();
  if (!sa || !rows.length) return { processed: claimedIds.size, sent: 0, fcm: sa ? "ready" : "not_configured", fcm_reason: serviceAccountStatus().reason, tokens: await countTokens(admin) };

  const waouhIds = [...new Set(rows.map((n: any) => n.user_id).filter(Boolean))];
  const { data: users } = await admin.from("waouh_users").select("id,auth_user_id").in("id", waouhIds);
  const authOf = new Map<string, string>((users || []).filter((u: any) => u.auth_user_id).map((u: any) => [u.id, u.auth_user_id]));
  const authIds = [...new Set(authOf.values())];
  if (!authIds.length) return { processed: claimedIds.size, sent: 0 };
  const { data: tokens } = await admin.from("device_tokens").select("user_id,fcm_token").in("user_id", authIds);
  const tokensByAuth = new Map<string, string[]>();
  for (const t of tokens || []) {
    const list = tokensByAuth.get(t.user_id) || [];
    list.push(t.fcm_token);
    tokensByAuth.set(t.user_id, list);
  }

  let sent = 0;
  for (const n of rows) {
    const authId = authOf.get(n.user_id);
    const list = authId ? tokensByAuth.get(authId) || [] : [];
    if (!list.length) continue;
    const c = pushContent(n);
    const data = { route: c.route, notification_id: String(n.id), type: String(n.notification_type || "") };
    for (const token of list) {
      try {
        const r = await sendFcm(sa, token, { title: c.title, body: c.body, data });
        if (r === "ok") sent++;
        else if (r === "invalid") await admin.from("device_tokens").delete().eq("user_id", authId).eq("fcm_token", token);
      } catch (e) {
        console.warn("[push] send error", String((e as Error)?.message || e));
      }
    }
  }
  return { processed: claimedIds.size, sent };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body: any = await req.json().catch(() => ({}));
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Contrôle de la clé FCM sans envoyer de notification : obtient un jeton OAuth puis fait une validation
    // à blanc (validate_only) vers un jeton factice. 400/404 sur le jeton = clé acceptée par Google.
    if (body?.action === "fcm_check") {
      if (!isServiceCaller(req, SERVICE_ROLE) && !(await isTickCaller(req, admin))) {
        return json({ ok: false, code: "service_role_required" }, 401);
      }
      const st = serviceAccountStatus();
      if (!st.account) return json({ ok: true, fcm: "not_configured", reason: st.reason });
      try {
        const bearer = await accessToken(st.account);
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${st.account.project_id}/messages:send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
          body: JSON.stringify({ validate_only: true, message: { token: "waouh-fcm-check-invalid-token", notification: { title: "check", body: "check" } } }),
          signal: AbortSignal.timeout(10_000),
        });
        const err = await res.json().catch(() => ({}));
        return json({ ok: true, fcm: "oauth_ok", project_id: st.account.project_id, fcm_http: res.status, fcm_status: err?.error?.status ?? null, fcm_message: String(err?.error?.message ?? "").slice(0, 160) });
      } catch (e) {
        return json({ ok: true, fcm: "oauth_failed", reason: String((e as Error)?.message || e).slice(0, 120) });
      }
    }

    if (body?.action === "tick") {
      if (!isServiceCaller(req, SERVICE_ROLE) && !(await isTickCaller(req, admin))) {
        return json({ ok: false, code: "service_role_required" }, 401);
      }
      const limit = Math.min(100, Math.max(1, Number(body?.limit) || 50));
      return json({ ok: true, ...(await runTick(admin, limit)) });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { fcm_token, platform } = body;
    if (body?.action === "unregister") {
      if (!fcm_token) return json({ error: "fcm_token required" }, 400);
      await admin.from("device_tokens").delete().eq("user_id", user.id).eq("fcm_token", fcm_token);
      return json({ ok: true });
    }
    if (!fcm_token || !platform) return json({ error: "fcm_token and platform required" }, 400);

    // Un appareil n'appartient qu'à un compte : le jeton est retiré des autres comptes (changement d'utilisateur).
    await admin.from("device_tokens").delete().eq("fcm_token", fcm_token).neq("user_id", user.id);
    const { error } = await admin
      .from("device_tokens")
      .upsert({ user_id: user.id, fcm_token, platform, updated_at: new Date().toISOString() }, { onConflict: "user_id,fcm_token" });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
