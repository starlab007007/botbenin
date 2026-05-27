// Vérifie pour chaque contact si son numéro est sur WhatsApp via WAHA.
// Double-essai : format "01XXXXXXXX" puis "XXXXXXXX" (sans le préfixe 01 mobile Bénin).
// Met à jour wa_contacts.is_whatsapp et phone_e164 avec le format qui fonctionne.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COUNTRY = "229"; // Bénin

function variants(raw: string): string[] {
  const digits = raw.replace(/[^\d]/g, "");
  // Strip country code if present
  let local = digits.startsWith(COUNTRY) ? digits.slice(COUNTRY.length) : digits;
  // local could be 8 (without 01) or 10 (with 01)
  const v: string[] = [];
  if (local.length === 10 && local.startsWith("01")) {
    v.push(`${COUNTRY}${local}`);       // avec 01
    v.push(`${COUNTRY}${local.slice(2)}`); // sans 01
  } else if (local.length === 8) {
    v.push(`${COUNTRY}01${local}`);     // avec 01
    v.push(`${COUNTRY}${local}`);       // sans 01
  } else {
    v.push(`${COUNTRY}${local}`);
  }
  return Array.from(new Set(v));
}

async function checkOne(base: string, session: string, apiKey: string, e164: string): Promise<boolean> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["X-Api-Key"] = apiKey;
  try {
    const res = await fetch(`${base}/api/contacts/check-exists?session=${encodeURIComponent(session)}&phone=${e164}`, {
      method: "GET", headers,
    });
    if (!res.ok) return false;
    const j = await res.json();
    return Boolean(j?.numberExists ?? j?.exists ?? false);
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: corsHeaders });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: u } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!u?.user) return new Response(JSON.stringify({ error: "invalid" }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const contactIds: string[] = Array.isArray(body.contactIds) ? body.contactIds : [];
    const sessionId: string | null = body.sessionId ?? null;
    if (!contactIds.length) return new Response(JSON.stringify({ error: "contactIds required" }), { status: 400, headers: corsHeaders });

    // Choisir une session WAHA "WORKING" (ou indiquée)
    let sessionRow: any = null;
    if (sessionId) {
      const { data } = await admin.from("whatsapp_accounts").select("session_name, status").eq("id", sessionId).maybeSingle();
      sessionRow = data;
    }
    if (!sessionRow) {
      const { data } = await admin.from("whatsapp_accounts")
        .select("session_name, status")
        .or(`user_id.eq.${u.user.id},is_admin_shared.eq.true`)
        .in("status", ["WORKING", "connected"])
        .limit(1).maybeSingle();
      sessionRow = data;
    }
    if (!sessionRow) {
      return new Response(JSON.stringify({ error: "no active WAHA session" }), { status: 400, headers: corsHeaders });
    }

    const base = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/+$/, "").replace(/\/dashboard$/, "");
    const apiKey = (Deno.env.get("WAHA_API_KEY_PLAIN") || Deno.env.get("WAHA_API_KEY") || "").trim();
    if (!base) return new Response(JSON.stringify({ error: "WAHA_BASE_URL not configured" }), { status: 500, headers: corsHeaders });

    const { data: contacts } = await admin.from("wa_contacts")
      .select("id, phone_e164").in("id", contactIds).eq("user_id", u.user.id);

    let onWa = 0, notOnWa = 0;
    for (const c of contacts ?? []) {
      const tries = variants(c.phone_e164);
      let found: string | null = null;
      for (const v of tries) {
        if (await checkOne(base, sessionRow.session_name, apiKey, v)) { found = v; break; }
      }
      await admin.from("wa_contacts").update({
        is_whatsapp: !!found,
        phone_e164: found ?? c.phone_e164,
        last_validated_at: new Date().toISOString(),
      }).eq("id", c.id);
      if (found) onWa++; else notOnWa++;
    }

    return new Response(JSON.stringify({ checked: (contacts ?? []).length, onWhatsApp: onWa, notOnWhatsApp: notOnWa }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: corsHeaders });
  }
});
