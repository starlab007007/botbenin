// WhatsApp OTP — generate 6-digit code, hash & store, send via waha-send-message
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Send via WAHA
    const sessionName = Deno.env.get("WAHA_DEFAULT_SESSION") || "default";
    const { data: sendData, error: sendErr } = await admin.functions.invoke("waha-send-message", {
      body: {
        sessionName,
        to: normalized.replace(/^\+/, ""),
        message: `Votre code WaouhApp : *${code}*\nIl expire dans 5 minutes.\nNe le partagez avec personne.`,
      },
    });
    if (sendErr) {
      console.error("waha-send-message error", sendErr);
      // Still return ok so dev can retrieve via logs in dev mode
      return json({ ok: true, dev_code: Deno.env.get("OTP_DEV_MODE") === "1" ? code : undefined });
    }
    return json({ ok: true, dev_code: Deno.env.get("OTP_DEV_MODE") === "1" ? code : undefined, send: sendData });
  } catch (e) {
    console.error("otp-send", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});
