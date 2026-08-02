import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const checks: Record<string, boolean> = {};
  const failures: Record<string, string> = {};
  for (const [name, table, columns] of [
    ["threads", "waouh_chat_threads", "id,thread_key,thread_type,status"],
    ["messages", "waouh_messages", "id,thread_id"],
    ["notifications", "waouh_notifications", "id,thread_id"],
    ["negotiations", "waouh_negotiations", "id,thread_id"],
    ["deals", "waouh_deals", "id,thread_id"],
    ["transactions", "waouh_transactions", "id,thread_id"],
    ["interests", "waouh_interests", "id,thread_id"],
    ["radar_matches", "waouh_radar_matches", "id,thread_id"],
    ["radar_signals", "waouh_radar_signals", "id,thread_id"],
  ] as const) {
    const { error } = await sb.from(table).select(columns).limit(1);
    checks[name] = !error;
    if (error) failures[name] = error.message;
  }
  const critical = [
    "threads", "messages", "notifications", "negotiations",
    "deals", "transactions", "interests",
  ];
  const ok = critical.every((name) => checks[name] === true);
  const fullySynced = Object.values(checks).every(Boolean);
  return new Response(JSON.stringify({
    ok,
    fully_synced: fullySynced,
    schema: "waouh_chat_status_radar_v19",
    checks,
    failures: ok ? {} : failures,
    warnings: fullySynced ? {} : Object.fromEntries(
      Object.entries(failures).filter(([name]) => !critical.includes(name)),
    ),
    checked_at: new Date().toISOString(),
  }), { status: ok ? 200 : 503, headers });
});
