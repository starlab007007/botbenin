// Shared helpers for the WAOUH AI Agent module (WhatsApp).
// - Lovable AI Gateway calls (chat, embeddings, STT, vision)
// - System-prompt builder per agent

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export function getLovableKey(): string {
  const k = Deno.env.get("LOVABLE_API_KEY");
  if (!k) throw new Error("LOVABLE_API_KEY manquant");
  return k;
}

export async function chatCompletion(opts: {
  model?: string;
  system?: string;
  messages: Array<{ role: string; content: any }>;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<string> {
  const body: any = {
    model: opts.model || "google/gemini-3-flash-preview",
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      ...opts.messages,
    ],
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getLovableKey()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI chat ${res.status}: ${t}`);
  }
  const j = await res.json();
  return j?.choices?.[0]?.message?.content ?? "";
}

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getLovableKey()}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text.slice(0, 6000),
      dimensions: 768,
    }),
  });
  if (!res.ok) throw new Error(`Embed ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j?.data?.[0]?.embedding as number[];
}

export function chunkText(text: string, size = 800, overlap = 100): string[] {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

export function buildSystemPrompt(agent: any, products: any[] = []): string {
  const persona = agent.persona || {};
  const caps = agent.capabilities || {};
  const name = persona.name || agent.name || "Assistant";
  const tone = persona.tone || "friendly";
  const emojis = persona.emojis !== false;

  const catalog = (products || [])
    .filter((p) => p.active !== false)
    .slice(0, 40)
    .map((p) => {
      const price = p.price_fcfa ? `${p.price_fcfa.toLocaleString("fr-FR")} FCFA` : "sur demande";
      return `- ${p.name} (${price})${p.description ? ` — ${p.description}` : ""}`;
    })
    .join("\n") || "(catalogue vide)";

  const capsLines = [
    caps.qa !== false ? "- Réponds aux questions clients." : "",
    caps.sell ? "- Présente les produits/services, propose des devis et génère des liens de paiement quand le client confirme." : "",
    caps.appointments ? "- Propose des créneaux de rendez-vous et confirme-les." : "",
    caps.qualify ? "- Qualifie le prospect (besoin, budget, urgence) et note-le mentalement." : "",
    caps.handoff !== false ? "- Passe la main à l'humain si le client dit 'humain', 'patron', 'urgent', ou après 3 réponses évasives." : "",
  ].filter(Boolean).join("\n");

  return `Tu es ${name}, assistant WhatsApp de "${agent.name}". Tu réponds TOUJOURS en français, avec un ton ${tone}${emojis ? " et quelques emojis pertinents" : " sans emojis"}.

CATALOGUE :
${catalog}

CAPACITÉS :
${capsLines}

RÈGLES ABSOLUES :
- Sois court, clair, chaleureux. Une réponse WhatsApp = 1 à 4 phrases max.
- Ne jamais inventer un prix : si le produit n'est pas au catalogue, dis-le et propose une alternative similaire.
- Si le client demande à parler à un humain, réponds "Je transmets à ${agent.name}, tu auras une réponse très vite 🙏" et rien de plus.
- Ne mentionne jamais que tu es une IA sauf si on te le demande directement.
- Utilise les FAITS ci-dessous du contexte quand ils sont pertinents.`;
}

// Shared: run one agent turn (used by both waouh-agent-chat and waouh-agent-webhook)
export async function runAgentTurn(supabase: any, agent_id: string, message: string, opts: {
  history?: Array<{ role: string; content: string }>;
  contact_phone?: string;
  contact_name?: string;
  persist?: boolean;
}) {
  const HANDOFF = /\b(humain|human|patron|urgent|réel|reel|manager|responsable|parler à quelqu)/i;
  const { data: agent } = await supabase.from("waouh_ai_agents").select("*").eq("id", agent_id).maybeSingle();
  if (!agent) throw new Error("agent introuvable");
  const { data: products } = await supabase.from("waouh_ai_agent_products").select("*").eq("agent_id", agent_id).eq("active", true).order("position");

  let context = "";
  try {
    const emb = await embedText(message);
    const { data: matches } = await supabase.rpc("match_agent_chunks", {
      _agent_id: agent_id, _query_embedding: emb, _match_count: 4,
    });
    if (matches?.length) context = "\n\nFAITS PERTINENTS :\n" + matches.map((m: any) => `• ${m.content}`).join("\n");
  } catch (e) { console.error("rag err", e); }

  const system = buildSystemPrompt(agent, products || []) + context;
  const history = (opts.history || []).slice(-8);
  const reply = await chatCompletion({
    system, messages: [...history, { role: "user", content: message }], temperature: 0.6,
  });
  const needs_handoff = HANDOFF.test(message);

  if (opts.persist && opts.contact_phone) {
    const { data: existing } = await supabase.from("waouh_ai_agent_conversations")
      .select("id, messages, needs_handoff").eq("agent_id", agent_id).eq("wa_contact_phone", opts.contact_phone).maybeSingle();
    const newMsgs = [
      ...(existing?.messages || []),
      { role: "user", content: message, ts: Date.now() },
      { role: "assistant", content: reply, ts: Date.now() },
    ].slice(-40);
    if (existing) {
      await supabase.from("waouh_ai_agent_conversations").update({
        messages: newMsgs, last_activity: new Date().toISOString(),
        needs_handoff: existing.needs_handoff || needs_handoff,
      }).eq("id", existing.id);
    } else {
      await supabase.from("waouh_ai_agent_conversations").insert({
        agent_id, user_id: agent.user_id, wa_contact_phone: opts.contact_phone,
        wa_contact_name: opts.contact_name || null, messages: newMsgs, needs_handoff,
      });
    }
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
