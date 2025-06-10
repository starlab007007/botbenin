
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, password, isAdmin } = await req.json();

    // Créer l'utilisateur avec Supabase Auth
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: isAdmin ? 'Administrateur Test' : 'Utilisateur Test',
        phone: isAdmin ? '+229 97 00 00 01' : '+229 97 00 00 02'
      }
    });

    if (authError && !authError.message.includes('already registered')) {
      throw authError;
    }

    const userId = user?.user?.id;
    if (!userId) {
      throw new Error('Impossible de créer l\'utilisateur');
    }

    // Configurer le rôle
    const roleName = isAdmin ? 'admin' : 'user';
    const { data: role } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (role) {
      await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role_id: role.id });
    }

    // Configurer l'abonnement
    const subscriptionPlan = isAdmin ? 'enterprise' : 'free';
    const maxBots = isAdmin ? 10 : 1;

    await supabaseAdmin
      .from('bot_owners')
      .upsert({
        user_id: userId,
        subscription_plan: subscriptionPlan,
        max_bots: maxBots
      });

    // Mettre à jour les informations utilisateur
    await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        full_name: isAdmin ? 'Administrateur Test' : 'Utilisateur Test',
        phone: isAdmin ? '+229 97 00 00 01' : '+229 97 00 00 02',
        subscription_tier: subscriptionPlan,
        email_verified: true,
        is_active: true
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Compte ${isAdmin ? 'administrateur' : 'utilisateur'} créé avec succès`,
        user: {
          email,
          role: roleName,
          subscription: subscriptionPlan
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
