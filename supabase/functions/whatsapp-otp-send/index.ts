// WhatsApp OTP — generate 6-digit code, hash & store, send via waha-send-message
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizePhone(p: string) {
  return p.replace(/[^\d+]/g, "");
}

async function hashCode(code: string, phone: string) {
  const enc = new TextEncoder().encode(`${phone}:${code}:waouh`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") return json({ error: "phone required" }, 400);
    const normalized = normalizePhone(phone);
    if (normalized.length < 8) return json({ error: "invalid phone" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const code_hash = await hashCode(code, normalized);
    const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate previous codes
    await admin.from("whatsapp_otp_codes").update({ used: true }).eq("phone", normalized).eq("used", false);

    const { error: insErr } = await admin.from("whatsapp_otp_codes").insert({ phone: normalized, code_hash, expires_at });
    if (insErr) return json({ error: insErr.message }, 500);

    // Send via WAHA directly (no user auth required for OTP)
    const sessionName = Deno.env.get("WAHA_DEFAULT_SESSION") || "WaouhApp";
    let wahaBaseUrl = Deno.env.get("WAHA_BASE_URL") || "";
    wahaBaseUrl = wahaBaseUrl.replace(/\/$/, "").replace(/\/dashboard$/, "");
    const wahaApiKey = (Deno.env.get("WAHA_API_KEY_PLAIN") || Deno.env.get("WAHA_API_KEY") || "").trim();
    const wahaDashUser = Deno.env.get("WAHA_DASHBOARD_USERNAME");
    const wahaDashPass = Deno.env.get("WAHA_DASHBOARD_PASSWORD");

    if (!wahaBaseUrl) {
      console.error("WAHA_BASE_URL not configured");
      return json({ ok: true, dev_code: code, warn: "waha_not_configured" });
    }

    const headerVariants: Record<string, string>[] = [];
    if (wahaApiKey) {
      headerVariants.push(
        { "Content-Type": "application/json", "X-Api-Key": wahaApiKey },
        { "Content-Type": "application/json", "Authorization": `Bearer ${wahaApiKey}` },
      );
    }
    if (wahaDashUser && wahaDashPass) {
      headerVariants.push({ "Content-Type": "application/json", "Authorization": `Basic ${btoa(`${wahaDashUser}:${wahaDashPass}`)}` });
    }
    if (headerVariants.length === 0) headerVariants.push({ "Content-Type": "application/json" });

    const chatId = `${normalized.replace(/^\+/, "")}@c.us`;
    const payload = JSON.stringify({
      session: sessionName,
      chatId,
      text: `Votre code WaouhApp : *${code}*\nIl expire dans 5 minutes.\nNe le partagez avec personne.`,
    });

    let lastErr = "";
    let sent = false;
    for (const headers of headerVariants) {
      try {
        const res = await fetch(`${wahaBaseUrl}/api/sendText`, { method: "POST", headers, body: payload });
        if (res.ok) { sent = true; break; }
        lastErr = `${res.status} ${await res.text()}`;
        if (res.status !== 401 && res.status !== 403) break;
      } catch (e) {
        lastErr = String((e as Error).message);
      }
    }

    if (!sent) {
      console.error("WAHA sendText failed:", lastErr);
      return json({ ok: true, dev_code: code, warn: "send_failed", detail: lastErr });
    }

    return json({ ok: true, dev_code: Deno.env.get("OTP_DEV_MODE") === "1" ? code : undefined });
  } catch (e) {
    console.error("otp-send", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});
