import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerActivity {
  id: string;
  partner_id: string;
  business_id?: string;
  product_id?: string;
  sale_id?: string;
  event_type: string;
  title?: string;
  metadata?: any;
  created_at: string;
}

export function useWaouhPartnerActivity(opts: { partnerId?: string; limit?: number; live?: boolean } = {}) {
  const { partnerId, limit = 50, live = true } = opts;
  const [items, setItems] = useState<PartnerActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase.from('waouh_partner_activity' as any).select('*').order('created_at', { ascending: false }).limit(limit);
      if (partnerId) q = q.eq('partner_id', partnerId);
      const { data } = await q;
      if (!cancelled) { setItems((data as any) || []); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [partnerId, limit]);

  useEffect(() => {
    if (!live) return;
    const ch = supabase.channel(`partner-activity-${partnerId || 'all'}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'waouh_partner_activity',
        ...(partnerId ? { filter: `partner_id=eq.${partnerId}` } : {}),
      }, (payload) => {
        setItems(prev => [payload.new as any, ...prev].slice(0, limit));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [partnerId, live, limit]);

  return { items, loading };
}
