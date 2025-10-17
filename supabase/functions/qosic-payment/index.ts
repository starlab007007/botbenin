import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  phoneNumber: string;
  fullName?: string;
  planName?: string;
  operator: 'MTN' | 'MOOV' | 'SBIN';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Try to get authenticated user, but don't require it
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id || null;
    }

    const { amount, phoneNumber, fullName, planName, operator }: PaymentRequest = await req.json();

    // Validate input
    if (!amount || !phoneNumber || !operator) {
      throw new Error('Missing required fields');
    }

    // Get operator-specific credentials
    const getCredentials = () => {
      const username = Deno.env.get('QOSIC_USERNAME');
      
      switch (operator) {
        case 'MTN':
          return {
            clientId: Deno.env.get('QOSIC_MTN_CLIENT_ID'),
            clientSecret: Deno.env.get('QOSIC_MTN_CLIENT_SECRET'),
            username,
          };
        case 'MOOV':
          return {
            clientId: Deno.env.get('QOSIC_MOOV_CLIENT_ID'),
            clientSecret: Deno.env.get('QOSIC_MOOV_CLIENT_SECRET'),
            username,
          };
        case 'SBIN':
          return {
            clientId: Deno.env.get('QOSIC_SBIN_CLIENT_ID'),
            clientSecret: Deno.env.get('QOSIC_SBIN_CLIENT_SECRET'),
            username,
          };
        default:
          throw new Error('Invalid operator');
      }
    };

    const credentials = getCredentials();

    if (!credentials.clientId || !credentials.clientSecret || !credentials.username) {
      throw new Error(`Missing ${operator} credentials`);
    }

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`Initiating ${operator} payment for order ${orderId}`);

    // Create transaction record in database
    const transactionData: any = {
      order_id: orderId,
      amount,
      currency: 'XOF',
      phone_number: phoneNumber,
      full_name: fullName,
      plan_name: planName,
      status: 'pending',
      payment_method: operator.toLowerCase() === 'mtn' ? 'mtn_momo' : operator.toLowerCase() === 'moov' ? 'moov_money' : 'sbin',
      operator,
      metadata: {
        initiated_at: new Date().toISOString(),
        is_guest: !userId,
      },
    };

    // Add user_id only if user is authenticated
    if (userId) {
      transactionData.user_id = userId;
    }

    const { data: transaction, error: dbError } = await supabaseClient
      .from('payment_transactions')
      .insert(transactionData)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to create transaction record');
    }

    console.log('Transaction record created:', transaction.id);

    // Prepare Qosic API request
    const qosicPayload = {
      recipient: phoneNumber,
      amount: amount,
      orderId: orderId,
      description: planName || 'Payment',
    };

    console.log('Qosic payload:', qosicPayload);

    // Call Qosic API
    const qosicUrl = `https://api.qosic.com/v1/payments/${operator.toLowerCase()}`;
    
    const authString = btoa(`${credentials.clientId}:${credentials.clientSecret}`);
    
    const qosicResponse = await fetch(qosicUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
        'X-Username': credentials.username,
      },
      body: JSON.stringify(qosicPayload),
    });

    const qosicData = await qosicResponse.json();

    console.log('Qosic response:', qosicData);

    // Update transaction with Qosic response
    const updateData: any = {
      qosic_response: qosicData,
      metadata: {
        ...transaction.metadata,
        qosic_response_at: new Date().toISOString(),
      },
    };

    if (qosicResponse.ok) {
      updateData.status = 'processing';
      updateData.qosic_transaction_id = qosicData.transactionId || qosicData.id;
    } else {
      updateData.status = 'failed';
    }

    const { error: updateError } = await supabaseClient
      .from('payment_transactions')
      .update(updateData)
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
    }

    if (!qosicResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: qosicData.message || 'Payment initiation failed',
          orderId,
          transactionId: transaction.id,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment initiated successfully',
        orderId,
        transactionId: transaction.id,
        qosicTransactionId: qosicData.transactionId || qosicData.id,
        status: 'processing',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Payment error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'An error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});