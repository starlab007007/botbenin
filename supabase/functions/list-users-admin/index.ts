import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Vérifier que l'utilisateur est authentifié
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Vérifier que l'utilisateur a la permission users.view
    const { data: hasPermission, error: permError } = await supabaseClient
      .rpc('user_has_permission', { 
        user_uuid: user.id, 
        permission_name: 'users.view' 
      });

    if (permError || !hasPermission) {
      return new Response(JSON.stringify({ error: 'Permission refusée' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Lister tous les utilisateurs
    const { data: authUsers, error: listError } = await supabaseClient.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    // Récupérer les rôles de chaque utilisateur
    const usersWithRoles = await Promise.all(
      (authUsers.users || []).map(async (authUser) => {
        const { data: userRoles } = await supabaseClient
          .from('user_roles')
          .select(`
            role_id,
            roles (
              id,
              name,
              display_name
            )
          `)
          .eq('user_id', authUser.id);

        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          email_confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          roles: (userRoles || []).map(ur => ({
            id: ur.roles.id,
            name: ur.roles.name,
            display_name: ur.roles.display_name
          }))
        };
      })
    );

    return new Response(JSON.stringify({ users: usersWithRoles }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in list-users-admin function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});