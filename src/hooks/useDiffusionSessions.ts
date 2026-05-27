import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DiffSession {
  id: string;
  user_id: string;
  session_name: string;
  phone_number: string | null;
  status: string;
  is_admin_shared: boolean;
  qr_code: string | null;
}

export function useDiffusionSessions() {
  const { user } = useAuth();
  const [mine, setMine] = useState<DiffSession[]>([]);
  const [shared, setShared] = useState<DiffSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_accounts')
      .select('id, user_id, session_name, phone_number, status, is_admin_shared, qr_code')
      .or(`user_id.eq.${user.id},is_admin_shared.eq.true`)
      .order('created_at', { ascending: false });
    const rows = (data ?? []) as any as DiffSession[];
    setMine(rows.filter(r => r.user_id === user.id && !r.is_admin_shared));
    setShared(rows.filter(r => r.is_admin_shared));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { mine, shared, all: [...mine, ...shared], loading, refresh };
}
