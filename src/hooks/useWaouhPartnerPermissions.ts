import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type WaouhPartnerPermission =
  | 'can_add_business' | 'can_edit_business' | 'can_delete_business'
  | 'can_add_product' | 'can_edit_product' | 'can_delete_product'
  | 'can_record_sale' | 'can_request_payout' | 'can_invite_subagent';

export const ALL_PERMISSIONS: { value: WaouhPartnerPermission; label: string }[] = [
  { value: 'can_add_business', label: 'Ajouter entreprise' },
  { value: 'can_edit_business', label: 'Modifier entreprise' },
  { value: 'can_delete_business', label: 'Supprimer entreprise' },
  { value: 'can_add_product', label: 'Ajouter produit' },
  { value: 'can_edit_product', label: 'Modifier produit' },
  { value: 'can_delete_product', label: 'Supprimer produit' },
  { value: 'can_record_sale', label: 'Enregistrer vente' },
  { value: 'can_request_payout', label: 'Demander paiement' },
  { value: 'can_invite_subagent', label: 'Inviter sous-agent' },
];

export function useWaouhPartnerPermissions(partnerId?: string) {
  const [perms, setPerms] = useState<Set<WaouhPartnerPermission>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    const { data } = await supabase
      .from('waouh_partner_permissions' as any)
      .select('permission')
      .eq('partner_id', partnerId);
    setPerms(new Set(((data as any[]) || []).map(d => d.permission)));
    setLoading(false);
  }, [partnerId]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (perm: WaouhPartnerPermission, on: boolean) => {
    if (!partnerId) return;
    if (on) {
      await supabase.from('waouh_partner_permissions' as any).insert({ partner_id: partnerId, permission: perm });
    } else {
      await supabase.from('waouh_partner_permissions' as any).delete().eq('partner_id', partnerId).eq('permission', perm);
    }
    refresh();
  };

  return { perms, loading, toggle, refresh, has: (p: WaouhPartnerPermission) => perms.has(p) };
}
