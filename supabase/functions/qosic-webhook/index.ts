import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const webhookData = await req.json();
    
    console.log('Webhook received:', webhookData);

    const { orderId, transactionId, status, amount, operator } = webhookData;

    if (!orderId) {
      throw new Error('Missing orderId in webhook');
    }

    // Find the transaction
    const { data: transaction, error: findError } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (findError || !transaction) {
      console.error('Transaction not found:', orderId);
      throw new Error('Transaction not found');
    }

    console.log('Found transaction:', transaction.id);

    // Map Qosic status to our status
    let newStatus = 'processing';
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      newStatus = 'completed';
    } else if (status === 'FAILED' || status === 'REJECTED') {
      newStatus = 'failed';
    } else if (status === 'CANCELLED') {
      newStatus = 'cancelled';
    }

    // Update transaction
    const { error: updateError } = await supabaseClient
      .from('payment_transactions')
      .update({
        status: newStatus,
        qosic_transaction_id: transactionId || transaction.qosic_transaction_id,
        qosic_response: {
          ...transaction.qosic_response,
          webhook_data: webhookData,
          webhook_received_at: new Date().toISOString(),
        },
        metadata: {
          ...transaction.metadata,
          final_status: status,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        },
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
      throw updateError;
    }

    console.log(`Transaction ${transaction.id} updated to status: ${newStatus}`);

    // TODO: Send notification to user if needed
    // TODO: Update user subscription if payment is completed

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        transactionId: transaction.id,
        status: newStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Webhook processing failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});