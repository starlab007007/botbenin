// Ajout d'un message côté guest sur son ticket (via token)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, sha256Hex, clean } from "../_shared/guestTicket.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    const message = clean(body.message, 5000);

    if (typeof token !== "string" || token.length < 16 || token.length > 128) {
      return jsonResponse({ error: "Token invalide" }, 400);
    }
    if (!message) return jsonResponse({ error: "Message requis (max 5000 caractères)" }, 400);

    const tokenHash = await sha256Hex(token);
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: ticket, error } = await supa
      .from("support_tickets")
      .select("id, status, guest_token_expires")
      .eq("guest_token_hash", tokenHash)
      .maybeSingle();

    if (error || !ticket) return jsonResponse({ error: "Ticket introuvable" }, 404);
    if (ticket.guest_token_expires && new Date(ticket.guest_token_expires) < new Date()) {
      return jsonResponse({ error: "Lien expiré" }, 410);
    }
    if (ticket.status === "clos") {
      return jsonResponse({ error: "Ce ticket est clos. Créez-en un nouveau." }, 409);
    }

    const { error: msgErr } = await supa.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: null,
      author_role: "guest",
      message,
      is_internal_note: false,
    });

    if (msgErr) {
      console.error("guest message insert error", msgErr);
      return jsonResponse({ error: msgErr.message }, 500);
    }

    // Si le ticket était résolu, repasser à en_cours
    if (ticket.status === "resolu") {
      await supa
        .from("support_tickets")
        .update({ status: "en_cours" })
        .eq("id", ticket.id);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("support-guest-ticket-message error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
