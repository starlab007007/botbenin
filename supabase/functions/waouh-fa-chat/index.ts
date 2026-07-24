// FA IA chat — quota + codes d’accès + journalisation.
// Appel direct à l’API officielle Google Gemini, sans passerelle Lovable.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fa-device, x-fa-code",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY") || "";
const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

function buildSystemPrompt(payload: any, maxWords: number): string {
  const { sign, context, focus } = payload || {};
  return [
    "Tu es FA IA, un assistant numérique expert en interprétation contextuelle du Fâ en français clair.",
    "Utilise exclusivement l’interprétation intégrale du signe transmise dans le message utilisateur comme fondement de l’analyse.",
    "Réponds directement à la demande et adapte la lecture au thème et à l’intention de la consultation.",
    "Ne cite jamais un livre, une page, un numéro d’entrée, une source ou une référence documentaire.",
    "N’invente aucun verset, proverbe, rituel, interdit, sacrifice ou prescription absent du corpus transmis.",
    "Ne combine pas génériquement les deux signes de base à la place du signe exact.",
    "Ne formule aucune prédiction certaine ou fatale. Ne diagnostique jamais.",
    "Toute pratique traditionnelle réservée doit être validée par un Bokonon qualifié.",
    `Signe : ${sign?.canonical_name ?? "?"} (référence technique ${sign?.reference ?? "?"}).`,
    `Contexte : catégorie « ${context?.category ?? "?"} », intention « ${context?.intention ?? "?"} », locale ${context?.locale ?? "fr-BJ"}.`,
    `Angle demandé : ${focus?.label ?? "Comprendre le signe"}. ${focus?.instruction ?? ""}`,
    `Longueur maximale : ${maxWords} mots.`,
    "Structure la réponse en paragraphes courts avec des sous-titres utiles, sans longue introduction.",
  ].join("\n");
}

