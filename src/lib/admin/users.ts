import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export async function loadAdminUsers(signal: AbortSignal): Promise<AdminUser[]> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) throw new Error('Reconnectez-vous pour consulter les utilisateurs.');
  const users = new Map<string, AdminUser>();
  let page = 1;
  do {
    signal.throwIfAborted();
    const { data, error: requestError } = await supabase.functions.invoke('list-users-admin', {
      body: { page }, signal, headers: { Authorization: `Bearer ${session.access_token}` },
    });
    signal.throwIfAborted();
    if (requestError) {
      const status = requestError.context?.status;
      if (status === 401) throw new Error('Reconnectez-vous pour consulter les utilisateurs.');
      if (status === 403) throw new Error('Vous ne pouvez pas consulter cette liste.');
      throw new Error('Impossible de charger les utilisateurs. Réessayez.');
    }
    if (!Array.isArray(data?.users) || data.users.some((u: unknown) => !u || typeof (u as AdminUser).id !== 'string')) {
      throw new Error('Impossible de charger les utilisateurs. Réessayez.');
    }
    for (const user of data.users) users.set(user.id, {
      id: user.id, email: user.email || user.phone || 'Sans adresse e-mail',
      created_at: user.created_at,
      email_confirmed_at: user.email_confirmed_at || null,
      last_sign_in_at: user.last_sign_in_at || null,
    });
    if (data.next_page == null) break;
    if (data.next_page !== page + 1) throw new Error('Impossible de charger les utilisateurs. Réessayez.');
    page = data.next_page;
  } while (true);
  const { data: current, error: currentError } = await supabase.auth.getSession();
  signal.throwIfAborted();
  if (currentError || current.session?.user.id !== session.user.id) {
    throw new Error('Reconnectez-vous pour consulter les utilisateurs.');
  }
  return [...users.values()];
}
