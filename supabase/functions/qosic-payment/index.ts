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

const log = (level: string, action: string, data: any) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    function: 'qosic-payment',
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
    log('info', 'request_received', { method: req.method, url: req.url });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Try to get authenticated user
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        userId = user?.id || null;
        log('info', 'user_authenticated', { userId });
      } catch (authError) {
        log('warn', 'auth_failed', { error: authError.message });
      }
    } else {
      log('info', 'guest_payment', { note: 'No auth header provided' });
    }

    // Parse request body
    const requestBody: PaymentRequest = await req.json();
    log('info', 'request_parsed', { 
      operator: requestBody.operator, 
      amount: requestBody.amount,
      hasFullName: !!requestBody.fullName,
      planName: requestBody.planName 
    });

    // Validation
    const { amount, phoneNumber, fullName, planName, operator } = requestBody;
    
    if (!amount || amount <= 0) {
      log('error', 'validation_failed', { field: 'amount', value: amount });
      throw new Error('Montant invalide');
    }
    
    if (!phoneNumber) {
      log('error', 'validation_failed', { field: 'phoneNumber', value: 'missing' });
      throw new Error('Numéro de téléphone requis');
    }

    if (!['MTN', 'MOOV', 'SBIN'].includes(operator)) {
      log('error', 'validation_failed', { field: 'operator', value: operator });
      throw new Error('Opérateur invalide');
    }

    log('info', 'validation_passed', { operator, amount, phoneNumber: phoneNumber.substring(0, 6) + '***' });

    // Get Qosic credentials from environment
    const qosicUsername = Deno.env.get('QOSIC_USERNAME');
    const qosicPassword = Deno.env.get('QOSIC_PASSWORD');
    const clientIdMap = {
      'MTN': Deno.env.get('QOSIC_MTN_CLIENT_ID'),
      'MOOV': Deno.env.get('QOSIC_MOOV_CLIENT_ID'),
      'SBIN': Deno.env.get('QOSIC_SBIN_CLIENT_ID'),
    };
    const clientId = clientIdMap[operator];

    if (!qosicUsername || !qosicPassword || !clientId) {
      log('error', 'config_missing', { operator, hasUsername: !!qosicUsername, hasPassword: !!qosicPassword, hasClientId: !!clientId });
      throw new Error('Configuration Qosic manquante');
    }

    log('info', 'config_loaded', { operator, clientId: clientId.substring(0, 8) + '***' });

    // Generate unique order ID
    const orderId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    log('info', 'order_id_generated', { orderId });

    // IMPORTANT: Map operator to payment_method matching DB CHECK constraint
    // - MTN → 'mtn_momo'
    // - MOOV → 'moov_money'  
    // - SBIN → 'sbin'
    const paymentMethodMap = {
      'MTN': 'mtn_momo',
      'MOOV': 'moov_money',
      'SBIN': 'sbin'
    } as const;

    const paymentMethod = paymentMethodMap[operator];
    
    if (!paymentMethod) {
      log('error', 'invalid_operator_mapping', { operator });
      throw new Error(`Opérateur invalide: ${operator}`);
    }

    // Insert transaction record
    log('info', 'db_insert_start', { orderId, paymentMethod });
    const { data: transaction, error: insertError } = await supabaseClient
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        user_id: userId,
        amount,
        currency: 'XOF',
        phone_number: phoneNumber,
        full_name: fullName || null,
        plan_name: planName || null,
        status: 'pending',
        payment_method: paymentMethod,
        operator: operator,
        metadata: {
          created_at: new Date().toISOString(),
          request_source: 'web_app'
        }
      })
      .select()
      .single();

    if (insertError) {
      log('error', 'db_insert_failed', { orderId, error: insertError.message });
      throw new Error(`Erreur DB: ${insertError.message}`);
    }

    log('info', 'db_insert_success', { orderId, transactionId: transaction.id });

    // Clean and validate phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (!/^229\d{8}$/.test(cleanPhone)) {
      log('error', 'phone_validation_failed', { orderId, phoneFormat: cleanPhone.substring(0, 6) + '***' });
      throw new Error('Format de téléphone invalide (doit être 229XXXXXXXX)');
    }

    log('info', 'phone_validated', { orderId, phonePrefix: cleanPhone.substring(0, 6) + '***' });

    // Check for test mode - Désactivé par défaut pour les tests en production
    const testMode = Deno.env.get('QOSIC_TEST_MODE') === 'true';
    
    if (testMode) {
      // ⚠️ TEST MODE: Simulate successful payment response
      log('warn', 'test_mode_active', { 
        orderId, 
        message: '⚠️ MODE TEST ACTIVÉ - Simulation de paiement réussi',
        operator,
        amount,
        note: 'SSL certificate error workaround'
      });
      
      const qosicData = {
        success: true,
        status: 'completed',
        transactionId: `TEST_${orderId}`,
        message: 'Paiement simulé avec succès (MODE TEST)'
      };
      
      // Update transaction status to completed in test mode
      const { error: updateError } = await supabaseClient
        .from('payment_transactions')
        .update({
          status: 'completed',
          qosic_transaction_id: qosicData.transactionId,
          qosic_response: qosicData,
          metadata: {
            ...transaction.metadata,
            test_mode: true,
            completed_at: new Date().toISOString(),
            simulated_response: qosicData,
            note: 'Simulated payment due to Qosic SSL certificate issue'
          }
        })
        .eq('id', transaction.id);

      if (updateError) {
        log('error', 'db_update_failed_test_mode', { orderId, error: updateError.message });
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }
      
      log('info', 'test_payment_completed', { orderId, transactionId: qosicData.transactionId });
      
      const duration = Date.now() - startTime;
      
      return new Response(
        JSON.stringify({
          success: true,
          orderId: orderId,
          transactionId: transaction.id,
          qosicTransactionId: qosicData.transactionId,
          status: 'completed',
          message: qosicData.message,
          testMode: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // PRODUCTION MODE: Real API call
    const qosicBaseUrl = 'https://qosic.net';
    
    // Map operator to correct endpoint
    const endpointMap = {
      'MTN': `${qosicBaseUrl}/QosicBridge/user/requestpayment`,
      'MOOV': `${qosicBaseUrl}/QosicBridge/user/requestpaymentmv`,
      'SBIN': `${qosicBaseUrl}/QosicBridge/sb/v1/requestpayment`
    };
    
    const apiEndpoint = endpointMap[operator];
    
    const qosicPayload = {
      clientId: clientId,
      amount: amount,
      msisdn: cleanPhone,
      orderId: orderId,
      description: planName ? `Paiement ${planName}` : 'Paiement',
    };

    log('info', 'qosic_api_call_start', { orderId, operator, endpoint: apiEndpoint });

    // Call Qosic API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const qosicResponse = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${qosicUsername}:${qosicPassword}`)}`,
        },
        body: JSON.stringify(qosicPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await qosicResponse.text();
      log('info', 'qosic_api_response_received', { 
        orderId, 
        status: qosicResponse.status, 
        responseLength: responseText.length 
      });

      let qosicData;
      try {
        qosicData = JSON.parse(responseText);
      } catch {
        log('error', 'qosic_response_parse_failed', { orderId, responseText: responseText.substring(0, 200) });
        throw new Error('Réponse API invalide');
      }

      log('info', 'qosic_response_parsed', { 
        orderId, 
        success: qosicData.success, 
        hasTransactionId: !!qosicData.transactionId 
      });

      // Update transaction with Qosic response
      const updateData = {
        status: qosicResponse.ok && qosicData.success ? 'processing' : 'failed',
        qosic_transaction_id: qosicData.transactionId || null,
        qosic_response: qosicData,
        metadata: {
          ...transaction.metadata,
          qosic_status: qosicData.status,
          qosic_message: qosicData.message,
          updated_at: new Date().toISOString(),
        }
      };

      log('info', 'db_update_start', { orderId, newStatus: updateData.status });

      const { error: updateError } = await supabaseClient
        .from('payment_transactions')
        .update(updateData)
        .eq('id', transaction.id);

      if (updateError) {
        log('error', 'db_update_failed', { orderId, error: updateError.message });
        throw new Error(`Erreur mise à jour: ${updateError.message}`);
      }

      log('info', 'db_update_success', { orderId, finalStatus: updateData.status });

      const duration = Date.now() - startTime;
      log('info', 'payment_completed', { orderId, status: updateData.status, duration_ms: duration });

      return new Response(
        JSON.stringify({
          success: qosicResponse.ok && qosicData.success,
          orderId: orderId,
          transactionId: transaction.id,
          qosicTransactionId: qosicData.transactionId,
          status: updateData.status,
          message: qosicData.message || 'Paiement initié',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle SSL certificate errors specifically
      if (String(fetchError.message).includes('invalid peer certificate') || 
          String(fetchError.message).includes('Expired')) {
        log('error', 'ssl_certificate_error', { 
          orderId,
          message: 'Certificat SSL Qosic expiré',
          error: fetchError.message,
          recommendation: 'Activer QOSIC_TEST_MODE pour contourner temporairement'
        });
        
        // Update transaction with clear error message
        await supabaseClient
          .from('payment_transactions')
          .update({
            status: 'failed',
            metadata: {
              ...transaction.metadata,
              error: 'Service temporairement indisponible (certificat SSL expiré)',
              error_type: 'ssl_certificate_expired',
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', transaction.id);
          
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Service de paiement temporairement indisponible. Veuillez réessayer plus tard.',
            technical_details: 'SSL certificate expired on Qosic server',
            orderId
          }),
          { status: 503, headers: corsHeaders }
        );
      }
      
      if (fetchError.name === 'AbortError') {
        log('error', 'qosic_api_timeout', { orderId, timeout: '30s' });
        throw new Error('Timeout lors de l\'appel à Qosic');
      }
      
      log('error', 'qosic_api_call_failed', { orderId, error: fetchError.message });
      throw fetchError;
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    log('error', 'payment_failed', { 
      error: error.message, 
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      duration_ms: duration 
    });
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Erreur lors du traitement du paiement',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
