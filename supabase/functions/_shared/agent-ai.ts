// Shared helpers for the WAOUH AI Agent module (WhatsApp).
// - Lovable AI Gateway calls (chat, embeddings, STT, vision)
// - System-prompt builder per agent (commerce / docs / website)
// - runAgentTurn: unified turn logic with partner-products join and takeover awareness

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

// Build a system prompt tailored to the agent_type.
export function buildSystemPrompt(agent: any, products: any[] = []): string {
  const persona = agent.persona || {};
  const caps = agent.capabilities || {};
  const name = persona.name || agent.name || "Assistant";
  const tone = persona.tone || "chaleureux";
  const emojis = persona.emojis !== false;
  const type = agent.agent_type || "commerce";

  // DOCS mode — strict RAG on uploaded documents.
  if (type === "docs") {
    return `Tu es ${name}, assistant documentaire de "${agent.name}". Tu réponds TOUJOURS en français, avec un ton ${tone}${emojis ? " et quelques emojis discrets" : ""}.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT à partir des FAITS PERTINENTS extraits des documents fournis plus bas.
- Si l'information n'est pas dans les documents, dis exactement : "Je ne trouve pas cette information dans mes documents. Souhaitez-vous que je transmette votre question à ${agent.name} ?"
- Ne jamais inventer, deviner ou compléter avec des connaissances générales.
- Sois court, clair, chaleureux. 1 à 4 phrases max par réponse WhatsApp.
- Ne mentionne jamais que tu es une IA sauf si on te le demande directement.`;
  }

  // WEBSITE mode — restricted to a domain's content.
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

  // COMMERCE mode (default) — with product catalog.
  const catalog = (products || [])
    .filter((p) => p.active !== false && p.disponible !== false)
    .slice(0, 40)
    .map((p) => {
      const price =
        p.price_fcfa != null
          ? `${Number(p.price_fcfa).toLocaleString("fr-FR")} FCFA`
          : (p.prix_min != null
            ? (p.prix_max && p.prix_max !== p.prix_min
                ? `${Number(p.prix_min).toLocaleString("fr-FR")}–${Number(p.prix_max).toLocaleString("fr-FR")} FCFA`
                : `${Number(p.prix_min).toLocaleString("fr-FR")} FCFA`)
            : "sur demande");
      const unit = p.unite ? ` / ${p.unite}` : "";
      const stock = p.stock_estime ? ` (stock: ${p.stock_estime})` : "";
      return `- ${p.name || p.nom} (${price}${unit})${stock}${(p.description ? ` — ${p.description}` : "")}`;
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

// Load products for a commerce agent from BOTH sources:
// - New link table `waouh_ai_agent_partner_products` -> `waouh_partner_products`
// - Legacy `waouh_ai_agent_products` (backwards compat)
async function loadAgentProducts(supabase: any, agent_id: string): Promise<any[]> {
  const [{ data: legacy }, { data: links }] = await Promise.all([
    supabase.from("waouh_ai_agent_products").select("*").eq("agent_id", agent_id).eq("active", true).order("position"),
    supabase.from("waouh_ai_agent_partner_products").select("product_id").eq("agent_id", agent_id),
  ]);
  let partnerProducts: any[] = [];
  const productIds = (links || []).map((l: any) => l.product_id).filter(Boolean);
  if (productIds.length) {
    const { data: pp } = await supabase
      .from("waouh_partner_products")
      .select("id, nom, description, prix_min, prix_max, unite, stock_estime, disponible, categorie")
      .in("id", productIds);
    partnerProducts = (pp || []).map((p: any) => ({
      name: p.nom,
      description: p.description,
      prix_min: p.prix_min,
      prix_max: p.prix_max,
      unite: p.unite,
      stock_estime: p.stock_estime,
      disponible: p.disponible,
      active: p.disponible !== false,
    }));
  }
  return [...partnerProducts, ...(legacy || [])];
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

  // Contact-level pause check (WhatsApp path)
  if (opts.persist && opts.contact_phone) {
    const paused: string[] = Array.isArray(agent.paused_contacts) ? agent.paused_contacts : [];
    if (paused.includes(opts.contact_phone)) {
      return { reply: "", needs_handoff: false, skipped: true, reason: "contact_paused" };
    }
    // Existing conversation in human takeover mode: don't reply, just log inbound
    const { data: convCheck } = await supabase.from("waouh_ai_agent_conversations")
      .select("id, human_takeover, messages").eq("agent_id", agent_id).eq("wa_contact_phone", opts.contact_phone).maybeSingle();
    if (convCheck?.human_takeover) {
      const newMsgs = [
        ...((convCheck.messages as any[]) || []),
        { role: "user", content: message, ts: Date.now() },
      ].slice(-40);
      await supabase.from("waouh_ai_agent_conversations").update({
        messages: newMsgs, last_activity: new Date().toISOString(),
      }).eq("id", convCheck.id);
      return { reply: "", needs_handoff: true, skipped: true, reason: "human_takeover" };
    }
  }

  const products = agent.agent_type === "commerce" || !agent.agent_type
    ? await loadAgentProducts(supabase, agent_id)
    : [];

  let context = "";
  try {
    const emb = await embedText(message);
    const { data: matches } = await supabase.rpc("match_agent_chunks", {
      _agent_id: agent_id, _query_embedding: emb, _match_count: 5,
    });
    if (matches?.length) context = "\n\nFAITS PERTINENTS :\n" + matches.map((m: any) => `• ${m.content}`).join("\n");
  } catch (e) { console.error("rag err", e); }

  const system = buildSystemPrompt(agent, products) + context;
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
