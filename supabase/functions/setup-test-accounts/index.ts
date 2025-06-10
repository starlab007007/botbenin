
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting test accounts setup...');

    const testAccounts = [
      {
        email: 'admin@test.com',
        password: 'admin123456',
        full_name: 'Admin Test',
        phone: '+229 97 00 00 01',
        role: 'admin'
      },
      {
        email: 'user@test.com',
        password: 'user123456',
        full_name: 'User Test',
        phone: '+229 97 00 00 02',
        role: 'user'
      }
    ];

    const results = [];

    for (const account of testAccounts) {
      console.log(`Setting up account: ${account.email}`);

      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      const userExists = existingUser.users.some(user => user.email === account.email);

      if (userExists) {
        console.log(`User ${account.email} already exists, skipping...`);
        results.push({ email: account.email, status: 'exists' });
        continue;
      }

      // Create user with admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.full_name,
          phone: account.phone
        }
      });

      if (createError) {
        console.error(`Error creating user ${account.email}:`, createError);
        results.push({ email: account.email, status: 'error', error: createError.message });
        continue;
      }

      if (!newUser.user) {
        console.error(`No user returned for ${account.email}`);
        results.push({ email: account.email, status: 'error', error: 'No user returned' });
        continue;
      }

      console.log(`User created: ${account.email} with ID: ${newUser.user.id}`);

      // Insert user into users table
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: newUser.user.id,
          email: account.email,
          full_name: account.full_name,
          phone: account.phone,
          is_active: true,
          email_verified: true,
          auth_provider: 'email',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`Error inserting user ${account.email} into users table:`, insertError);
        results.push({ email: account.email, status: 'partial', error: insertError.message });
        continue;
      }

      // Get or create role
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('name', account.role)
        .single();

      let roleId = roleData?.id;

      if (roleError || !roleId) {
        // Create role if it doesn't exist
        const { data: newRole, error: createRoleError } = await supabaseAdmin
          .from('roles')
          .insert({
            name: account.role,
            description: `${account.role} role`,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (createRoleError) {
          console.error(`Error creating role ${account.role}:`, createRoleError);
          results.push({ email: account.email, status: 'partial', error: createRoleError.message });
          continue;
        }

        roleId = newRole.id;
      }

      // Assign role to user
      const { error: roleAssignError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: newUser.user.id,
          role_id: roleId,
          assigned_at: new Date().toISOString()
        });

      if (roleAssignError) {
        console.error(`Error assigning role to user ${account.email}:`, roleAssignError);
        results.push({ email: account.email, status: 'partial', error: roleAssignError.message });
        continue;
      }

      // Create bot_owners entry for user
      const { error: botOwnerError } = await supabaseAdmin
        .from('bot_owners')
        .upsert({
          user_id: newUser.user.id,
          subscription_plan: account.role === 'admin' ? 'enterprise' : 'free',
          max_bots: account.role === 'admin' ? 100 : 3,
          created_at: new Date().toISOString()
        });

      if (botOwnerError) {
        console.error(`Error creating bot_owners entry for ${account.email}:`, botOwnerError);
      }

      results.push({ email: account.email, status: 'success' });
      console.log(`Successfully set up account: ${account.email}`);
    }

    console.log('Test accounts setup completed:', results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test accounts setup completed',
        results: results
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in setup-test-accounts function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
