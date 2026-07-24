// Shared helpers for the WAOUH AI Agent module.
// Appels directs à Google Gemini pour le chat et les embeddings.

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_CHAT_MODEL = "gemini-2.5-flash-lite";
const EMBEDDING_MODEL = "gemini-embedding-001";

export function getGeminiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY ou GOOGLE_API_KEY manquant");
  return key;
}

function normalizeModel(model?: string): string {
  const value = String(model || DEFAULT_CHAT_MODEL).replace(/^google\//, "");
  if (/gemini/i.test(value)) return value;
  return DEFAULT_CHAT_MODEL;
}

function textContent(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return String(part.text || "");
      return "";
    }).filter(Boolean).join("\n");
  }
  return String(content || "");
}

function extractText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part: any) => typeof part?.text === "string" ? part.text : "").join("").trim();
}

export async function chatCompletion(opts: {
  model?: string;
  system?: string;
  messages: Array<{ role: string; content: any }>;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<string> {
  const model = normalizeModel(opts.model);
  const contents = (opts.messages || []).map((message) => ({
    role: message.role === "assistant" || message.role === "model" ? "model" : "user",
    parts: [{ text: textContent(message.content).slice(0, 20000) }],
  })).filter((item) => item.parts[0].text.trim());

  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.7,
    maxOutputTokens: 1600,
  };
  if (opts.jsonMode) generationConfig.responseMimeType = "application/json";

  const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getGeminiKey(),
    },
    body: JSON.stringify({
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      contents,
      generationConfig,
    }),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`Gemini chat ${response.status}: ${raw.slice(0, 1000)}`);
  const data = JSON.parse(raw);
  const answer = extractText(data);
  if (!answer) throw new Error(`Gemini chat vide: ${raw.slice(0, 1000)}`);
  return answer;
}

