import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  category: string;
  resource: string;
  action: string;
  description: string;
}

export const useRoles = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les rôles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('detailed_permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les permissions",
        variant: "destructive",
      });
    }
  };

  const createRole = async (roleData: { name: string; description: string }) => {
    try {
      const { error } = await supabase
        .from('roles')
        .insert({
          name: roleData.name,
          display_name: roleData.name,
          description: roleData.description,
          is_system_role: false
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Rôle créé avec succès",
      });

      await fetchRoles();
    } catch (error) {
      console.error('Erreur création rôle:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rôle",
        variant: "destructive",
      });
    }
  };

  const assignPermissionToRole = async (roleId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .insert({
          role_id: roleId,
          permission_id: permissionId
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Permission assignée au rôle",
      });
    } catch (error) {
      console.error('Erreur assignation permission:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'assigner la permission",
        variant: "destructive",
      });
    }
  };

  const removePermissionFromRole = async (roleId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Permission retirée du rôle",
      });
    } catch (error) {
      console.error('Erreur suppression permission:', error);
      toast({
        title: "Erreur",
        description: "Impossible de retirer la permission",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  return {
    roles,
    permissions,
    isLoading,
    fetchRoles,
    fetchPermissions,
    createRole,
    assignPermissionToRole,
    removePermissionFromRole,
  };
};
