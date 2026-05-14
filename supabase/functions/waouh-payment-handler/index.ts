import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { article_id, buyer_phone, amount, payment_method = 'momo', action = 'initiate' } = await req.json();
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (action === 'initiate') {
      const { data: article } = await supabase.from('waouh_articles').select('*, seller:waouh_users!seller_id(*)').eq('id', article_id).single();
      if (!article) return new Response(JSON.stringify({ error: 'article not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const { data: buyer } = await supabase.from('waouh_users').select('*').eq('phone', buyer_phone).maybeSingle();
      const buyerId = buyer?.id || (await supabase.from('waouh_users').insert({ phone: buyer_phone }).select().single()).data?.id;

      const finalAmount = amount || article.price;
      const commission = Math.round(finalAmount * 0.03);

      const { data: tx, error } = await supabase.from('waouh_transactions').insert({
        article_id,
        seller_id: article.seller_id,
        buyer_id: buyerId,
        amount: finalAmount,
        currency: 'XOF',
        commission,
        payment_method,
        escrow_status: 'pending',
        status: 'initiated',
        negotiated_price: amount && amount !== article.price ? amount : null,
      }).select().single();
      if (error) throw error;

      // TODO: call Qosic edge function to initiate MoMo
      return new Response(JSON.stringify({
        success: true,
        transaction: tx,
        reply: `💳 Paiement initié\n💰 ${finalAmount} FCFA (commission ${commission})\n📲 Confirme sur ton téléphone Mobile Money`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'confirm') {
      const { transaction_id } = await req.json();
      await supabase.from('waouh_transactions').update({ escrow_status: 'held', status: 'paid' }).eq('id', transaction_id);
      return new Response(JSON.stringify({ success: true, reply: '✅ Paiement reçu, fonds bloqués en escrow.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'release') {
      const { transaction_id } = await req.json();
      await supabase.from('waouh_transactions').update({ escrow_status: 'released', status: 'completed', completed_at: new Date().toISOString() }).eq('id', transaction_id);
      return new Response(JSON.stringify({ success: true, reply: '🎉 Fonds libérés au vendeur.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
