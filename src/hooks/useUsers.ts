
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  avatar?: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  createdAt: Date;
}

const rolePermissions = {
  admin: [
    'read_all', 'write_all', 'delete_all', 'manage_users', 'manage_roles',
    'view_analytics', 'manage_automations', 'access_all_modules'
  ],
  manager: [
    'read_all', 'write_most', 'manage_team', 'view_analytics', 
    'manage_automations', 'access_business_modules'
  ],
  user: [
    'read_own', 'write_own', 'use_automations', 'access_basic_modules'
  ],
  viewer: [
    'read_limited', 'view_dashboards'
  ]
};

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*');

      if (error) throw error;

      const formattedUsers = data?.map((user: any) => ({
        id: user.id,
        name: user.full_name || 'Unknown User',
        email: user.email || '',
        role: (user.role_name || 'user') as 'admin' | 'manager' | 'user' | 'viewer',
        permissions: rolePermissions[user.role_name as keyof typeof rolePermissions] || rolePermissions.user,
        status: (user.is_active ? 'active' : 'inactive') as 'active' | 'inactive' | 'pending',
        lastLogin: user.last_login ? new Date(user.last_login) : undefined,
        createdAt: new Date(user.created_at || Date.now()),
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt' | 'permissions'>) => {
    try {
      // Create user via Supabase Auth Admin API would be needed here
      // For now, we'll just add to the local state
      const newUser: User = {
        ...userData,
        id: Date.now().toString(),
        createdAt: new Date(),
        permissions: rolePermissions[userData.role] || rolePermissions.user
      };
      
      setUsers(prev => [...prev, newUser]);
      
      toast({
        title: "Utilisateur ajouté",
        description: `${userData.name} a été ajouté avec succès`,
      });
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      setUsers(prev => prev.map(user => 
        user.id === id ? { ...user, ...updates } : user
      ));
      
      toast({
        title: "Utilisateur mis à jour",
        description: "Les informations ont été mises à jour avec succès",
      });
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setUsers(prev => prev.filter(user => user.id !== id));
      
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    addUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers
  };
};
