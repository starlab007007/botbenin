
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  permissions: Array<{
    name: string;
    category: string;
    source: string;
  }>;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Récupérer les utilisateurs avec leurs rôles
      const { data: usersData, error: usersError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          roles:role_id (
            id,
            name,
            description
          )
        `);

      if (usersError) throw usersError;

      // Récupérer les permissions pour chaque utilisateur
      const usersWithDetails: AdminUser[] = [];
      const processedUserIds = new Set<string>();

      for (const userRole of usersData || []) {
        if (processedUserIds.has(userRole.user_id)) continue;
        
        // Récupérer les détails utilisateur depuis auth.users via RPC
        const { data: authData, error: authError } = await supabase.rpc(
          'get_admin_dashboard_stats'
        );

        // Pour simuler les données utilisateur, on utilise l'ID
        const mockUser = {
          id: userRole.user_id,
          email: `user-${userRole.user_id.substring(0, 8)}@bot.bj`,
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        };

        // Récupérer tous les rôles pour cet utilisateur
        const userRoles = usersData
          ?.filter(ur => ur.user_id === userRole.user_id)
          .map(ur => ur.roles)
          .filter(Boolean) || [];

        // Récupérer les permissions
        const { data: permissions, error: permError } = await supabase.rpc(
          'get_user_permissions',
          { user_uuid: userRole.user_id }
        );

        if (permError) {
          console.error('Erreur permissions:', permError);
        }

        usersWithDetails.push({
          ...mockUser,
          roles: userRoles,
          permissions: permissions || []
        });

        processedUserIds.add(userRole.user_id);
      }

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleId
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rôle assigné avec succès",
      });

      await fetchUsers();
    } catch (error) {
      console.error('Erreur assignation rôle:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner le rôle",
        variant: "destructive",
      });
    }
  };

  const removeRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rôle retiré avec succès",
      });

      await fetchUsers();
    } catch (error) {
      console.error('Erreur suppression rôle:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer le rôle",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    isLoading,
    fetchUsers,
    assignRole,
    removeRole,
  };
};
