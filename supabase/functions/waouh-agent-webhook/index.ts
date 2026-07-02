// Receives WhatsApp inbound messages routed for an AI agent, runs a turn, sends WAHA reply.
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
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { agent_id, session, payload } = await req.json();
    if (!agent_id || !payload) throw new Error("agent_id / payload requis");

    const message = String(payload.body || "").trim();
    if (!message) return new Response("ok", { headers: cors });
    const from = String(payload.from || "").replace(/@c\.us|@lid/g, "");
    const contactName = payload?.notifyName || payload?.pushName || null;

    // load recent history for this contact
    const { data: conv } = await supabase.from("waouh_ai_agent_conversations")
      .select("messages").eq("agent_id", agent_id).eq("wa_contact_phone", from).maybeSingle();
    const history = (conv?.messages || []).slice(-8).map((m: any) => ({
      role: m.role, content: m.content,
    }));

    const { reply, needs_handoff } = await runAgentTurn(supabase, agent_id, message, {
      history, contact_phone: from, contact_name: contactName, persist: true,
    });

    // send reply via waha-send-message
    if (reply) {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waha-send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ sessionName: session, to: from, message: reply, messageType: "text" }),
      }).catch((e) => console.error("send fail", e));
    }

    return new Response(JSON.stringify({ ok: true, needs_handoff }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("agent-webhook err", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
