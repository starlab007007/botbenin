// Webhook WAHA : reçoit message.ack / message.any / message.failed et met à jour wa_send_jobs.
// Public (verify_jwt=false). Pour sécuriser, on accepte un token optionnel ?t=<WAHA_WEBHOOK_TOKEN>.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// WAHA ACK : ERROR=-1, PENDING=0, SERVER=1 (sent), DEVICE=2 (delivered), READ=3, PLAYED=4
function mapAck(ack: number | string | undefined): { status?: string; field?: string } {
  const n = typeof ack === "string" ? parseInt(ack) : ack;
  switch (n) {
    case 1: return { status: "sent", field: "sent_at" };
    case 2: return { status: "delivered", field: "delivered_at" };
    case 3:
    case 4: return { status: "read", field: "read_at" };
    case -1: return { status: "failed" };
    default: return {};
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const expected = Deno.env.get("WAHA_WEBHOOK_TOKEN");
    if (expected && url.searchParams.get("t") !== expected) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const event: string = body.event ?? body.type ?? "";
    const payload: any = body.payload ?? body.data ?? body;

    // ID de message côté WAHA — formats possibles
    const msgId: string | null =
      payload?.id?._serialized ?? payload?.id ?? payload?.messageId ?? payload?.ack?.id ?? null;
    const ack = payload?.ack ?? payload?.ackName ?? payload?.status;

    // 1) ACK update
    if (event.includes("ack") && msgId) {
      const { status, field } = mapAck(ack);
      if (status) {
        const update: any = { status };
        if (field) update[field] = new Date().toISOString();
        await admin.from("wa_send_jobs").update(update).eq("waha_message_id", msgId);
      }
    }

    // 2) Inbound message (reply) — payload.from is the WA contact
    if ((event.includes("message") && !event.includes("ack")) && payload?.fromMe === false) {
      const from: string = (payload?.from ?? "").toString().replace(/@c\.us$/, "");
      if (from) {
        // chercher le dernier job vers ce numéro non encore "replied"
        const { data: jobs } = await admin.from("wa_send_jobs")
          .select("id, contact_id, campaign_id")
          .eq("to_phone", from)
          .in("status", ["sent", "delivered", "read"])
          .order("sent_at", { ascending: false })
          .limit(1);
        if (jobs && jobs[0]) {
          await admin.from("wa_send_jobs").update({
            status: "replied",
            replied_at: new Date().toISOString(),
          }).eq("id", jobs[0].id);
        }
      }
    }

    // 3) Failed
    if (event.includes("failed") && msgId) {
      await admin.from("wa_send_jobs").update({
        status: "failed",
        last_error: (payload?.error ?? payload?.message ?? "WAHA failure").toString().slice(0, 300),
      }).eq("waha_message_id", msgId);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: corsHeaders });
  }
});
