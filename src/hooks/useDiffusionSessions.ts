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

const ACTIVE = new Set(['WORKING', 'connected']);

async function fetchLiveSessions(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return {};
    const url = new URL(`/functions/v1/waha-dashboard-proxy`, 'https://mvynepqulhflxtyymtzs.supabase.co');
    url.searchParams.set('path', '/api/sessions');
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return {};
    const arr = await res.json();
    const map: Record<string, string> = {};
    for (const s of Array.isArray(arr) ? arr : []) {
      if (s?.name) map[s.name] = s.status ?? 'UNKNOWN';
    }
    return map;
  } catch { return {}; }
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    let rows = (data ?? []) as any as DiffSession[];

    // Merge live WAHA status (DB may be stale)
    const live = await fetchLiveSessions();
    const updates: Array<{ id: string; status: string }> = [];
    rows = rows.map(r => {
      const live_s = live[r.session_name];
      if (live_s && live_s !== r.status) {
        updates.push({ id: r.id, status: live_s });
        return { ...r, status: live_s };
      }
      return r;
    });
    // Best-effort DB reconciliation
    for (const u of updates) {
      supabase.from('whatsapp_accounts').update({ status: u.status, last_activity: new Date().toISOString() }).eq('id', u.id).then(() => {});
    }

    setMine(rows.filter(r => r.user_id === user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Re-sync every 20s while mounted
  useEffect(() => {
    const t = setInterval(() => { refresh(); }, 20000);
    return () => clearInterval(t);
  }, [refresh]);

  return { mine, shared: [] as DiffSession[], all: mine, loading, refresh, isActive: (s: DiffSession) => ACTIVE.has(s.status) };
}

