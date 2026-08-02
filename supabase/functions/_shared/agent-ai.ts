import { geminiEmbedding, geminiText } from "./gemini.ts";

export async function chatCompletion(options: {
  system?: string;
  messages: Array<{ role: string; content: unknown }>;
  temperature?: number;
  jsonMode?: boolean;
}) {
  const conversation = options.messages
    .map((message) => `${String(message.role || "user").toUpperCase()}: ${typeof message.content === "string" ? message.content : JSON.stringify(message.content)}`)
    .join("\n\n");
  return geminiText({
    system: options.system,
    user: conversation,
    temperature: options.temperature ?? 0.5,
    json: options.jsonMode,
  });
}

export async function embedText(text: string) {
  return geminiEmbedding(text);
}

export function chunkText(text: string, size = 800, overlap = 100) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  for (let cursor = 0; cursor < clean.length; cursor += Math.max(1, size - overlap)) {
    chunks.push(clean.slice(cursor, cursor + size));
  }
  return chunks;
}

function price(product: any) {
  const min = product.price_fcfa ?? product.prix_min;
  const max = product.prix_max;
  if (min == null) return "sur demande";
  if (max != null && max !== min) return `${Number(min).toLocaleString("fr-FR")}–${Number(max).toLocaleString("fr-FR")} FCFA`;
  return `${Number(min).toLocaleString("fr-FR")} FCFA`;
}

export function buildSystemPrompt(agent: any, products: any[], facts: string) {
  const persona = agent.persona || {};
  const caps = agent.capabilities || {};
  const name = persona.name || agent.name || "Assistant";
  const tone = persona.tone || "professionnel";
  const emoji = persona.emojis === false ? "sans emojis" : "avec quelques emojis discrets";
  if (agent.agent_type === "docs") {
    return `Tu es ${name}, assistant documentaire de « ${agent.name} ». Réponds toujours en français, ton ${tone}, ${emoji}.
Règles : utilise uniquement les faits ci-dessous ; ne devine jamais ; si une information manque, dis que tu peux la transmettre à un humain ; réponse WhatsApp courte (1 à 4 phrases).

FAITS :\n${facts || "Aucun fait trouvé."}`;
  }
  if (agent.agent_type === "website") {
    return `Tu es ${name}, assistant du site de « ${agent.name} ». Réponds toujours en français, ton ${tone}, ${emoji}.
Règles : utilise uniquement les faits du site ; ne devine jamais prix, délai ou adresse ; propose un humain si la réponse manque ; réponse courte.

FAITS :\n${facts || "Aucun fait trouvé."}`;
  }
  const catalog = products.slice(0, 40).map((product) => `- ${product.name || product.nom}: ${price(product)}${product.description ? ` — ${product.description}` : ""}`).join("\n") || "Catalogue vide";
  const tasks = [
    caps.qa !== false ? "répondre aux questions" : "",
    caps.sell ? "présenter et vendre" : "",
    caps.appointments ? "proposer un rendez-vous" : "",
    caps.qualify ? "qualifier le besoin" : "",
    caps.handoff !== false ? "passer à un humain sur demande" : "",
  ].filter(Boolean).join(", ");
  return `Tu es ${name}, assistant WhatsApp de « ${agent.name} ». Réponds toujours en français, ton ${tone}, ${emoji}.
Tu peux : ${tasks}.
Règles : réponse de 1 à 4 phrases, n’invente jamais un prix, et si le client demande une personne réponds que tu transmets.

CATALOGUE :\n${catalog}\n\nFAITS :\n${facts || "Aucun fait complémentaire."}`;
}

async function productsForAgent(supabase: any, agentId: string) {
  const [{ data: manual }, { data: links }] = await Promise.all([
    supabase.from("waouh_ai_agent_products").select("*").eq("agent_id", agentId).eq("active", true),
    supabase.from("waouh_ai_agent_partner_products").select("product_id").eq("agent_id", agentId),
  ]);
  const ids = (links || []).map((item: any) => item.product_id).filter(Boolean);
  let partner: any[] = [];
  if (ids.length) {
    const { data } = await supabase.from("waouh_partner_products").select("id,nom,description,prix_min,prix_max,disponible").in("id", ids);
    partner = data || [];
  }
  return [...partner, ...(manual || [])];
}

export async function runAgentTurn(
  supabase: any,
  agentId: string,
  message: string,
  options: {
    history?: Array<{ role: string; content: string }>;
    contact_phone?: string;
    contact_name?: string;
    persist?: boolean;
  },
) {
  const { data: agent } = await supabase.from("waouh_ai_agents").select("*").eq("id", agentId).maybeSingle();
  if (!agent) throw new Error("Agent introuvable");
  const phone = options.contact_phone;
  const paused = Array.isArray(agent.paused_contacts) ? agent.paused_contacts : [];
  if (options.persist && phone && paused.includes(phone)) {
    return { reply: "", needs_handoff: false, skipped: true, reason: "contact_paused" };
  }

  let existing: any = null;
  if (options.persist && phone) {
    const { data } = await supabase.from("waouh_ai_agent_conversations").select("id,messages,human_takeover,needs_handoff").eq("agent_id", agentId).eq("wa_contact_phone", phone).maybeSingle();
    existing = data;
    if (existing?.human_takeover) {
      const messages = [...(existing.messages || []), { role: "user", content: message, ts: Date.now() }].slice(-40);
      await supabase.from("waouh_ai_agent_conversations").update({ messages, last_activity: new Date().toISOString() }).eq("id", existing.id);
      return { reply: "", needs_handoff: true, skipped: true, reason: "human_takeover" };
    }
  }

  let facts = "";
  try {
    const embedding = await embedText(message);
    const { data } = await supabase.rpc("match_agent_chunks", { _agent_id: agentId, _query_embedding: embedding, _match_count: 5 });
    facts = (data || []).map((item: any) => `• ${item.content}`).join("\n");
  } catch (error) {
    console.error("RAG lookup failed", error);
  }
  const products = agent.agent_type === "commerce" || !agent.agent_type ? await productsForAgent(supabase, agentId) : [];
  const reply = await chatCompletion({
    system: buildSystemPrompt(agent, products, facts),
    messages: [...(options.history || []).slice(-8), { role: "user", content: message }],
  });
  const needsHandoff = /\b(humain|human|patron|urgent|responsable|manager|parler à quelqu)\b/i.test(message);

  if (options.persist && phone) {
    const messages = [
      ...(existing?.messages || []),
      { role: "user", content: message, ts: Date.now() },
      { role: "assistant", content: reply, ts: Date.now() },
    ].slice(-40);
    if (existing) {
      await supabase.from("waouh_ai_agent_conversations").update({
        messages,
        last_activity: new Date().toISOString(),
        needs_handoff: existing.needs_handoff || needsHandoff,
      }).eq("id", existing.id);
    } else {
      await supabase.from("waouh_ai_agent_conversations").insert({
        agent_id: agentId,
        user_id: agent.user_id,
        wa_contact_phone: phone,
        wa_contact_name: options.contact_name || null,
        messages,
        needs_handoff: needsHandoff,
      });
    }
    await supabase.from("waouh_ai_agents").update({
      stats: {
        ...(agent.stats || {}),
        messages_handled: Number(agent.stats?.messages_handled || 0) + 1,
        handoffs: Number(agent.stats?.handoffs || 0) + (needsHandoff ? 1 : 0),
      },
    }).eq("id", agentId);
  }
  return { reply, needs_handoff: needsHandoff };
}
