// DOUBLE DE TEST — uniquement pour le projet botbj-test-e2e. Jamais déployé en production.
// Reproduit le contrat de `nexus.contact.send` du cœur agentique (waouh-agentic-core) sur les seuls cas utiles au banc :
// jeton utilisateur requis, confirmation explicite, niveau C0 refusé, contact public requis pour C1, sinon 202.
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (!SUPABASE_URL.includes("ljzwqyzaovnandpyfpgc")) return json({ ok: false, error: { code: "test_double_only" } }, 403);
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  let role = "";
  try { role = JSON.parse(atob(bearer.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role; } catch { /* jeton illisible */ }
  if (role !== "authenticated") return json({ ok: false, error: { code: "auth_required" } }, 401);
  const body = await req.json().catch(() => ({}));
  if (body.action !== "nexus.contact.send") return json({ ok: false, error: { code: "unknown_action" } }, 400);
  const p = body.payload ?? {};
  if (p.confirmed !== true) return json({ ok: false, error: { code: "explicit_confirmation_required" } }, 422);
  const sb = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const { data: signal } = await sb.from("waouh_external_commerce_signals").select("*").eq("id", String(p.fabric_id).replace("external:", "")).maybeSingle();
  if (!signal) return json({ ok: false, error: { code: "nexus_signal_not_found" } }, 404);
  if (["C0"].includes(signal.contactability_level)) return json({ ok: false, error: { code: "contact_not_permitted" } }, 403);
  const { data: contacts } = signal.entity_id
    ? await sb.from("waouh_entity_contacts").select("*").eq("entity_id", signal.entity_id)
    : { data: [] as any[] };
  if (!(contacts ?? []).length) return json({ ok: false, error: { code: "contact_not_found" } }, 404);
  await sb.from("waouh_test_contact_log").insert({ signal_id: signal.id, message: String(p.message).slice(0, 300) });
  return json({ ok: true, data: { queued: true } }, 202);
});
