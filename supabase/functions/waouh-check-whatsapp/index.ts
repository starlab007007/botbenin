// Vérifie si un numéro unique est enregistré sur WhatsApp via WAHA (utilise n'importe quelle session active).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

const ACTIVE = new Set(["WORKING", "connected"]);

function headerVariants(): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const plain = Deno.env.get("WAHA_API_KEY_PLAIN")?.trim();
  const raw = Deno.env.get("WAHA_API_KEY")?.trim();
  const key = plain || (raw && !raw.startsWith("sha512:") ? raw : "");
  if (key) {
    out.push({ "X-Api-Key": key }, { Authorization: `Bearer ${key}` });
  }
  const u = Deno.env.get("WAHA_DASHBOARD_USERNAME"), p = Deno.env.get("WAHA_DASHBOARD_PASSWORD");
  if (u && p) out.push({ Authorization: `Basic ${btoa(`${u}:${p}`)}` });
  if (!out.length) out.push({});
  return out;
}

async function wahaFetch(base: string, path: string) {
  for (const h of headerVariants()) {
    try {
      const r = await fetch(`${base}${path}`, { headers: { "Content-Type": "application/json", ...h } });
      if (r.ok || (r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 403)) return r;
    } catch (_) { /* try next */ }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const j = (b: any, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const { phone } = await req.json();
    if (!phone) return j({ ok: false, error: "phone requis" }, 400);
    const digits = String(phone).replace(/[^\d]/g, "");
    if (digits.length < 8) return j({ ok: false, error: "Numéro trop court" }, 400);

    const base = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/+$/, "").replace(/\/dashboard$/, "");
    if (!base) return j({ ok: false, error: "WhatsApp non configuré côté serveur", code: "WAHA_NOT_CONFIGURED" });

    // Find any active WAHA session
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: accounts } = await admin.from("whatsapp_accounts").select("session_name, status").order("last_activity", { ascending: false }).limit(10);
    let session: string | null = null;
    for (const a of accounts ?? []) {
      if (ACTIVE.has(a.status as any)) { session = a.session_name; break; }
      // Live-check
      const r = await wahaFetch(base, `/api/sessions/${encodeURIComponent(a.session_name)}`);
      if (r?.ok) {
        const d = await r.json();
        if (ACTIVE.has(d?.status ?? d?.state)) { session = a.session_name; break; }
      }
    }
    if (!session) return j({ ok: false, error: "Aucune session WhatsApp active", code: "NO_ACTIVE_SESSION" });

    const res = await wahaFetch(base, `/api/contacts/check-exists?session=${encodeURIComponent(session)}&phone=${encodeURIComponent(digits)}`);
    if (!res) return j({ ok: false, error: "WAHA ne répond pas" });
    if (!res.ok) return j({ ok: false, error: `WAHA HTTP ${res.status}` });
    const body = await res.json();
    const exists = Boolean(body?.numberExists ?? body?.exists ?? body?.phoneExists ?? false);
    return j({ ok: true, isWhatsApp: exists, phone: digits });
  } catch (e: any) {
    return j({ ok: false, error: e.message }, 400);
  }
});
