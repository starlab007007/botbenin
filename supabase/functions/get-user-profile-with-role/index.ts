import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with user's auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.email);

    // Get user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select(`
        roles (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
    }

    const roles = rolesData?.map(r => r.roles).filter(Boolean) || [];
    console.log(`✅ User roles:`, roles);

    // Get user permissions using the RPC function
    const { data: permissionsData, error: permissionsError } = await supabase.rpc('get_user_permissions', {
      user_uuid: user.id
    });

    if (permissionsError) {
      console.error('❌ Error fetching permissions:', permissionsError);
    }

    const permissions = permissionsData || [];
    console.log(`✅ User permissions count: ${permissions.length}`);

    // Get user profile info
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('⚠️ Error fetching profile:', profileError);
    }

    // Build comprehensive profile response
    const profile = {
      id: user.id,
      email: user.email,
      emailConfirmed: user.email_confirmed_at != null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      roles: roles,
      permissions: permissions.map(p => ({
        name: p.permission_name,
        category: p.category,
        source: p.source
      })),
      isAdmin: roles.some(r => r.name === 'admin'),
      profile: profileData || null,
      metadata: user.user_metadata || {}
    };

    console.log(`✅ Profile built successfully for user: ${user.email}`);

    return new Response(
      JSON.stringify(profile),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
