import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const event = await req.json().catch(() => ({}));
    const payload = event?.payload;
    const sessionName = String(event?.session || "").trim();

    if (!sessionName || !payload || payload.fromMe || !["message", "message.any"].includes(String(event?.event || ""))) {
      return new Response("OK", { headers: cors });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: agents, error } = await admin
      .from("waouh_ai_agents")
      .select("id")
      .eq("waha_session_name", sessionName)
      .eq("status", "active")
      .limit(2);
    if (error) {
      console.error("Agent lookup failed", error);
      return new Response("OK", { headers: cors });
    }
    if ((agents || []).length !== 1) {
      if ((agents || []).length > 1) {
        console.error("More than one active Agent IA for WAHA session", sessionName);
      }
      return new Response("OK", { headers: cors });
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/waouh-agent-webhook`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: agents![0].id,
        session: sessionName,
        payload,
      }),
    });
    if (!response.ok) {
      console.error("Agent webhook failed", response.status, await response.text());
    }
    return new Response("OK", { headers: cors });
  } catch (error) {
    console.error("waha-agent-bridge", error);
    return new Response("OK", { headers: cors });
  }
});
