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
        // Appels sécurisés à la fonction SECURITY DEFINER. Un super-admin
        // doit pouvoir ouvrir les mêmes routes protégées qu'un admin.
        const [adminRole, superAdminRole] = await Promise.all([
          supabase.rpc('has_role', {
            _user_id: user.id,
            _role_name: 'admin'
          }),
          supabase.rpc('has_role', {
            _user_id: user.id,
            _role_name: 'super_admin'
          })
        ]);

        if (adminRole.error || superAdminRole.error) {
          console.error('Error checking admin role:', adminRole.error || superAdminRole.error);
          setIsAdmin(false);
        } else {
          setIsAdmin(Boolean(adminRole.data || superAdminRole.data));
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