function toGeminiContents(history: any[], userMessage: string) {
  const contents = (Array.isArray(history) ? history : [])
    .slice(-6)
    .map((message: any) => ({
      role: message?.role === "assistant" || message?.role === "model" ? "model" : "user",
      parts: [{ text: String(message?.content || "").slice(0, 1800) }],
    }))
    .filter((item: any) => item.parts[0].text.trim().length > 0);
  contents.push({ role: "user", parts: [{ text: userMessage }] });
  return contents;
}

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part: any) => typeof part?.text === "string" ? part.text : "").join("").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const userMessage = String(body?.user_message || "").slice(0, 16000).trim();
    if (!userMessage) return json({ error: "user_message requis" }, 400);

    const deviceId = String(body?.device_id || req.headers.get("x-fa-device") || "").slice(0, 128) || `anon-${crypto.randomUUID()}`;
    const rawCode = String(body?.access_code || req.headers.get("x-fa-code") || "").replace(/\D/g, "");
    const accessCode = rawCode.length === 6 ? rawCode : null;

    let userId: string | null = null;
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token) {
      try {
        const { data } = await admin.auth.getUser(token);
        userId = data.user?.id ?? null;
      } catch (_) { /* utilisateur anonyme */ }
    }

    const [{ data: settings }, quotaResult] = await Promise.all([
      admin.from("fa_settings").select("free_daily_limit,code_uses,gemini_model,max_output_words").eq("id", 1).maybeSingle(),
      admin.rpc("fa_consume_quota", { p_device_id: deviceId, p_user_id: userId, p_code: accessCode }),
    ]);

    const { data: quotaRes, error: quotaErr } = quotaResult;
    if (quotaErr) {
      console.error("fa_consume_quota error", quotaErr);
      return json({ error: "quota_check_failed", detail: quotaErr.message }, 500);
    }

    const quota = quotaRes as any;
    if (!quota?.allowed) {
      const codeMax = Number(quota?.max_uses || settings?.code_uses || 3);
      const reasonMap: Record<string, string> = {
        code_invalid: "Ce code est introuvable. Vérifiez-le ou demandez un nouveau code à l’administrateur.",
        code_inactive: "Ce code a été désactivé. Demandez un nouveau code à l’administrateur.",
        code_expired: "Ce code a expiré. Demandez son renouvellement à l’administrateur.",
        code_exhausted: `Ce code a déjà été utilisé ${codeMax} fois. Demandez un nouveau code pour continuer.`,
        daily_quota_exceeded: "Vous avez atteint votre consultation gratuite du jour. Revenez demain ou saisissez un code d’accès pour continuer.",
      };
      return json({
        error: "quota_exceeded",
        reason: quota?.reason || "unknown",
        message: reasonMap[quota?.reason] || "Consultation impossible.",
        details: quota,
      }, 402);
    }

    if (!GEMINI_API_KEY) {
      console.error("Secret Gemini absent : GEMINI_API_KEY ou GOOGLE_API_KEY");
      return json({ error: "gemini_key_missing", message: "La clé serveur Gemini n’est pas configurée." }, 500);
    }

    const model = Deno.env.get("GEMINI_MODEL") || settings?.gemini_model || DEFAULT_GEMINI_MODEL;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const configuredMaxWords = Number(settings?.max_output_words || 300);
    const requestedMaxWords = Number(body?.constraints?.max_words || configuredMaxWords);
    const maxWords = Math.min(Math.max(requestedMaxWords, 60), configuredMaxWords, 800);

    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(body, maxWords) }] },
        contents: toGeminiContents(body?.history, userMessage),
        generationConfig: {
          temperature: 0.55,
          topP: 0.9,
          maxOutputTokens: Math.min(Math.max(maxWords * 3, 320), 2400),
        },
      }),
    });

    const rawGemini = await geminiResponse.text();
    if (!geminiResponse.ok) {
      const status = geminiResponse.status === 429 ? 429 : 502;
      const errorCode = geminiResponse.status === 429 ? "rate_limited" : "gemini_error";
      const message = geminiResponse.status === 429
        ? "Le quota Gemini est momentanément atteint. Revenez après quelques instants."
        : "Gemini n’a pas pu générer la réponse.";
      console.error("Gemini API error", geminiResponse.status, rawGemini.slice(0, 1000));
      await admin.from("fa_consultations").insert({
        code_id: quota?.code_id || null,
        code_value: quota?.code_value || null,
        code_use_number: quota?.uses_count || null,
        quota_via: quota?.via || null,
        device_id: deviceId,
        user_id: userId,
        sign_ref: body?.sign?.reference ?? null,
        sign_name: body?.sign?.canonical_name ?? null,
        category: body?.context?.category ?? null,
        intention: body?.context?.intention ?? null,
        question: userMessage,
        focus_key: body?.focus?.intent_key ?? null,
        provider: "google-gemini-direct",
        model,
        status: "error",
        error: `${geminiResponse.status}: ${rawGemini.slice(0, 1000)}`,
      });
      return json({ error: errorCode, message, detail: rawGemini.slice(0, 1000), model }, status);
    }

    let geminiJson: any;
    try { geminiJson = JSON.parse(rawGemini); }
    catch { return json({ error: "gemini_invalid_response", model }, 502); }

    const answer = extractGeminiText(geminiJson);
    if (!answer) return json({ error: "empty_answer", finish_reason: geminiJson?.candidates?.[0]?.finishReason, model }, 502);

    await admin.from("fa_consultations").insert({
      code_id: quota?.code_id || null,
      code_value: quota?.code_value || null,
      code_use_number: quota?.uses_count || null,
      quota_via: quota?.via || null,
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
      provider: "google-gemini-direct",
      model,
      status: "ok",
      tokens_in: geminiJson?.usageMetadata?.promptTokenCount ?? null,
      tokens_out: geminiJson?.usageMetadata?.candidatesTokenCount ?? null,
    });

    return json({
      answer,
      provider: "google-gemini-direct",
      model,
      usage: geminiJson?.usageMetadata || null,
      quota: {
        via: quota.via,
        remaining: quota.remaining ?? null,
        code_uses: quota.uses_count ?? null,
        code_max: quota.max_uses ?? null,
        renew_required: Boolean(quota.renew_required),
      },
    });
  } catch (error) {
    console.error("waouh-fa-chat error", error);
    return json({ error: "internal", detail: String((error as Error).message) }, 500);
  }
});
