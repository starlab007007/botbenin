import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { runAgentTurn } from "../_shared/agent-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ ok: false, code: "UNAUTHORIZED", error: "Connexion requise" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return json({ ok: false, code: "UNAUTHORIZED", error: "Session expirée" }, 401);

    const body = await req.json().catch(() => ({}));
    const agentId = String(body.agent_id || "").trim();
    const message = String(body.message || "").trim();
    if (!agentId || !message) return json({ ok: false, code: "INVALID_REQUEST", error: "Agent et message requis" }, 400);

    const admin = createClient(url, service);
    const { data: agent } = await admin.from("waouh_ai_agents").select("id,user_id").eq("id", agentId).maybeSingle();
    if (!agent || agent.user_id !== authData.user.id) return json({ ok: false, code: "AGENT_NOT_FOUND", error: "Agent introuvable" }, 404);
    if (!Deno.env.get("GEMINI_API_KEY")) return json({ ok: false, code: "AI_KEY_MISSING", error: "Service IA Gemini non configuré" }, 503);

    const history = Array.isArray(body.history)
      ? body.history.slice(-8).map((item: any) => ({ role: String(item?.role || "user"), content: String(item?.content || "") }))
      : [];
    const result = await runAgentTurn(admin, agentId, message, {
      history,
      contact_phone: body.contact_phone ? String(body.contact_phone) : undefined,
      contact_name: body.contact_name ? String(body.contact_name) : undefined,
      persist: body.persist === true,
    });
    return json({ ok: true, ...result });
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const code = text.includes("GEMINI_API_KEY") ? "AI_KEY_MISSING" : "AI_PROVIDER_ERROR";
    console.error("waouh-agent-chat", error);
    return json({ ok: false, code, error: text }, 400);
  }
});
