import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createAdminUsersHandler } from '../_shared/admin-users.ts';

const client = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);
Deno.serve(createAdminUsersHandler(client));
