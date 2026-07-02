// Chat with an agent (used for sandbox testing).
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { runAgentTurn } from "../_shared/agent-ai.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HANDOFF_TRIGGERS = /\b(humain|human|patron|urgent|réel|reel|manager|responsable|parler à quelqu)/i;

export async function runAgentTurn(supabase: any, agent_id: string, message: string, opts: {
  history?: Array<{ role: string; content: string }>;
  contact_phone?: string;
  contact_name?: string;
  persist?: boolean;
}) {
  const { data: agent } = await supabase.from("waouh_ai_agents").select("*").eq("id", agent_id).maybeSingle();
  if (!agent) throw new Error("agent introuvable");

  const { data: products } = await supabase.from("waouh_ai_agent_products").select("*").eq("agent_id", agent_id).eq("active", true).order("position");

  // RAG: retrieve top chunks
  let context = "";
  try {
    const emb = await embedText(message);
    const { data: matches } = await supabase.rpc("match_agent_chunks", {
      _agent_id: agent_id, _query_embedding: emb, _match_count: 4,
    });
    if (matches?.length) {
      context = "\n\nFAITS PERTINENTS :\n" + matches.map((m: any) => `• ${m.content}`).join("\n");
    }
  } catch (e) { console.error("rag err", e); }

  const system = buildSystemPrompt(agent, products || []) + context;

  const history = (opts.history || []).slice(-8);
  const reply = await chatCompletion({
    system,
    messages: [...history, { role: "user", content: message }],
    temperature: 0.6,
  });

  const needs_handoff = HANDOFF_TRIGGERS.test(message);

  // Persist conversation for WhatsApp flow
  if (opts.persist && opts.contact_phone) {
    const { data: existing } = await supabase.from("waouh_ai_agent_conversations")
      .select("id, messages").eq("agent_id", agent_id).eq("wa_contact_phone", opts.contact_phone).maybeSingle();
    const newMsgs = [
      ...(existing?.messages || []),
      { role: "user", content: message, ts: Date.now() },
      { role: "assistant", content: reply, ts: Date.now() },
    ].slice(-40);
    if (existing) {
      await supabase.from("waouh_ai_agent_conversations").update({
        messages: newMsgs, last_activity: new Date().toISOString(),
        needs_handoff: existing && (existing as any).needs_handoff || needs_handoff,
      }).eq("id", existing.id);
    } else {
      await supabase.from("waouh_ai_agent_conversations").insert({
        agent_id, user_id: agent.user_id, wa_contact_phone: opts.contact_phone,
        wa_contact_name: opts.contact_name || null, messages: newMsgs, needs_handoff,
      });
    }
    // increment stats
    await supabase.from("waouh_ai_agents").update({
      stats: {
        ...(agent.stats || {}),
        messages_handled: ((agent.stats?.messages_handled) || 0) + 1,
        handoffs: ((agent.stats?.handoffs) || 0) + (needs_handoff ? 1 : 0),
      },
    }).eq("id", agent_id);
  }

  return { reply, needs_handoff };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { agent_id, message, history, contact_phone, contact_name, persist } = body;
    if (!agent_id || !message) throw new Error("agent_id et message requis");

    const result = await runAgentTurn(supabase, agent_id, message, {
      history, contact_phone, contact_name, persist: !!persist,
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
