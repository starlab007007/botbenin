// WhatsApp OTP — generate a 6-digit code, persist only its hash, then deliver through WAHA.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizePhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("229")) return digits;
  if (digits.length === 8) return `229${digits}`;
  if (digits.length === 10 && digits.startsWith("01")) return `229${digits}`;
  return digits;
}

async function hashCode(code: string, phone: string) {
  const enc = new TextEncoder().encode(`${phone}:${code}:waouh`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone } = await req.json().catch(() => ({}));
    if (!phone || typeof phone !== "string") return json({ ok: false, error: "phone_required" }, 400);

    const normalized = normalizePhone(phone);
    if (!/^229(?:\d{8}|01\d{8})$/.test(normalized)) {
      return json({ ok: false, error: "invalid_phone" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: sendsLastHour, error: rateError } = await admin
      .from("whatsapp_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", normalized)
      .gte("created_at", oneHourAgo);
    if (rateError) return json({ ok: false, error: "otp_storage_unavailable" }, 503);
    if ((sendsLastHour ?? 0) >= 3) {
      return json({ ok: false, error: "rate_limited" }, 429);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await hashCode(code, normalized);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await admin.from("whatsapp_otp_codes").update({ used: true }).eq("phone", normalized).eq("used", false);
    const { data: created, error: insertError } = await admin
      .from("whatsapp_otp_codes")
      .insert({ phone: normalized, code_hash: codeHash, expires_at: expiresAt, attempts: 0, used: false })
      .select("id")
      .single();
    if (insertError || !created?.id) return json({ ok: false, error: "otp_storage_unavailable" }, 503);

    const session = Deno.env.get("WAHA_DEFAULT_SESSION") || "WaouhApp";
    const base = (Deno.env.get("WAHA_BASE_URL") || "").replace(/\/$/, "").replace(/\/dashboard$/, "");
    const apiKey = (Deno.env.get("WAHA_API_KEY_PLAIN") || Deno.env.get("WAHA_API_KEY") || "").trim();
    const dashboardUser = Deno.env.get("WAHA_DASHBOARD_USERNAME");
    const dashboardPassword = Deno.env.get("WAHA_DASHBOARD_PASSWORD");

    if (!base) {
      await admin.from("whatsapp_otp_codes").update({ used: true }).eq("id", created.id);
      return json({ ok: false, error: "otp_delivery_unavailable" }, 503);
    }

    const candidates: Record<string, string>[] = [];
    if (apiKey) {
      candidates.push(
        { "Content-Type": "application/json", "X-Api-Key": apiKey },
        { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      );
    }
    if (dashboardUser && dashboardPassword) {
      candidates.push({ "Content-Type": "application/json", "Authorization": `Basic ${btoa(`${dashboardUser}:${dashboardPassword}`)}` });
    }
    if (candidates.length === 0) candidates.push({ "Content-Type": "application/json" });

    const payload = JSON.stringify({
      session,
      chatId: `${normalized}@c.us`,
      text: `Votre code WaouhApp : *${code}*\nIl expire dans 5 minutes.\nNe le partagez avec personne.`,
    });

    let delivered = false;
    let lastError = "";
    for (const headers of candidates) {
      try {
        const response = await fetch(`${base}/api/sendText`, { method: "POST", headers, body: payload });
        if (response.ok) {
          delivered = true;
          break;
        }
        lastError = `${response.status} ${await response.text()}`;
        if (response.status !== 401 && response.status !== 403) break;
      } catch (error) {
        lastError = String(error);
      }
    }

    if (!delivered) {
      console.error("[whatsapp-otp-send] WAHA delivery failed", lastError);
      await admin.from("whatsapp_otp_codes").update({ used: true }).eq("id", created.id);
      return json({ ok: false, error: "otp_delivery_failed" }, 503);
    }

    return json({ ok: true, expires_in_seconds: 300 });
  } catch (error) {
    console.error("[whatsapp-otp-send]", error);
    return json({ ok: false, error: "otp_send_failed" }, 500);
  }
});
