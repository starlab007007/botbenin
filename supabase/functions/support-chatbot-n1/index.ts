// Support N1 Chatbot — Streaming chat grounded in SIGDSTS Guide knowledge base
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

interface Msg { role: "user" | "assistant"; content: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { messages, sessionId, userId } = (await req.json()) as {
      messages: Msg[];
      sessionId?: string | null;
      userId?: string | null;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull active KB articles for grounding
    const supa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: articles } = await supa
      .from("support_knowledge_articles")
      .select("title, content, module, category")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(50);

    const knowledge = (articles ?? [])
      .map((a, i) => `### ${i + 1}. ${a.title} [${a.module ?? "Général"}]\n${a.content}`)
      .join("\n\n");

    const systemPrompt = `Tu es l'assistant Support Technique Niveau 1 de SIGDSTS — Système d'Information et de Gestion Digitalisée des Services de Transfusion Sanguine de l'ANTS Bénin.

TA MISSION :
- Aider les utilisateurs (médecins, infirmiers, techniciens labo, administrateurs) en répondant aux questions courantes sur l'utilisation de la plateforme.
- Te baser EXCLUSIVEMENT sur le Guide SIGDSTS (extraits ci-dessous). Ne jamais inventer.
- Si la question dépasse ton périmètre OU si l'utilisateur demande explicitement à parler à un humain, tu dois proposer la création d'un ticket vers le support N2.
- Réponses en français, claires, structurées (listes numérotées si possible), concises.
- Termine TOUJOURS par : si la réponse n'a pas résolu le problème, propose : "Souhaitez-vous que j'ouvre un ticket pour le support N2 ?"

TON STYLE :
- Professionnel, bienveillant, rassurant.
- Utilise le markdown : **gras**, listes, étapes numérotées.
- Si tu cites un module, mets son nom en italique.

CRITÈRE D'ESCALADE (ajoute "[ESCALATE_N2]" en fin de réponse, sur une ligne dédiée, SI) :
- L'utilisateur signale un bug bloquant ou critique
- L'utilisateur demande explicitement un agent humain
- Le sujet n'est pas couvert par le Guide
- L'utilisateur a essayé tes solutions sans succès

BASE DE CONNAISSANCES (Guide SIGDSTS v11.0) :

${knowledge}

Réponds maintenant à la question de l'utilisateur.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans une minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Contactez votre administrateur." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      return new Response(JSON.stringify({ error: "Erreur du moteur IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persist session asynchronously after stream (best effort)
    // We let the frontend send back the final assistant text via /support-chatbot-n1/save if needed.
    void (async () => {
      try {
        if (sessionId) {
          await supa
            .from("support_chat_sessions")
            .update({ messages: messages as any, updated_at: new Date().toISOString() })
            .eq("id", sessionId);
        } else {
          await supa
            .from("support_chat_sessions")
            .insert({ user_id: userId ?? null, messages: messages as any });
        }
      } catch (e) {
        console.error("session persist failed", e);
      }
    })();

    return new Response(aiRes.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("support-chatbot-n1 error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