export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(`${GEMINI_API_BASE}/${EMBEDDING_MODEL}:embedContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getGeminiKey(),
    },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: String(text || "").slice(0, 12000) }] },
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: 768,
    }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Gemini embedding ${response.status}: ${raw.slice(0, 1000)}`);
  const data = JSON.parse(raw);
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error("Embedding Gemini vide");
  return values as number[];
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
  const tone = persona.tone || "chaleureux";
  const emojis = persona.emojis !== false;
  const type = agent.agent_type || "commerce";

  if (type === "docs") {
    return `Tu es ${name}, assistant documentaire de "${agent.name}". Tu réponds TOUJOURS en français, avec un ton ${tone}${emojis ? " et quelques emojis discrets" : ""}.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT à partir des FAITS PERTINENTS extraits des documents fournis plus bas.
- Si l'information n'est pas dans les documents, dis exactement : "Je ne trouve pas cette information dans mes documents. Souhaitez-vous que je transmette votre question à ${agent.name} ?"
- Ne jamais inventer, deviner ou compléter avec des connaissances générales.
- Sois court, clair, chaleureux. 1 à 4 phrases max par réponse WhatsApp.
- Ne mentionne jamais que tu es une IA sauf si on te le demande directement.`;
  }

  if (type === "website") {
    const domain = agent.website_url ? new URL(agent.website_url).hostname : "notre site";
    return `Tu es ${name}, assistant en ligne de "${agent.name}" (${domain}). Tu réponds TOUJOURS en français, avec un ton ${tone}${emojis ? " et quelques emojis" : ""}.

RÈGLES ABSOLUES :
- Base-toi UNIQUEMENT sur le contenu de ${domain} présent dans les FAITS PERTINENTS ci-dessous.
- Si l'information n'y figure pas, dis : "Je n'ai pas cette information sur ${domain}. Voulez-vous que je vous mette en contact avec ${agent.name} ?"
- Ne jamais inventer un prix, une adresse ou une politique.
- Réponse WhatsApp : 1 à 4 phrases max.
- Ne mentionne pas que tu es une IA sauf si on te le demande.`;
  }

  const catalog = (products || [])
    .filter((p) => p.active !== false && p.disponible !== false)
    .slice(0, 40)
    .map((p) => {
      const price = p.price_fcfa != null
        ? `${Number(p.price_fcfa).toLocaleString("fr-FR")} FCFA`
        : (p.prix_min != null
          ? (p.prix_max && p.prix_max !== p.prix_min
            ? `${Number(p.prix_min).toLocaleString("fr-FR")}–${Number(p.prix_max).toLocaleString("fr-FR")} FCFA`
            : `${Number(p.prix_min).toLocaleString("fr-FR")} FCFA`)
          : "sur demande");
      const unit = p.unite ? ` / ${p.unite}` : "";
      const stock = p.stock_estime ? ` (stock: ${p.stock_estime})` : "";
      return `- ${p.name || p.nom} (${price}${unit})${stock}${p.description ? ` — ${p.description}` : ""}`;
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

async function loadAgentProducts(supabase: any, agent_id: string): Promise<any[]> {
  const [{ data: legacy }, { data: links }] = await Promise.all([
    supabase.from("waouh_ai_agent_products").select("*").eq("agent_id", agent_id).eq("active", true).order("position"),
    supabase.from("waouh_ai_agent_partner_products").select("product_id").eq("agent_id", agent_id),
  ]);
  let partnerProducts: any[] = [];
  const productIds = (links || []).map((link: any) => link.product_id).filter(Boolean);
  if (productIds.length) {
    const { data } = await supabase
      .from("waouh_partner_products")
      .select("id, nom, description, prix_min, prix_max, unite, stock_estime, disponible, categorie")
      .in("id", productIds);
    partnerProducts = (data || []).map((product: any) => ({
      name: product.nom,
      description: product.description,
      prix_min: product.prix_min,
      prix_max: product.prix_max,
      unite: product.unite,
      stock_estime: product.stock_estime,
      disponible: product.disponible,
      active: product.disponible !== false,
    }));
  }
  return [...partnerProducts, ...(legacy || [])];
}

export async function runAgentTurn(supabase: any, agent_id: string, message: string, opts: {
  history?: Array<{ role: string; content: string }>;
  contact_phone?: string;
  contact_name?: string;
  persist?: boolean;
}) {
  const HANDOFF = /\b(humain|human|patron|urgent|réel|reel|manager|responsable|parler à quelqu)/i;
  const { data: agent } = await supabase.from("waouh_ai_agents").select("*").eq("id", agent_id).maybeSingle();
  if (!agent) throw new Error("agent introuvable");

  if (opts.persist && opts.contact_phone) {
    const paused: string[] = Array.isArray(agent.paused_contacts) ? agent.paused_contacts : [];
    if (paused.includes(opts.contact_phone)) return { reply: "", needs_handoff: false, skipped: true, reason: "contact_paused" };
    const { data: conversation } = await supabase.from("waouh_ai_agent_conversations")
      .select("id, human_takeover, messages").eq("agent_id", agent_id).eq("wa_contact_phone", opts.contact_phone).maybeSingle();
    if (conversation?.human_takeover) {
      const messages = [...((conversation.messages as any[]) || []), { role: "user", content: message, ts: Date.now() }].slice(-40);
      await supabase.from("waouh_ai_agent_conversations").update({ messages, last_activity: new Date().toISOString() }).eq("id", conversation.id);
      return { reply: "", needs_handoff: true, skipped: true, reason: "human_takeover" };
    }
  }

  const products = agent.agent_type === "commerce" || !agent.agent_type ? await loadAgentProducts(supabase, agent_id) : [];
  let context = "";
  try {
    const embedding = await embedText(message);
    const { data: matches } = await supabase.rpc("match_agent_chunks", {
      _agent_id: agent_id,
      _query_embedding: embedding,
      _match_count: 5,
    });
    if (matches?.length) context = "\n\nFAITS PERTINENTS :\n" + matches.map((match: any) => `• ${match.content}`).join("\n");
  } catch (error) { console.error("rag err", error); }

  const system = buildSystemPrompt(agent, products) + context;
  const history = (opts.history || []).slice(-8);
  const reply = await chatCompletion({ system, messages: [...history, { role: "user", content: message }], temperature: 0.6 });
  const needs_handoff = HANDOFF.test(message);

  if (opts.persist && opts.contact_phone) {
    const { data: existing } = await supabase.from("waouh_ai_agent_conversations")
      .select("id, messages, needs_handoff").eq("agent_id", agent_id).eq("wa_contact_phone", opts.contact_phone).maybeSingle();
    const messages = [
      ...(existing?.messages || []),
      { role: "user", content: message, ts: Date.now() },
      { role: "assistant", content: reply, ts: Date.now() },
    ].slice(-40);
    if (existing) {
      await supabase.from("waouh_ai_agent_conversations").update({
        messages,
        last_activity: new Date().toISOString(),
        needs_handoff: existing.needs_handoff || needs_handoff,
      }).eq("id", existing.id);
    } else {
      await supabase.from("waouh_ai_agent_conversations").insert({
        agent_id,
        user_id: agent.user_id,
        wa_contact_phone: opts.contact_phone,
        wa_contact_name: opts.contact_name || null,
        messages,
        needs_handoff,
      });
    }
    await supabase.from("waouh_ai_agents").update({
      stats: {
        ...(agent.stats || {}),
        messages_handled: (agent.stats?.messages_handled || 0) + 1,
        handoffs: (agent.stats?.handoffs || 0) + (needs_handoff ? 1 : 0),
      },
    }).eq("id", agent_id);
  }
  return { reply, needs_handoff };
}
