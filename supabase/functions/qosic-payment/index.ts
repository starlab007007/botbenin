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

    // Get Qosic credentials (same for all operators)
    const username = Deno.env.get('QOSIC_USERNAME');
    const password = Deno.env.get('QOSIC_PASSWORD');
    const clientId = Deno.env.get('QOSIC_CLIENT_ID');
    const baseUrl = Deno.env.get('QOSIC_BASE_URL');

    if (!username || !password || !clientId || !baseUrl) {
      console.error('Missing credentials:', { username: !!username, password: !!password, clientId: !!clientId, baseUrl: !!baseUrl });
      throw new Error('Missing Qosic credentials');
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

    // Clean phone number (remove all non-numeric characters)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Validate phone format (should be 229XXXXXXXX for Benin)
    if (!/^229\d{8}$/.test(cleanPhone)) {
      console.warn('Invalid phone format:', cleanPhone);
    }

    // Split full name into first and last name
    const nameParts = (fullName || 'Client').split(' ');
    const firstname = nameParts[0] || 'Client';
    const lastname = nameParts.slice(1).join(' ') || '';

    // Prepare Qosic API request according to official documentation
    const qosicPayload = {
      msisdn: cleanPhone,
      amount: amount.toString(), // Amount as string
      firstname: firstname,
      lastname: lastname,
      transref: orderId,
      clientid: clientId,
      comment: planName || 'Abonnement Bot.BJ',
    };

    console.log('=== QOSIC PAYMENT REQUEST ===');
    console.log('Operator:', operator);
    console.log('Phone (cleaned):', cleanPhone);
    console.log('Amount:', amount);
    console.log('Transaction ref:', orderId);
    console.log('Payload:', JSON.stringify(qosicPayload, null, 2));

    // Call Qosic API with correct endpoint
    const qosicUrl = `${baseUrl}/QosicBridge/user/requestpayment`;
    
    // Basic authentication with username:password
    const authString = btoa(`${username}:${password}`);
    
    console.log('Request URL:', qosicUrl);

    const qosicResponse = await fetch(qosicUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(qosicPayload),
    });

    const qosicData = await qosicResponse.json();

    console.log('=== QOSIC API RESPONSE ===');
    console.log('Status:', qosicResponse.status);
    console.log('Response:', JSON.stringify(qosicData, null, 2));

    // Update transaction with Qosic response
    const updateData: any = {
      qosic_response: qosicData,
      metadata: {
        ...transaction.metadata,
        qosic_response_at: new Date().toISOString(),
        operator: operator,
        cleaned_phone: cleanPhone,
      },
    };

    // Check Qosic response code (00 or 0 = success)
    const responseCode = qosicData.responsecode || qosicData.responseCode || '';
    const isSuccess = responseCode === '00' || responseCode === '0';

    if (qosicResponse.ok && isSuccess) {
      updateData.status = 'processing';
      updateData.qosic_transaction_id = qosicData.transref || qosicData.transactionId || qosicData.id;
      console.log('✅ Payment initiated successfully');
    } else {
      updateData.status = 'failed';
      console.error('❌ Payment failed:', qosicData.message || 'Unknown error');
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