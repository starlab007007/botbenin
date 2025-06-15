
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPermission {
  permission_name: string;
  category: string;
  source: string;
}

export const useAdminPermissions = () => {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase.rpc('get_user_permissions', {
        user_uuid: user.id
      });
      
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!user,
  });

  const hasPermission = (permissionName: string) => {
    return permissions?.some(p => p.permission_name === permissionName) || false;
  };

  const hasAnyPermission = (permissionNames: string[]) => {
    return permissionNames.some(name => hasPermission(name));
  };

  const isAdmin = hasPermission('system_administration');
  const canManageUsers = hasPermission('manage_users');
  const canViewAnalytics = hasPermission('view_platform_analytics');
  const canManageSubscriptions = hasPermission('manage_subscriptions');
  const canManageBots = hasPermission('manage_all_bots');

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    isAdmin,
    canManageUsers,
    canViewAnalytics,
    canManageSubscriptions,
    canManageBots,
  };
};
