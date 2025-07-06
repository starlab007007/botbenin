
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminContextType {
  isAdmin: boolean;
  userPermissions: string[];
  hasPermission: (permission: string) => boolean;
  checkAdminStatus: () => Promise<void>;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        setUserPermissions([]);
        return;
      }

      // Vérifier si l'utilisateur est admin
      const { data: adminCheck, error: adminError } = await supabase.rpc(
        'is_admin',
        { user_uuid: user.id }
      );

      if (adminError) {
        console.error('Erreur vérification admin:', adminError);
        setIsAdmin(false);
      } else {
        setIsAdmin(adminCheck === true);
      }

      // Récupérer les permissions de l'utilisateur
      const { data: permissions, error: permError } = await supabase.rpc(
        'get_user_permissions',
        { user_uuid: user.id }
      );

      if (permError) {
        console.error('Erreur permissions:', permError);
        setUserPermissions([]);
      } else {
        const permissionNames = (permissions || []).map((p: any) => p.permission_name);
        setUserPermissions(permissionNames);
      }

    } catch (error) {
      console.error('Erreur lors de la vérification admin:', error);
      setIsAdmin(false);
      setUserPermissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    return isAdmin || userPermissions.includes(permission);
  };

  useEffect(() => {
    checkAdminStatus();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          checkAdminStatus();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value: AdminContextType = {
    isAdmin,
    userPermissions,
    hasPermission,
    checkAdminStatus,
    isLoading,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};
