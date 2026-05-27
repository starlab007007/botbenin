import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COUNTRY = "229";
const ACTIVE_STATUSES = new Set(["WORKING", "connected"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function variants(raw: string): string[] {
  const digits = raw.replace(/[^\d]/g, "");
  const local = digits.startsWith(COUNTRY) ? digits.slice(COUNTRY.length) : digits;
  const v: string[] = [];
  if (local.length === 10 && local.startsWith("01")) {
    v.push(`${COUNTRY}${local}`);
    v.push(`${COUNTRY}${local.slice(2)}`);
  } else if (local.length === 8) {
    v.push(`${COUNTRY}01${local}`);
    v.push(`${COUNTRY}${local}`);
  } else {
    v.push(`${COUNTRY}${local}`);
  }
  return Array.from(new Set(v));
}

function buildWahaHeaderVariants(extra: Record<string, string> = {}) {
  const variants: Record<string, string>[] = [];
  const plain = Deno.env.get("WAHA_API_KEY_PLAIN")?.trim();
  const rawKey = Deno.env.get("WAHA_API_KEY")?.trim();
  const key = plain || (rawKey && !rawKey.startsWith("sha512:") ? rawKey : "");

  if (key) {
    variants.push(
      { "Content-Type": "application/json", "X-Api-Key": key, ...extra },
      { "Content-Type": "application/json", "X-API-Key": key, ...extra },
      { "Content-Type": "application/json", "x-api-key": key, ...extra },
      { "Content-Type": "application/json", Authorization: `ApiKey ${key}`, ...extra },
      { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...extra },
    );
  }

  const user = Deno.env.get("WAHA_DASHBOARD_USERNAME");
  const pass = Deno.env.get("WAHA_DASHBOARD_PASSWORD");
  if (user && pass) {
    variants.push({ "Content-Type": "application/json", Authorization: `Basic ${btoa(`${user}:${pass}`)}`, ...extra });
  }

  if (variants.length === 0) variants.push({ "Content-Type": "application/json", ...extra });
  return variants;
}

async function wahaFetch(base: string, endpoint: string, init: RequestInit = {}) {
  let last: Response | null = null;
  for (const headers of buildWahaHeaderVariants(init.headers as Record<string, string> | undefined)) {
    try {
      const res = await fetch(`${base}${endpoint}`, { ...init, headers });
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 403)) return res;
      last = res;
    } catch (e) {
      if (!last) throw e;
    }
  }
  return last;
}

async function checkOne(base: string, session: string, e164: string): Promise<boolean> {
  const endpoint = `/api/contacts/check-exists?session=${encodeURIComponent(session)}&phone=${encodeURIComponent(e164)}`;
  const res = await wahaFetch(base, endpoint, { method: "GET" });
  if (!res) throw new Error("WAHA ne répond pas");

  const text = await res.text();
  if (res.status === 401 || res.status === 403) throw new Error("WAHA refuse la vérification: clé API ou identifiants invalides");
  if (res.status === 404) throw new Error("Endpoint WAHA de vérification introuvable (/api/contacts/check-exists)");
  if (res.status >= 500) throw new Error(`WAHA indisponible (${res.status})`);
  if (!res.ok) return false;

  const j = JSON.parse(text || "{}");
  return Boolean(j?.numberExists ?? j?.exists ?? j?.phoneExists ?? false);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("authorization");
    if (!auth) return json({ ok: false, error: "Utilisateur non authentifié" }, 401);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return json({ ok: false, error: "Session utilisateur invalide" }, 401);

    const body = await req.json().catch(() => ({}));
    const contactIds: string[] = Array.isArray(body.contactIds) ? body.contactIds.slice(0, 500) : [];
    const sessionId: string | null = body.sessionId ?? null;
    if (!contactIds.length) return json({ ok: false, error: "Aucun contact sélectionné", checked: 0, onWhatsApp: 0, notOnWhatsApp: 0 });

    let sessionRow: any = null;
    if (sessionId) {
      const { data } = await admin
        .from("whatsapp_accounts")
        .select("id, user_id, is_admin_shared, session_name, status")
        .eq("id", sessionId)
        .maybeSingle();
      if (data && (data.user_id === u.user.id || data.is_admin_shared)) sessionRow = data;
    }

    if (!sessionRow) {
      const { data } = await admin
        .from("whatsapp_accounts")
        .select("id, session_name, status")
        .or(`user_id.eq.${u.user.id},is_admin_shared.eq.true`)
        .in("status", [...ACTIVE_STATUSES])
        .limit(1)
        .maybeSingle();
      sessionRow = data;
    }

    if (!sessionRow) {
      return json({
        ok: false,
        code: "NO_ACTIVE_SESSION",
        error: "Aucune session WhatsApp connectée. Ouvrez l’onglet Sessions et scannez le QR avant de vérifier les numéros.",
        checked: 0,
        onWhatsApp: 0,
        notOnWhatsApp: 0,
      });
    }

    if (!ACTIVE_STATUSES.has(sessionRow.status)) {
      return json({
        ok: false,
        code: "SESSION_DISCONNECTED",
        error: `La session ${sessionRow.session_name} est ${sessionRow.status}. Reconnectez-la avant la vérification WhatsApp.`,
        checked: 0,
        onWhatsApp: 0,
        notOnWhatsApp: 0,
      });
    }

    const base = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/+$/, "").replace(/\/dashboard$/, "");
    if (!base) {
      return json({ ok: false, code: "WAHA_NOT_CONFIGURED", error: "WAHA_BASE_URL n’est pas configuré", checked: 0, onWhatsApp: 0, notOnWhatsApp: 0 });
    }

    const { data: contacts, error: contactsError } = await admin
      .from("wa_contacts")
      .select("id, phone_e164")
      .in("id", contactIds)
      .eq("user_id", u.user.id);

    if (contactsError) throw contactsError;

    let onWa = 0;
    let notOnWa = 0;
    const details: Array<{ id: string; phone: string; isWhatsApp: boolean; matchedPhone: string | null }> = [];

    for (const c of contacts ?? []) {
      const tries = variants(c.phone_e164);
      let found: string | null = null;
      for (const v of tries) {
        if (await checkOne(base, sessionRow.session_name, v)) {
          found = v;
          break;
        }
      }

      await admin
        .from("wa_contacts")
        .update({ is_whatsapp: !!found, phone_e164: found ?? c.phone_e164, last_validated_at: new Date().toISOString() })
        .eq("id", c.id);

      if (found) onWa++; else notOnWa++;
      details.push({ id: c.id, phone: c.phone_e164, isWhatsApp: !!found, matchedPhone: found });
    }

    return json({ ok: true, checked: (contacts ?? []).length, onWhatsApp: onWa, notOnWhatsApp: notOnWa, details });
  } catch (e: any) {
    console.error("whatsapp-check-numbers failed", e);
    return json({
      ok: false,
      code: "CHECK_FAILED",
      error: e?.message ?? "Erreur inconnue pendant la vérification WhatsApp",
      checked: 0,
      onWhatsApp: 0,
      notOnWhatsApp: 0,
      fallback: true,
    });
  }
});
