import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { runAgentTurn } from "../_shared/agent-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);
    const body = await req.json().catch(() => ({}));
    const agentId = String(body.agent_id || "").trim();
    const sessionName = String(body.session || "").trim();
    const payload = body.payload || {};
    const message = String(payload.body || "").trim();
    if (!agentId || !sessionName || !message || payload.fromMe) {
      return new Response("OK", { headers: cors });
    }
    const phone = String(payload.from || "").replace(/@c\.us|@lid/g, "").replace(/\D/g, "");
    if (!phone) return new Response("OK", { headers: cors });
    const { data: previous } = await admin
      .from("waouh_ai_agent_conversations")
      .select("messages")
      .eq("agent_id", agentId)
      .eq("wa_contact_phone", phone)
      .maybeSingle();
    const history = Array.isArray(previous?.messages)
      ? previous.messages.slice(-8).map((item: any) => ({ role: String(item?.role || "user"), content: String(item?.content || "") }))
      : [];
    const result = await runAgentTurn(admin, agentId, message, {
      history,
      contact_phone: phone,
      contact_name: payload.notifyName || payload.pushName || null,
      persist: true,
    });
    if (result.reply) {
      const response = await fetch(`${url}/functions/v1/waha-send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${service}` },
        body: JSON.stringify({ sessionName, to: phone, message: result.reply, messageType: "text" }),
      });
      if (!response.ok) console.error("WAHA send failed", response.status, await response.text());
    }
    return new Response("OK", { headers: cors });
  } catch (error) {
    console.error("waouh-agent-webhook", error);
    return new Response("OK", { headers: cors });
  }
});
