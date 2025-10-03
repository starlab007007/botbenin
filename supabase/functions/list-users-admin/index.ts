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
    console.log('🚀 [list-users-admin] Starting function');
    console.log('📋 [list-users-admin] Request method:', req.method);
    console.log('🔗 [list-users-admin] Request URL:', req.url);
    
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
    
    console.log('✅ [list-users-admin] Supabase client created');

    // Vérifier que l'utilisateur est authentifié
    const authHeader = req.headers.get('Authorization');
    console.log('🔐 [list-users-admin] Auth header present:', !!authHeader);
    console.log('🔐 [list-users-admin] Auth header value:', authHeader ? authHeader.substring(0, 20) + '...' : 'null');
    
    if (!authHeader) {
      console.error('❌ [list-users-admin] No auth header');
      return new Response(JSON.stringify({ error: 'Authorization header manquant' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🎫 [list-users-admin] Token extracted, length:', token.length);
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    console.log('👤 [list-users-admin] User authenticated:', !!user);
    console.log('👤 [list-users-admin] User ID:', user?.id);
    console.log('👤 [list-users-admin] User email:', user?.email);
    console.log('❌ [list-users-admin] Auth error:', userError);

    if (userError || !user) {
      console.error('❌ [list-users-admin] Authentication failed');
      return new Response(JSON.stringify({ error: 'Non autorisé', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Vérifier que l'utilisateur a la permission users.view
    console.log('🔍 [list-users-admin] Checking permission for user:', user.id);
    const { data: hasPermission, error: permError } = await supabaseClient
      .rpc('user_has_permission', { 
        user_uuid: user.id, 
        permission_name: 'users.view' 
      });

    console.log('✓ [list-users-admin] Permission check result:', hasPermission);
    console.log('❌ [list-users-admin] Permission error:', permError);

    if (permError) {
      console.error('❌ [list-users-admin] Permission check error:', permError);
      return new Response(JSON.stringify({ 
        error: 'Erreur lors de la vérification des permissions', 
        details: permError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!hasPermission) {
      console.error('🚫 [list-users-admin] Permission denied for user:', user.id);
      return new Response(JSON.stringify({ 
        error: 'Permission refusée - vous devez avoir la permission users.view',
        userId: user.id,
        email: user.email
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Lister tous les utilisateurs
    console.log('👥 [list-users-admin] Fetching users from auth.users...');
    const { data: authUsers, error: listError } = await supabaseClient.auth.admin.listUsers();

    console.log('📊 [list-users-admin] Users fetched:', authUsers?.users?.length);
    console.log('❌ [list-users-admin] List error:', listError);

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
    console.log('🔄 [list-users-admin] Fetching roles for', authUsers.users.length, 'users');
    const usersWithRoles = await Promise.all(
      authUsers.users.map(async (authUser) => {
        console.log('👤 [list-users-admin] Fetching roles for user:', authUser.email);
        const { data: userRoles, error: rolesError } = await supabaseClient
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

        if (rolesError) {
          console.error('❌ [list-users-admin] Error fetching roles for', authUser.email, rolesError);
        } else {
          console.log('✓ [list-users-admin] Roles for', authUser.email, ':', userRoles?.length || 0);
        }

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

    console.log('✅ [list-users-admin] Returning', usersWithRoles.length, 'users with roles');
    console.log('📤 [list-users-admin] Sample user:', usersWithRoles[0]);

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