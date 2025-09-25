import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MomoRequestBody {
  amount: number;
  currency: string; // e.g. XOF
  phoneNumber: string;
  customerName?: string;
  planName?: string;
}

const getEnv = (k: string) => Deno.env.get(k);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: MomoRequestBody = await req.json();
    const { amount, currency, phoneNumber, customerName, planName } = body;

    // Basic validation
    if (!amount || !currency || !phoneNumber) {
      return new Response(JSON.stringify({ status: 'error', message: 'amount, currency et phoneNumber sont requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if secrets are configured
    const subscriptionKey = getEnv('MOMO_COLLECTION_SUBSCRIPTION_KEY');
    const baseUrl = getEnv('MOMO_COLLECTION_BASE_URL'); // ex: https://sandbox.momodeveloper.mtn.com/collection
    const targetEnv = getEnv('MOMO_TARGET_ENV') || 'sandbox';

    if (!subscriptionKey || !baseUrl) {
      // Demo fallback — no real payment
      console.log('[MTN-MOMO] Demo mode — missing secrets');
      return new Response(
        JSON.stringify({ status: 'pending', demo: true, message: 'Mode démo: simulateur de paiement initialisé', amount, currency, phoneNumber, planName }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    // Real flow skeleton (non-executed without complete credentials)
    try {
      // In a real integration, you would:
      // 1) Obtain access token if required (for sandbox collections, API key/user flow)
      // 2) Create a payment request to /v1_0/requesttopay
      // 3) Return the reference id to poll status
      // Here we just return a placeholder response to avoid exposing secrets logic
      console.log('[MTN-MOMO] Secrets present. Returning placeholder pending status.');
      return new Response(
        JSON.stringify({ status: 'pending', message: 'Paiement envoyé. Confirmez sur votre téléphone.', amount, currency, phoneNumber, planName, env: targetEnv }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    } catch (err) {
      console.error('[MTN-MOMO] error', err);
      return new Response(JSON.stringify({ status: 'error', message: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
  } catch (e) {
    console.error('[MTN-MOMO] parse error', e);
    return new Response(JSON.stringify({ status: 'error', message: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
  }
};

serve(handler);
