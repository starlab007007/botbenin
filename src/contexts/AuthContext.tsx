import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { GuestAuthService, GuestUser } from "@/services/GuestAuthService";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  avatar?: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'pending';
  lastLogin?: Date;
  createdAt: Date;
  subscription?: {
    type: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'expired' | 'cancelled';
    expiresAt?: Date;
  };
  chatHistory: Array<{
    id: string;
    timestamp: Date;
    messages: Array<{
      content: string;
      isUser: boolean;
      timestamp: Date;
    }>;
  }>;
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  guestUser: GuestUser | null;
  enableGuestMode: () => void;
  disableGuestMode: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPhone: (phone: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  register: (userData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rolePermissions = {
  admin: [
    'read_all', 'write_all', 'delete_all', 'manage_users', 'manage_roles',
    'view_analytics', 'manage_automations', 'access_all_modules', 'manage_subscriptions'
  ],
  manager: [
    'read_all', 'write_most', 'manage_team', 'view_analytics', 
    'manage_automations', 'access_business_modules'
  ],
  user: [
    'read_own', 'write_own', 'use_automations', 'access_basic_modules', 'manage_profile'
  ],
  viewer: [
    'read_limited', 'view_dashboards'
  ]
};

const allowedRoles = ['admin', 'manager', 'user', 'viewer'] as const;

const createAuthUser = (
  supabaseUser: SupabaseUser,
  role: AuthUser['role'] = 'user',
  permissions: string[] = rolePermissions.user
): AuthUser => ({
  id: supabaseUser.id,
  name: supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.email?.split('@')[0] ||
        'Utilisateur',
  email: supabaseUser.email || '',
  avatar: supabaseUser.user_metadata?.avatar_url ||
          supabaseUser.user_metadata?.picture,
  role,
  permissions,
  status: 'active',
  createdAt: new Date(supabaseUser.created_at),
  lastLogin: new Date(),
  subscription: {
    type: 'free',
    status: 'active'
  },
  chatHistory: []
});

const normalizeRole = (roleName?: string): AuthUser['role'] => {
  if (roleName === 'super_admin') return 'admin';
  return allowedRoles.includes(roleName as AuthUser['role']) ? (roleName as AuthUser['role']) : 'user';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const enrichUser = async (currentUser: SupabaseUser) => {
      try {
        const roleResponse = await Promise.race([
          supabase
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', currentUser.id)
            .limit(10),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Role fetch timeout')), 2500))
        ]) as any;

        if (roleResponse.error) {
          console.error('Error fetching role:', roleResponse.error);
        }

        const roleNames = (roleResponse.data || [])
          .map((row: any) => Array.isArray(row.roles) ? row.roles[0]?.name : row.roles?.name)
          .filter(Boolean);
        const selectedRole = roleNames.includes('admin') || roleNames.includes('super_admin')
          ? 'admin'
          : roleNames[0];
        const normalizedRole = normalizeRole(selectedRole);

        const permissionsResponse = await Promise.race([
          supabase.rpc('get_user_permissions', { user_uuid: currentUser.id }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Permissions fetch timeout')), 2500))
        ]) as any;

        const permissions = permissionsResponse.data?.map((p: any) => p.permission_name) || rolePermissions[normalizedRole];

        if (mounted) {
          setUser(createAuthUser(currentUser, normalizedRole, permissions));
        }
      } catch (error) {
        console.error('Error fetching role and permissions:', error);
        if (mounted) {
          setUser((previous) => previous ?? createAuthUser(currentUser));
        }
      }
    };

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setSupabaseUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setIsGuest(false);
        setGuestUser(null);
        setUser(createAuthUser(nextSession.user));
        setIsLoading(false);
        void enrichUser(nextSession.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => applySession(nextSession)
    );

    supabase.auth.getSession()
      .then(({ data }) => applySession(data.session))
      .catch((error) => {
        console.error('Error getting session:', error);
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erreur de connexion",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      if (data.user) {
        toast({
          title: "Connexion réussie",
          description: `Bienvenue !`,
        });
        return true;
      }
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
    
    return false;
  };

  const loginWithPhone = async (phone: string, password: string): Promise<boolean> => {
    // For now, use email login with phone as email
    return login(phone, password);
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        toast({
          title: "Erreur de connexion Google",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      toast({
        title: "Erreur de connexion Google",
        description: "Une erreur est survenue lors de la connexion avec Google",
        variant: "destructive",
      });
      return false;
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.name,
            phone: userData.phone,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        // Gérer les erreurs spécifiques d'inscription
        let errorMessage = error.message;
        
        if (error.message?.includes('User already registered')) {
          errorMessage = "Un compte existe déjà avec cette adresse email";
        } else if (error.message?.includes('Password should be at least')) {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères";
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = "Veuillez vérifier votre email et cliquer sur le lien de confirmation";
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = "Adresse email invalide";
        }
        
        toast({
          title: "Erreur d'inscription",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        // Vérifier si l'email a été confirmé automatiquement
        const isConfirmed = data.user.email_confirmed_at !== null;
        
        toast({
          title: "Compte créé avec succès",
          description: isConfirmed 
            ? "Votre compte est prêt à utiliser !" 
            : "Vérifiez votre email pour confirmer votre compte. Vous pouvez déjà vous connecter.",
        });
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Erreur d'inscription",
        description: "Une erreur est survenue lors de la création du compte",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
      setSession(null);
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
        variant: "destructive",
      });
    }
  };

  const updateProfile = (updates: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // D'abord, vérifier le mot de passe actuel en tentant de se reconnecter
      if (!supabaseUser?.email) {
        toast({
          title: "Erreur",
          description: "Email utilisateur non trouvé",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: supabaseUser.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Erreur",
          description: "Mot de passe actuel incorrect",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      // Si la vérification réussit, changer le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        let errorMessage = error.message;
        
        if (error.message?.includes('Password should be at least')) {
          errorMessage = "Le nouveau mot de passe doit contenir au moins 6 caractères";
        }
        
        toast({
          title: "Erreur de changement de mot de passe",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      toast({
        title: "Mot de passe changé",
        description: "Votre mot de passe a été mis à jour avec succès",
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Password change error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du changement de mot de passe",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        let errorMessage = error.message;
        
        if (error.message?.includes('Email not found')) {
          errorMessage = "Aucun compte trouvé avec cette adresse email";
        } else if (error.message?.includes('Email rate limit exceeded')) {
          errorMessage = "Trop de tentatives. Veuillez réessayer plus tard";
        }
        
        toast({
          title: "Erreur de réinitialisation",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      toast({
        title: "Email envoyé",
        description: "Un lien de réinitialisation a été envoyé à votre adresse email",
      });
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Password reset error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la réinitialisation",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const enableGuestMode = () => {
    // Si déjà authentifié, on ne fait rien
    if (supabaseUser || user) return;
    const guest = GuestAuthService.getGuestUser();
    setIsGuest(true);
    setGuestUser(guest);
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    setIsLoading(false);
  };
  const disableGuestMode = () => {
    GuestAuthService.clearGuest();
    setIsGuest(false);
    setGuestUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      supabaseUser,
      session,
      isAuthenticated: !!session && !!supabaseUser,
      isGuest,
      guestUser,
      enableGuestMode,
      disableGuestMode,
      login,
      loginWithPhone,
      loginWithGoogle,
      register,
      logout,
      updateProfile,
      changePassword,
      resetPassword,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
