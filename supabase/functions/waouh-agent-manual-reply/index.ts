// Send a manual (human operator) reply to a WhatsApp contact via WAHA and log it
// on the corresponding agent conversation. Also toggles/pauses agent auto-reply
// for this specific contact when `mode` is `pause` | `resume` | `takeover`.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    // Verify caller
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) throw new Error("unauthorized");
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) throw new Error("unauthorized");

    const { agent_id, contact_phone, message, mode } = await req.json();
    if (!agent_id || !contact_phone) throw new Error("agent_id et contact_phone requis");

    const { data: agent } = await supabase.from("waouh_ai_agents").select("*").eq("id", agent_id).maybeSingle();
    if (!agent) throw new Error("agent introuvable");
    if (agent.user_id !== user.id) throw new Error("forbidden");

    // Toggle pause / takeover
    if (mode === "pause" || mode === "resume") {
      const paused: string[] = Array.isArray(agent.paused_contacts) ? agent.paused_contacts : [];
      const next = mode === "pause"
        ? Array.from(new Set([...paused, contact_phone]))
        : paused.filter((p) => p !== contact_phone);
      await supabase.from("waouh_ai_agents").update({ paused_contacts: next }).eq("id", agent_id);
    }
    if (mode === "takeover" || mode === "release") {
      await supabase.from("waouh_ai_agent_conversations")
        .update({ human_takeover: mode === "takeover" })
        .eq("agent_id", agent_id).eq("wa_contact_phone", contact_phone);
    }

    // Send WhatsApp message if requested
    let sent = false;
    if (message && String(message).trim()) {
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/waha-send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          sessionName: agent.waha_session_name, to: contact_phone, message, messageType: "text",
        }),
      });
      sent = r.ok;
      if (!r.ok) console.error("manual send fail", await r.text());

      // Log into conversation
      const { data: conv } = await supabase.from("waouh_ai_agent_conversations")
        .select("id, messages, operator_messages")
        .eq("agent_id", agent_id).eq("wa_contact_phone", contact_phone).maybeSingle();
      const stamp = { role: "operator", content: message, ts: Date.now() };
      if (conv) {
        await supabase.from("waouh_ai_agent_conversations").update({
          messages: [...((conv.messages as any[]) || []), stamp].slice(-40),
          operator_messages: [...((conv.operator_messages as any[]) || []), stamp].slice(-40),
          last_activity: new Date().toISOString(),
          needs_handoff: false,
        }).eq("id", conv.id);
      } else {
        await supabase.from("waouh_ai_agent_conversations").insert({
          agent_id, user_id: user.id, wa_contact_phone: contact_phone,
          messages: [stamp], operator_messages: [stamp],
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("manual-reply err", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
