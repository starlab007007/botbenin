
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  createdAt: Date;
  permissions: string[];
}

interface UserContextType {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'permissions'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  fetchCurrentUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setCurrentUser(null);
        return;
      }

      // Vérifier si l'utilisateur est admin
      const { data: adminCheck, error: adminError } = await supabase.rpc(
        'is_admin',
        { user_uuid: user.id }
      );

      // Récupérer les permissions de l'utilisateur
      const { data: permissions, error: permError } = await supabase.rpc(
        'get_user_permissions',
        { user_uuid: user.id }
      );

      const userPermissions = (permissions || []).map((p: any) => p.permission_name);
      const isUserAdmin = adminCheck === true;

      // Récupérer les rôles de l'utilisateur
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          roles:role_id (
            name
          )
        `)
        .eq('user_id', user.id);

      const primaryRole = userRoles?.[0]?.roles?.name || 'user';

      const currentUserData: User = {
        id: user.id,
        name: user.email?.split('@')[0] || 'Utilisateur',
        email: user.email || '',
        role: primaryRole as UserRole,
        status: 'active',
        lastLogin: new Date(),
        createdAt: new Date(user.created_at),
        permissions: userPermissions
      };

      setCurrentUser(currentUserData);

    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addUser = (user: Omit<User, 'id' | 'createdAt' | 'permissions'>) => {
    const newUser: User = {
      ...user,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      permissions: []
    };
    setUsers(prev => [...prev, newUser]);
    
    toast({
      title: "Utilisateur ajouté",
      description: `${user.name} a été ajouté avec succès.`,
    });
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(user => 
      user.id === id ? { ...user, ...updates } : user
    ));
    
    toast({
      title: "Utilisateur modifié",
      description: "Les informations ont été mises à jour.",
    });
  };

  const deleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    setUsers(prev => prev.filter(user => user.id !== id));
    
    toast({
      title: "Utilisateur supprimé",
      description: `${userToDelete?.name} a été supprimé.`,
      variant: "destructive",
    });
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || currentUser.permissions.includes(permission);
  };

  const isAdmin = currentUser?.role === 'admin' || false;

  useEffect(() => {
    fetchCurrentUser();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          fetchCurrentUser();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: UserContextType = {
    users,
    currentUser,
    isLoading,
    addUser,
    updateUser,
    deleteUser,
    hasPermission,
    isAdmin,
    fetchCurrentUser,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
