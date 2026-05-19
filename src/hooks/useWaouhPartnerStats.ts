import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PartnerStats {
  partner_id: string;
  code_partenaire?: string;
  nom?: string;
  statut?: string;
  niveau?: string;
  nb_businesses: number;
  nb_products: number;
  ca_24h: number;
  ca_7j: number;
  ca_30j: number;
  commission_totale: number;
  commission_en_attente: number;
  nb_ventes_30j: number;
  derniere_activite?: string;
}

export function useWaouhPartnerStats(partnerId?: string) {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!partnerId) { setStats(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('waouh_partner_stats_v' as any)
      .select('*')
      .eq('partner_id', partnerId)
      .maybeSingle();
    setStats(data as any);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!partnerId) return;
    const ch = supabase.channel(`stats-${partnerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waouh_partner_sales', filter: `partner_id=eq.${partnerId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waouh_partner_products', filter: `partner_id=eq.${partnerId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [partnerId, refresh]);

  return { stats, loading, refresh };
}

export function useAllPartnerStats() {
  const [rows, setRows] = useState<PartnerStats[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('waouh_partner_stats_v' as any).select('*').order('ca_30j', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const ch = supabase.channel('all-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waouh_partner_sales' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refresh]);

  return { rows, loading, refresh };
}
