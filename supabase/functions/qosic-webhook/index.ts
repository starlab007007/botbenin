import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (level: string, action: string, data: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    function: 'qosic-webhook',
    action,
    ...data
  }));
};

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log('info', 'webhook_received', { 
      method: req.method, 
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()) 
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const webhookData = await req.json();
    
    log('info', 'webhook_data_parsed', { 
      orderId: webhookData.orderId,
      status: webhookData.status,
      transactionId: webhookData.transactionId,
      operator: webhookData.operator,
      amount: webhookData.amount,
      fullPayload: webhookData
    });

    const { orderId, transactionId, status, amount, operator } = webhookData;

    if (!orderId) {
      log('error', 'webhook_validation_failed', { reason: 'Missing orderId' });
      throw new Error('Missing orderId in webhook');
    }

    // Find the transaction
    log('info', 'db_search_start', { orderId });
    
    const { data: transaction, error: findError } = await supabaseClient
      .from('payment_transactions')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (findError || !transaction) {
      log('error', 'transaction_not_found', { orderId, error: findError?.message });
      throw new Error('Transaction not found');
    }

    log('info', 'transaction_found', { 
      orderId, 
      transactionId: transaction.id,
      currentStatus: transaction.status 
    });

    // Map Qosic status to our status
    let newStatus = 'processing';
    if (status === 'SUCCESS' || status === 'COMPLETED') {
      newStatus = 'completed';
    } else if (status === 'FAILED' || status === 'REJECTED') {
      newStatus = 'failed';
    } else if (status === 'CANCELLED') {
      newStatus = 'cancelled';
    }

    log('info', 'status_mapped', { 
      orderId, 
      qosicStatus: status, 
      newStatus,
      previousStatus: transaction.status 
    });

    // Update transaction
    const updateData = {
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
        webhook_processed_at: new Date().toISOString(),
      },
    };

    log('info', 'db_update_start', { orderId, updateData });

    const { error: updateError } = await supabaseClient
      .from('payment_transactions')
      .update(updateData)
      .eq('id', transaction.id);

    if (updateError) {
      log('error', 'db_update_failed', { orderId, error: updateError.message });
      throw updateError;
    }

    const duration = Date.now() - startTime;
    log('info', 'webhook_processed_success', { 
      orderId,
      transactionId: transaction.id,
      newStatus,
      duration_ms: duration 
    });

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

  } catch (error: any) {
    const duration = Date.now() - startTime;
    log('error', 'webhook_processing_failed', { 
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      duration_ms: duration 
    });
    
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
