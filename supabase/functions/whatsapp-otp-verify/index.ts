// WhatsApp OTP verify — checks code, creates/login user, returns magic link / session
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizePhone(p: string) { return p.replace(/[^\d+]/g, ""); }
async function hashCode(code: string, phone: string) {
  const enc = new TextEncoder().encode(`${phone}:${code}:waouh`);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { phone, code } = await req.json();
    if (!phone || !code) return json({ error: "phone and code required" }, 400);
    const normalized = normalizePhone(phone);
    const code_hash = await hashCode(String(code), normalized);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows, error } = await admin
      .from("whatsapp_otp_codes")
      .select("*")
      .eq("phone", normalized)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) return json({ error: error.message }, 500);
    const row = rows?.[0];
    if (!row) return json({ error: "no_code" }, 400);
    if (new Date(row.expires_at).getTime() < Date.now()) return json({ error: "expired" }, 400);
    if (row.attempts >= 5) return json({ error: "too_many_attempts" }, 400);

    if (row.code_hash !== code_hash) {
      await admin.from("whatsapp_otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return json({ error: "invalid_code" }, 400);
    }
    await admin.from("whatsapp_otp_codes").update({ used: true }).eq("id", row.id);

    // Create or get user — use deterministic email
    const fakeEmail = `wa_${normalized.replace(/[^\d]/g, "")}@waouhapp.local`;
    let userId: string | null = null;
    let isNewUser = false;
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === fakeEmail || u.user_metadata?.whatsapp_phone === normalized);
    if (found) {
      userId = found.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: fakeEmail,
        email_confirm: true,
        phone: normalized,
        user_metadata: { whatsapp_phone: normalized, auth_method: "whatsapp_otp" },
      });
      if (createErr) return json({ error: createErr.message }, 500);
      userId = created.user?.id ?? null;
      isNewUser = true;
    }
    if (!userId) return json({ error: "user_creation_failed" }, 500);

    // Detect profile completeness — if a profile already exists with full_name set, treat as existing
    try {
      const { data: prof } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
      if (!prof || !prof.full_name || /^\+?\d+$/.test(String(prof.full_name).trim())) {
        isNewUser = true;
      }
    } catch (_) { /* non-blocking */ }

    // Generate magic link for session
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: fakeEmail,
    });
    if (linkErr) return json({ error: linkErr.message }, 500);

    return json({
      ok: true,
      user_id: userId,
      email: fakeEmail,
      action_link: link.properties?.action_link,
      hashed_token: link.properties?.hashed_token,
      email_otp: link.properties?.email_otp,
    });
  } catch (e) {
    console.error("otp-verify", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});
