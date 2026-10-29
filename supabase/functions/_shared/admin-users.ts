interface AdminAuthUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
}
type Role = { id: string; name: string; display_name?: string };
interface AdminUsersClient {
  auth: {
    getUser(token: string): PromiseLike<{ data: { user: { id: string } | null }; error: unknown }>;
    admin: { listUsers(options: { page: number; perPage: number }): PromiseLike<{ data: { users: AdminAuthUser[] }; error: unknown }> };
  };
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
  from(name: string): { select(columns: string): {
    in(column: string, values: string[]): PromiseLike<{ data: { user_id: string; roles: Role | Role[] | null }[] | null; error: unknown }>;
  } };
}

// Includes the session header added by the shared web client and current SDK metadata.
export const adminUsersCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-waouh-session, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function createAdminUsersHandler(client: AdminUsersClient) {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...adminUsersCorsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: adminUsersCorsHeaders });
    if (req.method !== 'POST') return json({ error: 'Demande non prise en charge.' }, 405);
    try {
      const token = req.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
      if (!token) return json({ error: 'Reconnectez-vous pour continuer.' }, 401);
      const { data: { user }, error: authError } = await client.auth.getUser(token);
      if (authError || !user) return json({ error: 'Reconnectez-vous pour continuer.' }, 401);
      const { data: allowed, error: permissionError } = await client.rpc('user_has_permission', {
        user_uuid: user.id, permission_name: 'users.view',
      });
      if (permissionError) throw permissionError;
      if (allowed !== true) return json({ error: 'Vous ne pouvez pas consulter cette liste.' }, 403);
      let body: { page?: unknown };
      try { body = JSON.parse(await req.text() || '{}'); }
      catch { return json({ error: 'Demande invalide.' }, 400); }
      const page = body?.page ?? 1;
      if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1 || page > 1000000) {
        return json({ error: 'Demande invalide.' }, 400);
      }
      // Older open web tabs have no pagination body; keep their list useful
      // while the new web release is rolling out.
      const perPage = body?.page == null ? 1000 : 200;
      const { data, error } = await client.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      // One batched lookup instead of one database request for every account.
      const ids = data.users.map(user => user.id);
      const { data: roleRows, error: rolesError } = ids.length
        ? await client.from('user_roles').select('user_id, roles(id, name, display_name)').in('user_id', ids)
        : { data: [], error: null };
      if (rolesError) throw rolesError;
      const roles = new Map<string, unknown[]>();
      for (const row of roleRows || []) {
        if (!row.roles) continue;
        const values = Array.isArray(row.roles) ? row.roles : [row.roles];
        roles.set(row.user_id, [...(roles.get(row.user_id) || []), ...values]);
      }
      return json({
        users: data.users.map(user => ({
          id: user.id, email: user.email || '', phone: user.phone || '',
          created_at: user.created_at, email_confirmed_at: user.email_confirmed_at || null,
          last_sign_in_at: user.last_sign_in_at || null, roles: roles.get(user.id) || [],
        })),
        next_page: data.users.length === perPage ? page + 1 : null,
      });
    } catch (error) {
      console.error('[list-users-admin] request failed', error);
      return json({ error: 'La liste est momentanément indisponible. Réessayez.' }, 503);
    }
  };
}
