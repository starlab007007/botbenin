import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-waouh-session",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PROJECT_REF = Deno.env.get("SUPABASE_PROJECT_REF") || "mvynepqulhflxtyymtzs";
const MANAGEMENT_TOKEN = Deno.env.get("SUPABASE_ACCESS_TOKEN") || "";
const DEFAULT_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.1-flash-lite";

async function requireAdmin(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const token = authorization.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("AUTH_INVALID");

  const { data: allowed, error: roleError } = await admin.rpc("has_role", {
    _user_id: data.user.id,
    _role_name: "admin",
  });
  if (roleError) {
    console.error("has_role error", roleError);
    throw new Error(`ADMIN_CHECK_FAILED:${roleError.message}`);
  }
  if (!allowed) throw new Error("ADMIN_REQUIRED");
  return { admin, user: data.user };
}

async function testGemini(apiKey: string, model: string) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const startedAt = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "Réponds uniquement par OK." }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 20 },
    }),
  });
  const text = await response.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }

  return {
    ok: response.ok,
    status: response.status,
    latency_ms: Date.now() - startedAt,
    model,
    usage: data?.usageMetadata || null,
    message: data?.error?.message || null,
    response: data,
  };
}

async function updateSecrets(secretMap: Record<string, string>) {
  if (!MANAGEMENT_TOKEN) throw new Error("SUPABASE_ACCESS_TOKEN_MISSING");
  const payload = Object.entries(secretMap).map(([name, value]) => ({ name, value }));
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`SECRET_UPDATE_FAILED:${response.status}:${text.slice(0, 500)}`);
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { admin, user } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "overview");

    if (action === "overview") {
      const [statsRes, codesRes, settingsRes, consultationsRes] = await Promise.all([
        admin.from("v_fa_admin_stats").select("*").maybeSingle(),
        admin.from("v_fa_code_status").select("*").order("created_at", { ascending: false }).limit(500),
        admin.from("fa_settings").select("*").eq("id", 1).maybeSingle(),
        admin.from("fa_consultations").select("id,code_value,device_id,user_id,sign_name,category,question,answer,status,error,provider,model,tokens_in,tokens_out,quota_via,code_use_number,created_at").order("created_at", { ascending: false }).limit(300),
      ]);
      const firstError = statsRes.error || codesRes.error || settingsRes.error || consultationsRes.error;
      if (firstError) return json({ error: "database_error", detail: firstError.message }, 500);

      const currentKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";
      return json({
        stats: statsRes.data,
        codes: codesRes.data || [],
        settings: settingsRes.data,
        consultations: consultationsRes.data || [],
        gemini: {
          configured: Boolean(currentKey),
          model: Deno.env.get("GEMINI_MODEL") || settingsRes.data?.gemini_model || DEFAULT_MODEL,
          key_fingerprint: currentKey ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(currentKey)).then((buffer) => Array.from(new Uint8Array(buffer)).slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("")) : null,
          management_enabled: Boolean(MANAGEMENT_TOKEN),
        },
      });
    }

    if (action === "generate_codes") {
      const count = Math.min(Math.max(Number(body?.count) || 1, 1), 500);
      const maxUses = Math.min(Math.max(Number(body?.max_uses) || 3, 1), 100);
      const expiresAt = body?.expires_at || null;
      const notes = String(body?.notes || "").slice(0, 500) || null;

      const generated: any[] = [];
      let attempts = 0;
      const maxAttempts = count * 20;

      while (generated.length < count && attempts < maxAttempts) {
        attempts += 1;

        const code = String(
          crypto.getRandomValues(new Uint32Array(1))[0] % 1000000
        ).padStart(6, "0");

        const { data, error } = await admin
          .from("fa_access_codes")
          .insert({
            code,
            max_uses: maxUses,
            uses_count: 0,
            active: true,
            expires_at: expiresAt,
            notes,
            created_by: user.id,
          })
          .select("*")
          .single();

        if (!error && data) {
          generated.push(data);
          continue;
        }

        if (error?.code === "23505") {
          continue;
        }

        console.error("fa_access_codes insert error", error);
        return json({
          error: "generate_failed",
          message: "La génération des codes a échoué.",
          detail: error?.message || "Erreur inconnue",
          code: error?.code || null,
        }, 400);
      }

      if (generated.length !== count) {
        return json({
          error: "generation_incomplete",
          message: "Tous les codes demandés n’ont pas pu être générés.",
          generated_count: generated.length,
          requested_count: count,
        }, 500);
      }

      return json({
        generated,
        count: generated.length,
        message: `${generated.length} code(s) généré(s).`,
      });
    }

    if (action === "reset_code") {
      const codeId = String(body?.code_id || "");
      const { error } = await admin.from("fa_access_codes").update({
        uses_count: 0,
        active: true,
        first_used_at: null,
        last_used_at: null,
        exhausted_at: null,
        last_device_id: null,
      }).eq("id", codeId);
      if (error) return json({ error: "reset_failed", detail: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "toggle_code") {
      const codeId = String(body?.code_id || "");
      const active = Boolean(body?.active);
      const { error } = await admin.from("fa_access_codes").update({ active }).eq("id", codeId);
      if (error) return json({ error: "toggle_failed", detail: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "update_settings") {
      const update = {
        free_daily_limit: Math.min(Math.max(Number(body?.free_daily_limit) || 1, 0), 20),
        code_uses: Math.min(Math.max(Number(body?.code_uses) || 3, 1), 100),
        gemini_model: String(body?.gemini_model || DEFAULT_MODEL).slice(0, 120),
        max_output_words: Math.min(Math.max(Number(body?.max_output_words) || 300, 60), 800),
        updated_by: user.id,
      };
      const { data, error } = await admin.from("fa_settings").update(update).eq("id", 1).select().single();
      if (error) return json({ error: "settings_failed", detail: error.message }, 400);
      return json({ settings: data });
    }

    if (action === "test_gemini") {
      const currentKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";
      if (!currentKey) return json({ error: "gemini_key_missing" }, 400);
      const model = String(body?.model || Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL);
      const result = await testGemini(currentKey, model);
      return json(result, result.ok ? 200 : 502);
    }

    if (action === "update_gemini") {
      const newKey = String(body?.api_key || "").trim();
      const model = String(body?.model || DEFAULT_MODEL).trim();
      if (!newKey || newKey.length < 20) return json({ error: "invalid_api_key" }, 400);
      const test = await testGemini(newKey, model);
      if (!test.ok) return json({ error: "gemini_validation_failed", test }, 400);
      await updateSecrets({ GEMINI_API_KEY: newKey, GEMINI_MODEL: model });
      await admin.from("fa_settings").update({ gemini_model: model, updated_by: user.id }).eq("id", 1);
      return json({ ok: true, model, test, message: "Clé Gemini validée et mise à jour. Les Edge Functions seront redémarrées automatiquement." });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    const message = String((error as Error).message || error);
    if (message === "AUTH_REQUIRED" || message === "AUTH_INVALID") return json({ error: message }, 401);
    if (message === "ADMIN_REQUIRED") return json({ error: message }, 403);
    if (message.startsWith("ADMIN_CHECK_FAILED:")) return json({ error: "ADMIN_CHECK_FAILED", detail: message.slice("ADMIN_CHECK_FAILED:".length) }, 500);
    if (message === "SUPABASE_ACCESS_TOKEN_MISSING") return json({ error: message, message: "Ajoutez SUPABASE_ACCESS_TOKEN aux secrets Supabase pour permettre la mise à jour de la clé depuis l’interface." }, 503);
    console.error("fa-admin error", error);
    return json({ error: "internal", detail: message }, 500);
  }
});
