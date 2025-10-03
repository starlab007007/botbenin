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
    console.log('Starting list-users-admin function');
    
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
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header manquant' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    console.log('User authenticated:', !!user, 'Error:', userError);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Vérifier que l'utilisateur a la permission users.view
    console.log('Checking permission for user:', user.id);
    const { data: hasPermission, error: permError } = await supabaseClient
      .rpc('user_has_permission', { 
        user_uuid: user.id, 
        permission_name: 'users.view' 
      });

    console.log('Permission check result:', hasPermission, 'Error:', permError);

    if (permError) {
      console.error('Permission check error:', permError);
      return new Response(JSON.stringify({ error: 'Erreur lors de la vérification des permissions', details: permError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Permission refusée - vous devez avoir la permission users.view' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Lister tous les utilisateurs
    console.log('Fetching users from auth.users...');
    const { data: authUsers, error: listError } = await supabaseClient.auth.admin.listUsers();

    console.log('Users fetched:', authUsers?.users?.length, 'Error:', listError);

    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    if (!authUsers || !authUsers.users) {
      console.log('No users returned from auth.admin.listUsers');
      return new Response(JSON.stringify({ users: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Récupérer les rôles de chaque utilisateur
    console.log('Fetching roles for', authUsers.users.length, 'users');
    const usersWithRoles = await Promise.all(
      authUsers.users.map(async (authUser) => {
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

    console.log('Returning', usersWithRoles.length, 'users with roles');

    return new Response(JSON.stringify({ users: usersWithRoles }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in list-users-admin function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});