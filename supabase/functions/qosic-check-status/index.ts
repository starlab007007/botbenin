import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusCheckPayload {
  transref?: string;
  checkAll?: boolean;
}

interface QosicStatusResponse {
  responsecode: string;
  responsemsg: string;
  transref: string;
  comment: string;
}

// Map Qosic response codes to our internal statuses
function mapQosicStatusToDbStatus(responsecode: string): string {
  switch (responsecode) {
    case '00':
      return 'completed';
    case '01':
      return 'processing';
    default:
      return 'failed';
  }
}

function log(level: string, message: string, data?: any) {
  console.log(JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...data }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: StatusCheckPayload = await req.json();
    log('info', 'status_check_initiated', { payload });

    // Get Qosic configuration
    const qosicBaseUrl = Deno.env.get('QOSIC_BASE_URL');
    const qosicUsername = Deno.env.get('QOSIC_USERNAME');
    const qosicPassword = Deno.env.get('QOSIC_PASSWORD');

    if (!qosicBaseUrl || !qosicUsername || !qosicPassword) {
      throw new Error('Missing Qosic configuration');
    }

    const basicAuth = btoa(`${qosicUsername}:${qosicPassword}`);

    // Get transactions to check
    let transactionsToCheck: any[] = [];

    if (payload.transref) {
      // Check specific transaction
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('order_id', payload.transref)
        .single();

      if (error) throw error;
      if (data) transactionsToCheck = [data];
    } else if (payload.checkAll) {
      // Check all processing transactions older than 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('status', 'processing')
        .lt('created_at', thirtySecondsAgo);

      if (error) throw error;
      transactionsToCheck = data || [];
    } else {
      throw new Error('Must provide either transref or checkAll');
    }

    log('info', 'transactions_to_check', { count: transactionsToCheck.length });

    const results = [];

    for (const transaction of transactionsToCheck) {
      try {
        // Get the correct client ID for the operator
        let clientId: string;
        if (transaction.payment_method === 'mtn_momo') {
          clientId = Deno.env.get('QOSIC_MTN_CLIENT_ID') || '';
        } else if (transaction.payment_method === 'moov_money') {
          clientId = Deno.env.get('QOSIC_MOOV_CLIENT_ID') || '';
        } else {
          clientId = Deno.env.get('QOSIC_SBIN_CLIENT_ID') || '';
        }

        log('info', 'checking_transaction_status', {
          order_id: transaction.order_id,
          payment_method: transaction.payment_method,
        });

        // Call Qosic status check API
        const statusResponse = await fetch(
          `${qosicBaseUrl}/QosicBridge/user/gettransactionstatusV2`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${basicAuth}`,
            },
            body: JSON.stringify({
              transref: transaction.order_id,
              clientid: clientId,
            }),
          }
        );

        if (!statusResponse.ok) {
          throw new Error(`Qosic API error: ${statusResponse.status}`);
        }

        const statusData: QosicStatusResponse = await statusResponse.json();
        log('info', 'qosic_status_response', { 
          order_id: transaction.order_id,
          responsecode: statusData.responsecode,
          responsemsg: statusData.responsemsg,
        });

        // Map Qosic status to DB status
        const newStatus = mapQosicStatusToDbStatus(statusData.responsecode);

        // Only update if status changed
        if (newStatus !== transaction.status) {
          const { error: updateError } = await supabase
            .from('payment_transactions')
            .update({
              status: newStatus,
              metadata: {
                ...transaction.metadata,
                last_status_check: new Date().toISOString(),
                qosic_status_response: statusData,
              },
            })
            .eq('order_id', transaction.order_id);

          if (updateError) {
            log('error', 'update_failed', { order_id: transaction.order_id, error: updateError });
          } else {
            log('info', 'status_updated', {
              order_id: transaction.order_id,
              old_status: transaction.status,
              new_status: newStatus,
            });
          }
        }

        results.push({
          order_id: transaction.order_id,
          old_status: transaction.status,
          new_status: newStatus,
          qosic_response: statusData,
          updated: newStatus !== transaction.status,
        });
      } catch (error) {
        log('error', 'transaction_check_failed', {
          order_id: transaction.order_id,
          error: error.message,
        });
        results.push({
          order_id: transaction.order_id,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: transactionsToCheck.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    log('error', 'status_check_error', { error: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
