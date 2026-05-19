import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { transaction_id } = await req.json();
    if (!transaction_id) {
      return new Response(JSON.stringify({ error: 'transaction_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Get transaction
    const { data: tx, error: txErr } = await supabase.from('waouh_transactions').select('*').eq('id', transaction_id).single();
    if (txErr || !tx) return new Response(JSON.stringify({ error: 'Transaction not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Check if article belongs to a partner business via unified catalog
    const { data: catEntry } = await supabase.from('waouh_unified_catalog')
      .select('source, partner_id, business_id, source_ref_id')
      .or(`source_ref_id.eq.${tx.article_id}`)
      .maybeSingle();

    if (!catEntry || catEntry.source !== 'partner' || !catEntry.partner_id) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Not a partner sale' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get commission settings
    const { data: settings } = await supabase.from('waouh_commission_settings').select('*').eq('id', 1).single();
    const commPlatPct = Number(settings?.commission_plateforme_pct || 5);
    const commPartPct = Number(settings?.commission_partner_pct_sur_plateforme || 40);

    const amount = Number(tx.negotiated_price || tx.amount || 0);
    const commission_plateforme = amount * commPlatPct / 100;
    const commission_partner = commission_plateforme * commPartPct / 100;

    // Idempotency: check if sale already exists
    const { data: existing } = await supabase.from('waouh_partner_sales').select('id').eq('transaction_id', transaction_id).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ already_attributed: true, sale_id: existing.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: sale, error: saleErr } = await supabase.from('waouh_partner_sales').insert({
      partner_id: catEntry.partner_id,
      business_id: catEntry.business_id,
      product_id: catEntry.source_ref_id,
      transaction_id,
      buyer_phone: null,
      montant_vente: amount,
      commission_plateforme,
      commission_partner,
      statut: tx.status === 'completed' ? 'confirmed' : 'pending',
      source: 'manual',
    }).select().single();

    if (saleErr) throw saleErr;

    return new Response(JSON.stringify({ success: true, sale }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
