import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Modules front (barre latérale PC, rail tablette, menu complet mobile)
 * visibles pour l'utilisateur courant, d'après les réglages admin
 * (public.waouh_frontend_modules / waouh_frontend_module_roles) et son rôle.
 *
 * `visibleKeys` est `null` pendant le premier chargement (les écrans
 * consommateurs doivent alors tout afficher — voir
 * filterNavigationSectionsByVisibility) puis devient le Set des module_key
 * autorisés. Se met à jour en direct quand un admin bascule un module,
 * sans rechargement de page.
 */
export const useFrontendModules = () => {
  const { user } = useAuth();
  const [visibleKeys, setVisibleKeys] = useState<Set<string> | null>(null);
  const userId = user?.id ?? null;
  const fetchingFor = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const marker = userId ?? 'guest';
    fetchingFor.current = marker;

    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('waouh_visible_modules_for_user' as any, {
          p_user_id: userId,
        });
        if (!mounted || fetchingFor.current !== marker) return;
        if (error) {
          console.error('Error fetching frontend modules:', error);
          // Échec réseau/RPC : on n'affame pas la navigation, tout reste visible.
          setVisibleKeys(null);
          return;
        }
        const keys = (data ?? []).map((row: any) =>
          typeof row === 'string' ? row : row.waouh_visible_modules_for_user,
        );
        setVisibleKeys(new Set(keys));
      } catch (error) {
        console.error('Error in useFrontendModules:', error);
        setVisibleKeys(null);
      }
    };

    void load();

    const channel = supabase
      .channel(`waouh-frontend-modules-${marker}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waouh_frontend_modules' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waouh_frontend_module_roles' }, load)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { visibleKeys };
};

export default useFrontendModules;
