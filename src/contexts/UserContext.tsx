
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export interface UserContextType {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User | null) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  hasPermission: (permission: string) => boolean;
  switchRole: (role: User['role']) => void;
  assignAdminRole: (userEmail: string) => Promise<string>;
  refreshUserData: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const rolePermissions = {
  admin: [
    'read_all', 'write_all', 'delete_all', 'manage_users', 'manage_roles',
    'view_analytics', 'manage_automations', 'access_all_modules',
    'platform.admin', 'users.manage', 'users.edit', 'platform.logs',
    'bots.manage_all', 'campaigns.manage_all'
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

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserData = async () => {
    try {
      setIsLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setCurrentUser(null);
        return;
      }

      // Récupérer les rôles de l'utilisateur depuis la base de données
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name,
            description
          )
        `)
        .eq('user_id', authUser.id);

      // Récupérer toutes les permissions de l'utilisateur
      const { data: userPermissions } = await supabase
        .rpc('get_user_permissions', { user_uuid: authUser.id });

      const primaryRole = userRoles?.[0]?.roles?.name || 'user';
      const permissions = userPermissions?.map(p => p.permission_name) || rolePermissions[primaryRole as keyof typeof rolePermissions];

      const userData: User = {
        id: authUser.id,
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Utilisateur',
        email: authUser.email || '',
        role: primaryRole as User['role'],
        permissions: permissions || [],
        status: 'active',
        lastLogin: authUser.last_sign_in_at ? new Date(authUser.last_sign_in_at) : undefined,
        createdAt: new Date(authUser.created_at)
      };

      setCurrentUser(userData);
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const assignAdminRole = async (userEmail: string): Promise<string> => {
    try {
      // Appeler la fonction SQL pour assigner le rôle admin
      const { data, error } = await supabase.rpc('assign_admin_role', {
        user_email: userEmail
      });

      if (error) {
        console.error('Erreur lors de l\'assignation du rôle admin:', error);
        return `Erreur: ${error.message}`;
      }

      // La fonction retourne un message de statut
      const result = data as string;
      
      // Rafraîchir les données si c'est l'utilisateur actuel
      if (currentUser?.email === userEmail) {
        await refreshUserData();
      }

      // Rafraîchir aussi tous les utilisateurs pour l'admin
      await fetchAllUsers();

      return result;
    } catch (error: any) {
      console.error('Erreur lors de l\'assignation du rôle admin:', error);
      return `Erreur: ${error.message || 'Erreur inconnue'}`;
    }
  };

  const fetchAllUsers = async () => {
    try {
      // Pour un administrateur, récupérer tous les utilisateurs
      if (currentUser?.role === 'admin') {
        const { data: allUsers } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            roles (
              name,
              description
            )
          `);

        // Mapper les utilisateurs (simulation pour l'exemple)
        const mappedUsers: User[] = allUsers?.map((ur: any) => ({
          id: ur.user_id,
          name: `Utilisateur ${ur.user_id.slice(0, 8)}`,
          email: `user-${ur.user_id.slice(0, 8)}@example.com`,
          role: ur.roles?.name || 'user',
          permissions: rolePermissions[ur.roles?.name as keyof typeof rolePermissions] || rolePermissions.user,
          status: 'active' as const,
          createdAt: new Date()
        })) || [];

        setUsers([...mappedUsers, currentUser].filter(Boolean));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
    }
  };

  useEffect(() => {
    refreshUserData();
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        refreshUserData();
      } else {
        setCurrentUser(null);
        setUsers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchAllUsers();
    }
  }, [currentUser]);

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, ...updates } : user
    ));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(user => user.id !== id));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(null);
    }
  };

  const hasPermission = (permission: string) => {
    return currentUser?.permissions.includes(permission) || false;
  };

  const switchRole = (role: User['role']) => {
    if (currentUser) {
      const updatedUser = {
        ...currentUser,
        role,
        permissions: rolePermissions[role]
      };
      setCurrentUser(updatedUser);
      updateUser(currentUser.id, { role, permissions: rolePermissions[role] });
    }
  };

  return (
    <UserContext.Provider value={{
      currentUser,
      users,
      setCurrentUser,
      addUser,
      updateUser,
      deleteUser,
      hasPermission,
      switchRole,
      assignAdminRole,
      refreshUserData,
      isLoading
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
