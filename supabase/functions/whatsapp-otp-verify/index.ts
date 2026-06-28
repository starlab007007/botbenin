// WhatsApp OTP verify — validates a short-lived code and opens a Supabase session.
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
    const body = await req.json().catch(() => ({}));
    const normalized = normalizePhone(body?.phone || "");
    const code = String(body?.code || body?.otp || "").replace(/\D/g, "");
    if (!/^229(?:\d{8}|01\d{8})$/.test(normalized)) return json({ ok: false, error: "invalid_phone" }, 400);
    if (!/^\d{6}$/.test(code)) return json({ ok: false, error: "code_required" }, 400);

    const codeHash = await hashCode(code, normalized);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows, error: lookupError } = await admin
      .from("whatsapp_otp_codes")
      .select("id,code_hash,expires_at,attempts,used")
      .eq("phone", normalized)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (lookupError) return json({ ok: false, error: "otp_storage_unavailable" }, 503);

    const row = rows?.[0];
    if (!row) return json({ ok: false, error: "no_code" }, 400);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await admin.from("whatsapp_otp_codes").update({ used: true }).eq("id", row.id);
      return json({ ok: false, error: "expired" }, 400);
    }
    if (Number(row.attempts || 0) >= 5) return json({ ok: false, error: "too_many_attempts" }, 429);

    if (row.code_hash !== codeHash) {
      await admin.from("whatsapp_otp_codes").update({ attempts: Number(row.attempts || 0) + 1 }).eq("id", row.id);
      return json({ ok: false, error: "invalid_code" }, 400);
    }
    await admin.from("whatsapp_otp_codes").update({ used: true }).eq("id", row.id);

    const email = `wa_${normalized}@waouhapp.local`;
    let userId: string | null = null;
    let isNewUser = false;
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return json({ ok: false, error: "account_lookup_failed" }, 503);
    const existing = usersData.users.find((item) => item.email === email || item.user_metadata?.whatsapp_phone === normalized);
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        phone: `+${normalized}`,
        user_metadata: { whatsapp_phone: normalized, auth_method: "whatsapp_otp" },
      });
      if (createError) return json({ ok: false, error: "account_creation_failed" }, 503);
      userId = created.user?.id ?? null;
      isNewUser = true;
    }
    if (!userId) return json({ ok: false, error: "account_creation_failed" }, 503);

    try {
      const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      if (!profile?.full_name || /^\+?\d+$/.test(String(profile.full_name).trim())) isNewUser = true;
    } catch (_) {}

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkError || !link.properties?.email_otp) return json({ ok: false, error: "session_creation_failed" }, 503);

    return json({
      ok: true,
      user_id: userId,
      email,
      is_new_user: isNewUser,
      email_otp: link.properties.email_otp,
    });
  } catch (error) {
    console.error("[whatsapp-otp-verify]", error);
    return json({ ok: false, error: "otp_verify_failed" }, 500);
  }
});
