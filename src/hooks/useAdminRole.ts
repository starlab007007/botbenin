import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdminRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Appel sécurisé à la fonction SECURITY DEFINER avec timeout :
        // si Supabase/CDN réseau tarde, on sort du spinner au lieu de bloquer la page.
        const timeout = new Promise<never>((_, reject) =>
          window.setTimeout(() => reject(new Error('Admin role check timeout')), 4000)
        );
        const [adminResult, superAdminResult] = await Promise.race([
          Promise.all([
            supabase.rpc('has_role', { _user_id: user.id, _role_name: 'admin' }),
            supabase.rpc('has_role', { _user_id: user.id, _role_name: 'super_admin' }),
          ]),
          timeout,
        ]) as any;

        if (adminResult.error || superAdminResult.error) {
          console.error('Error checking admin role:', adminResult.error || superAdminResult.error);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(adminResult.data || superAdminResult.data));
        }
      } catch (error) {
        console.error('Error in checkAdminRole:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminRole();
  }, [user]);

  return { isAdmin, isLoading };
};
