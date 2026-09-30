// deno-lint-ignore-file no-explicit-any
// WAOUH — Suivi de l'avatar (appel interne planifié). Réservé à la clé service ; sans effet si `nexus_direct_deal` est coupé.
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { isServiceCaller, isTickCaller } from "../_shared/waouh-internal-auth.ts";
import { nexusDirectDealEnabled } from "../_shared/waouh-chat-writer.ts";
import { runNexusFollowUp } from "../_shared/waouh-nexus-followup-core.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  if (!isServiceCaller(req, SERVICE_ROLE) && !(await isTickCaller(req, sb))) return json({ ok: false, code: "service_role_required" }, 401);
  if (!(await nexusDirectDealEnabled(sb))) return json({ ok: true, skipped: "nexus_direct_deal_disabled" });
  const body = await req.json().catch(() => ({}));
  const result = await runNexusFollowUp(sb, { limit: Math.min(200, Math.max(1, Number(body?.limit) || 100)) });
  return json({ ok: true, ...result });
});
