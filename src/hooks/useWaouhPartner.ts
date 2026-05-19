import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface WaouhPartner {
  id: string;
  user_id: string;
  code_partenaire: string;
  nom: string;
  telephone?: string;
  whatsapp?: string;
  email?: string;
  ville?: string;
  pays?: string;
  mobile_money_number?: string;
  mobile_money_operator?: string;
  statut: 'pending' | 'active' | 'suspended' | 'rejected';
  niveau: 'Bronze' | 'Argent' | 'Or' | 'Platine';
  kyc_verified: boolean;
  date_activation?: string;
  created_at: string;
}

export function useWaouhPartner() {
  const { user } = useAuth();
  const [partner, setPartner] = useState<WaouhPartner | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setPartner(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('waouh_partners' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setPartner(data as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const apply = async (payload: Partial<WaouhPartner>) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('waouh_partners' as any)
      .insert({ ...payload, user_id: user.id, nom: payload.nom || user.email || 'Partenaire' } as any)
      .select()
      .single();
    if (error) throw error;
    setPartner(data as any);
    return data;
  };

  return { partner, loading, refresh, apply };
}
