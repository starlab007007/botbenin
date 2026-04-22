// Create a support ticket on behalf of an authenticated user (or chatbot escalation)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface TicketPayload {
  title: string;
  description: string;
  category?: string;
  severity?: string;
  module?: string;
  site?: string;
  profile?: string;
  reproduction_steps?: string;
  attachments?: any[];
  origin?: string;
  chatbot_session_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentification requise" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });

    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = (await req.json()) as TicketPayload;

    const title = (body.title ?? "").trim();
    const description = (body.description ?? "").trim();
    if (!title || title.length > 200) {
      return new Response(JSON.stringify({ error: "Titre requis (max 200 caractères)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!description || description.length > 5000) {
      return new Response(JSON.stringify({ error: "Description requise (max 5000 caractères)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allowedSeverity = ["critique", "majeure", "mineure"];
    const allowedCategory = ["incident", "anomalie", "evolution", "question"];
    const severity = allowedSeverity.includes(body.severity ?? "") ? body.severity! : "mineure";
    const category = allowedCategory.includes(body.category ?? "") ? body.category! : "incident";

    const insert = {
      user_id: user.id,
      title,
      description,
      category,
      severity,
      module: body.module?.toString().slice(0, 100) ?? null,
      site: body.site?.toString().slice(0, 100) ?? null,
      profile: body.profile?.toString().slice(0, 100) ?? null,
      reproduction_steps: body.reproduction_steps?.toString().slice(0, 5000) ?? null,
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
      origin: body.origin === "chatbot_escalation" ? "chatbot_escalation" : "manual",
      chatbot_session_id: body.chatbot_session_id ?? null,
    };

    const { data: ticket, error } = await supa
      .from("support_tickets")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      console.error("insert error", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SLA event
    await supa.from("support_sla_events").insert({
      ticket_id: ticket.id,
      event_type: "sla_set",
      threshold_minutes: severity === "critique" ? 120 : severity === "majeure" ? 240 : 1440,
    });

    // First message (description)
    await supa.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: user.id,
      author_role: "user",
      message: description,
    });

    // Link chatbot session if applicable
    if (body.chatbot_session_id) {
      await supa
        .from("support_chat_sessions")
        .update({ escalated_ticket_id: ticket.id, resolved: true })
        .eq("id", body.chatbot_session_id);
    }

    return new Response(JSON.stringify({ ticket }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("support-create-ticket error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
