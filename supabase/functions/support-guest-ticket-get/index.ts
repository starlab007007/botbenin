// Récupération publique d'un ticket guest via son token magique
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse, sha256Hex } from "../_shared/guestTicket.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { token } = await req.json().catch(() => ({}));
    if (typeof token !== "string" || token.length < 16 || token.length > 128) {
      return jsonResponse({ error: "Token invalide" }, 400);
    }

    const tokenHash = await sha256Hex(token);
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: ticket, error } = await supa
      .from("support_tickets")
      .select("*")
      .eq("guest_token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      console.error("get ticket error", error);
      return jsonResponse({ error: "Erreur serveur" }, 500);
    }
    if (!ticket) return jsonResponse({ error: "Ticket introuvable" }, 404);

    if (ticket.guest_token_expires && new Date(ticket.guest_token_expires) < new Date()) {
      return jsonResponse({ error: "Ce lien a expiré (90 jours). Créez un nouveau ticket." }, 410);
    }

    const { data: messages } = await supa
      .from("support_ticket_messages")
      .select("id, author_role, message, created_at")
      .eq("ticket_id", ticket.id)
      .eq("is_internal_note", false)
      .order("created_at", { ascending: true });

    // Ne pas exposer le hash, ni l'éventuel user_id assigné
    const safeTicket = {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      severity: ticket.severity,
      status: ticket.status,
      module: ticket.module,
      site: ticket.site,
      profile: ticket.profile,
      reproduction_steps: ticket.reproduction_steps,
      sla_due_at: ticket.sla_due_at,
      sla_breached: ticket.sla_breached,
      resolved_at: ticket.resolved_at,
      closed_at: ticket.closed_at,
      resolution_summary: ticket.resolution_summary,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      guest_email: ticket.guest_email,
      guest_full_name: ticket.guest_full_name,
      guest_token_expires: ticket.guest_token_expires,
    };

    return jsonResponse({ ticket: safeTicket, messages: messages ?? [] });
  } catch (e) {
    console.error("support-guest-ticket-get error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
