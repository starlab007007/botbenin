import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook pour vérifier si l'utilisateur a une permission spécifique
 * @param permission - Nom de la permission à vérifier (ex: 'users.edit', 'bots.create')
 * @returns Object avec { hasPermission, isLoading }
 */
export const usePermission = (permission: string) => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('user_has_permission', {
          user_uuid: user.id,
          permission_name: permission,
        });

        if (error) {
          console.error('Error checking permission:', error);
          setHasPermission(false);
        } else {
          setHasPermission(data || false);
        }
      } catch (error) {
        console.error('Error in checkPermission:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [user, permission]);

  return { hasPermission, isLoading };
};

/**
 * Hook pour vérifier si l'utilisateur a au moins une des permissions listées
 * @param permissions - Liste des permissions à vérifier
 * @returns Object avec { hasPermission, isLoading }
 */
export const useAnyPermission = (permissions: string[]) => {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user || permissions.length === 0) {
        setHasPermission(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('user_has_any_permission', {
          user_uuid: user.id,
          permission_names: permissions,
        });

        if (error) {
          console.error('Error checking permissions:', error);
          setHasPermission(false);
        } else {
          setHasPermission(data || false);
        }
      } catch (error) {
        console.error('Error in checkPermissions:', error);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, [user, permissions]);

  return { hasPermission, isLoading };
};

/**
 * Hook pour obtenir toutes les permissions de l'utilisateur
 * @returns Object avec { permissions, isLoading }
 */
export const useUserPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) {
        setPermissions([]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_permission_details')
          .select('permission_name')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching permissions:', error);
          setPermissions([]);
        } else {
          const permissionNames = data?.map(p => p.permission_name) || [];
          setPermissions(permissionNames);
        }
      } catch (error) {
        console.error('Error in fetchPermissions:', error);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  return { permissions, isLoading };
};
