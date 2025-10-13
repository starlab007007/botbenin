import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, title, content, type, action_url, metadata } = await req.json();

    console.log('📧 Creating notification for user:', user_id);

    // Insérer la notification dans la base de données
    const { data, error } = await supabaseClient
      .from('notifications')
      .insert({
        user_id,
        title,
        content,
        type: type || 'system',
        action_url,
        metadata: metadata || {},
        read: false
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }

    console.log('✅ Notification créée avec succès:', data.id);

    return new Response(JSON.stringify({ success: true, notification: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Error in send-notification function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
