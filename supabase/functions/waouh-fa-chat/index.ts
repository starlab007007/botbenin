// FA IA chat — enforces daily quota + 6-digit access codes, logs consultations,
// calls Lovable AI Gateway (Gemini 2.5 Flash Lite) with the FA payload.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fa-device, x-fa-code",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

function buildSystemPrompt(payload: any): string {
  const { sign, context, focus, constraints } = payload || {};
  return [
    "Tu es FA IA, un guide bienveillant qui interprète le Fâ (géomancie béninoise) en français simple.",
    "Reste strictement dans les limites symboliques du signe demandé. Ne diagnostique jamais.",
    "N'invente aucun rituel réservé. Aucune accusation occulte. Une pratique rituelle doit être validée par un Bokonon.",
    `Signe : ${sign?.canonical_name ?? "?"} (ref ${sign?.reference ?? "?"}) — Colonne A : ${(sign?.column_a || []).join(" ")} — Colonne B : ${(sign?.column_b || []).join(" ")}.`,
    `Contexte utilisateur : catégorie « ${context?.category ?? "?"} », intention « ${context?.intention ?? "?"} », locale ${context?.locale ?? "fr-BJ"}.`,
    `Focus demandé : ${focus?.label ?? "Comprendre le signe"} — instruction : ${focus?.instruction ?? ""}.`,
    `Contraintes : détail ${constraints?.detail_level ?? "élevé"}, max ${constraints?.max_words ?? 900} mots, français simple, sans citer de sources externes.`,
    "Structure ta réponse en paragraphes clairs, avec des sous-titres si utile.",
  ].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const userMessage: string = (body?.user_message || "").toString().slice(0, 4000);
    if (!userMessage) return json({ error: "user_message requis" }, 400);

    // Device fingerprint + optional access code
    const deviceId = String(
      body?.device_id || req.headers.get("x-fa-device") || ""
    ).slice(0, 128) || `anon-${crypto.randomUUID()}`;
    const rawCode = String(body?.access_code || req.headers.get("x-fa-code") || "").replace(/\D/g, "");
    const accessCode = rawCode.length === 6 ? rawCode : null;

    // Optional authenticated user
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token) {
      try {
        const { data } = await admin.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch (_) { /* ignore */ }
    }

    // Enforce quota atomically
    const { data: quotaRes, error: quotaErr } = await admin.rpc("fa_consume_quota", {
      p_device_id: deviceId,
      p_user_id: userId,
      p_code: accessCode,
    });
    if (quotaErr) {
      console.error("fa_consume_quota error", quotaErr);
      return json({ error: "quota_check_failed", detail: quotaErr.message }, 500);
    }
    const quota = quotaRes as any;
    if (!quota?.allowed) {
      const reasonMap: Record<string, string> = {
        code_invalid: "Ce code est introuvable. Vérifiez auprès de l'administrateur.",
        code_inactive: "Ce code a été désactivé. Demandez un nouveau code.",
        code_expired: "Ce code a expiré. Demandez un nouveau code.",
        code_exhausted: "Ce code a déjà été utilisé 3 fois. Demandez un nouveau code auprès de l'administrateur.",
        daily_quota_exceeded: "Vous avez déjà consulté aujourd'hui. Entrez un code d'accès pour continuer ou revenez demain.",
      };
      return json({
        error: "quota_exceeded",
        reason: quota?.reason || "unknown",
        message: reasonMap[quota?.reason] || "Consultation impossible.",
        details: quota,
      }, 402);
    }

    // AI call
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY manquant" }, 500);
    }
    const systemPrompt = buildSystemPrompt(body);
    const history = Array.isArray(body?.history) ? body.history : [];
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content || "").slice(0, 2000),
      })),
      { role: "user", content: userMessage },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages,
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (aiRes.status === 429) return json({ error: "rate_limited", message: "Trop de requêtes, réessayez dans un instant." }, 429);
    if (aiRes.status === 402) return json({ error: "ai_credits", message: "Crédits IA épuisés, contactez l'administrateur." }, 402);
    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error("AI gateway error", aiRes.status, errText);
      return json({ error: "ai_error", detail: errText }, 500);
    }
    const aiJson = await aiRes.json();
    const answer: string = aiJson?.choices?.[0]?.message?.content ?? "";
    if (!answer) return json({ error: "empty_answer" }, 500);

    // Log consultation
    await admin.from("fa_consultations").insert({
      code_id: quota?.code_id || null,
      code_value: quota?.code_value || null,
      device_id: deviceId,
      user_id: userId,
      sign_ref: body?.sign?.reference ?? null,
      sign_name: body?.sign?.canonical_name ?? null,
      category: body?.context?.category ?? null,
      intention: body?.context?.intention ?? null,
      question: userMessage,
      answer,
      focus_key: body?.focus?.intent_key ?? null,
      ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: req.headers.get("user-agent") || null,
      status: "ok",
      tokens_in: aiJson?.usage?.prompt_tokens ?? null,
      tokens_out: aiJson?.usage?.completion_tokens ?? null,
    });

    return json({
      answer,
      quota: {
        via: quota.via,
        remaining: quota.remaining ?? null,
        code_uses: quota.uses_count ?? null,
        code_max: quota.max_uses ?? null,
      },
    });
  } catch (e) {
    console.error("waouh-fa-chat error", e);
    return json({ error: "internal", detail: String((e as Error).message) }, 500);
  }
});
