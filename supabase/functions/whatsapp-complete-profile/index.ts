// Complete profile for WhatsApp-authenticated users (parity with email signup)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "missing_token" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "invalid_token" }, 401);
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const full_name = String(body.full_name ?? "").trim();
    const emailRaw = body.email ? String(body.email).trim().toLowerCase() : "";

    if (full_name.length < 2 || full_name.length > 100) return json({ error: "invalid_name" }, 400);
    if (emailRaw && !EMAIL_RE.test(emailRaw)) return json({ error: "invalid_email" }, 400);

    const admin = createClient(url, service);

    // If email provided & different from current, ensure unique then update auth user
    if (emailRaw && emailRaw !== user.email) {
      const { data: list } = await admin.auth.admin.listUsers();
      const taken = list?.users?.some((u) => u.id !== user.id && (u.email ?? "").toLowerCase() === emailRaw);
      if (taken) return json({ error: "email_taken" }, 409);
      const { error: upErr } = await admin.auth.admin.updateUserById(user.id, { email: emailRaw, email_confirm: true });
      if (upErr) return json({ error: upErr.message }, 500);
    }

    const phone = user.user_metadata?.whatsapp_phone ?? user.phone ?? null;
    const profilePatch: Record<string, unknown> = {
      id: user.id,
      full_name,
      provider: "whatsapp",
      phone: phone ? (String(phone).startsWith("+") ? phone : `+${phone}`) : null,
      email: emailRaw || user.email || null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await admin.from("profiles").upsert(profilePatch, { onConflict: "id" });
    if (upsertErr) return json({ error: upsertErr.message }, 500);

    return json({ ok: true, profile: profilePatch });
  } catch (e) {
    console.error("complete-profile", e);
    return json({ error: String((e as Error).message) }, 500);
  }
});
