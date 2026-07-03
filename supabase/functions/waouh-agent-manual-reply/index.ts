import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

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
    if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "Connexion requise" }, 401);
    const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: authData } = await caller.auth.getUser();
    if (!authData.user) return json({ ok: false, error: "Session expirée" }, 401);
    const body = await req.json().catch(() => ({}));
    const agentId = String(body.agent_id || "").trim();
    const phone = String(body.contact_phone || "").replace(/@c\.us|@lid/g, "").replace(/\D/g, "");
    const mode = String(body.mode || "");
    const message = String(body.message || "").trim();
    if (!agentId || !phone) return json({ ok: false, error: "Agent et contact requis" }, 400);

    const admin = createClient(url, service);
    const { data: agent } = await admin.from("waouh_ai_agents").select("*").eq("id", agentId).maybeSingle();
    if (!agent || agent.user_id !== authData.user.id) return json({ ok: false, error: "Agent introuvable" }, 404);

    if (mode === "pause" || mode === "resume") {
      const paused = Array.isArray(agent.paused_contacts) ? agent.paused_contacts : [];
      const next = mode === "pause" ? Array.from(new Set([...paused, phone])) : paused.filter((item: string) => item !== phone);
      await admin.from("waouh_ai_agents").update({ paused_contacts: next }).eq("id", agentId);
    }
    if (mode === "takeover" || mode === "release") {
      await admin.from("waouh_ai_agent_conversations").update({ human_takeover: mode === "takeover" }).eq("agent_id", agentId).eq("wa_contact_phone", phone);
    }

    let sent = false;
    if (message) {
      const response = await fetch(`${url}/functions/v1/waha-send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${service}` },
        body: JSON.stringify({ sessionName: agent.waha_session_name, to: phone, message, messageType: "text" }),
      });
      sent = response.ok;
      if (!sent) throw new Error(`Envoi WhatsApp impossible (${response.status})`);
      const { data: conversation } = await admin.from("waouh_ai_agent_conversations").select("id,messages,operator_messages").eq("agent_id", agentId).eq("wa_contact_phone", phone).maybeSingle();
      const stamp = { role: "operator", content: message, ts: Date.now() };
      if (conversation) {
        await admin.from("waouh_ai_agent_conversations").update({
          messages: [...(conversation.messages || []), stamp].slice(-40),
          operator_messages: [...(conversation.operator_messages || []), stamp].slice(-40),
          last_activity: new Date().toISOString(),
          needs_handoff: false,
          human_takeover: true,
        }).eq("id", conversation.id);
      } else {
        await admin.from("waouh_ai_agent_conversations").insert({
          agent_id: agentId,
          user_id: authData.user.id,
          wa_contact_phone: phone,
          messages: [stamp],
          operator_messages: [stamp],
          human_takeover: true,
        });
      }
    }
    return json({ ok: true, sent });
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    console.error("waouh-agent-manual-reply", error);
    return json({ ok: false, error: text }, 400);
  }
});
