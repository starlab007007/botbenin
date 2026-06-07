// Bulk notify radar contacts via waouh_enqueue_outbound_v2 (WhatsApp).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function assertAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new Response("Unauthorized", { status: 401 });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw new Response("Unauthorized", { status: 401 });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) throw new Response("Forbidden", { status: 403 });
  return { admin, userId: user.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { admin } = await assertAdmin(req);
    const body = await req.json();
    const contactIds: string[] = body.contact_ids || [];
    const message: string = (body.message || "").toString();
    const articleId: string | null = body.article_id || null;
    const mode: string = body.mode || "announcement"; // buyer | seller | announcement
    const eventType = `radar_${mode}`;

    if (!contactIds.length || !message.trim()) {
      return new Response(JSON.stringify({ error: "contact_ids et message requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: contacts } = await admin
      .from("waouh_radar_contacts")
      .select("id, phone_e164, status, display_name")
      .in("id", contactIds);

    let queued = 0, skipped = 0;
    const errors: any[] = [];

    for (const c of contacts || []) {
      if (["opted_out", "blocked"].includes(c.status)) { skipped++; continue; }
      try {
        const dedup = `radar:${mode}:${c.id}:${Date.now()}`;
        const { error } = await admin.rpc("waouh_enqueue_outbound_v2" as any, {
          p_to_phone: c.phone_e164,
          p_template: "radar_broadcast",
          p_payload: { text: message, article_id: articleId, contact_id: c.id, mode },
          p_event_type: eventType,
          p_dedupe_key: dedup,
          p_transaction_id: null,
          p_article_id: articleId,
        });
        if (error) { errors.push({ contact_id: c.id, error: error.message }); continue; }
        await admin.from("waouh_radar_contacts").update({ last_message_at: new Date().toISOString() }).eq("id", c.id);
        queued++;
      } catch (e: any) {
        errors.push({ contact_id: c.id, error: e.message });
      }
    }

    // Trigger dispatch
    fetch(`${SUPABASE_URL}/functions/v1/waouh-notify-dispatch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 50 }),
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, queued, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error("[waouh-radar-contacts-notify]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
