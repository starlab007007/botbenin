import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { GuestAuthService, GuestUser } from "@/services/GuestAuthService";
import { friendlyAuthError } from "@/lib/authErrors";

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

type AuthRole = AuthUser['role'];

const validRoles: AuthRole[] = ['admin', 'manager', 'user', 'viewer'];
const rolePriority: Record<AuthRole, number> = { admin: 4, manager: 3, user: 2, viewer: 1 };

const normalizeRoleName = (value: unknown): AuthRole | null => {
  return typeof value === 'string' && validRoles.includes(value as AuthRole) ? (value as AuthRole) : null;
};

const getHighestRole = (rows: any[] | null | undefined): AuthRole => {
  const roles = (rows || [])
    .map((row) => normalizeRoleName(Array.isArray(row?.roles) ? row.roles[0]?.name : row?.roles?.name))
    .filter(Boolean) as AuthRole[];

  return roles.sort((a, b) => rolePriority[b] - rolePriority[a])[0] || 'user';
};

const withTimeout = <T,>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs)),
  ]);
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
    let cancelled = false;

    const buildBaseUser = (sUser: SupabaseUser, role: AuthRole, perms: string[]): AuthUser => ({
      id: sUser.id,
      name:
        sUser.user_metadata?.full_name ||
        sUser.user_metadata?.name ||
        sUser.email?.split('@')[0] ||
        'Utilisateur',
      email: sUser.email || '',
      avatar: sUser.user_metadata?.avatar_url || sUser.user_metadata?.picture,
      role,
      permissions: perms,
      status: 'active',
      createdAt: new Date(sUser.created_at),
      lastLogin: new Date(),
      subscription: { type: 'free', status: 'active' },
      chatHistory: [],
    });

    // Background enrichment — NEVER blocks isLoading. Runs after session is set.
    const enrichUser = async (sUser: SupabaseUser) => {
      let userRole: AuthRole = 'user';
      let permissions: string[] = rolePermissions.user;

      try {
        const [roleRes, permRes] = await Promise.allSettled([
          withTimeout(
            supabase
              .from('user_roles')
              .select(`roles ( name )`)
              .eq('user_id', sUser.id)
              .limit(10),
            4000,
            'Role fetch',
          ),
          withTimeout(
            supabase.rpc('get_user_permissions', { user_uuid: sUser.id }),
            4000,
            'Permissions fetch',
          ),
        ]);

        if (roleRes.status === 'fulfilled') {
          const { data, error } = roleRes.value as any;
          if (!error) userRole = getHighestRole(data);
        } else {
          console.warn('[Auth] role enrichment skipped:', roleRes.reason?.message);
        }

        if (permRes.status === 'fulfilled') {
          const { data, error } = permRes.value as any;
          if (!error && Array.isArray(data) && data.length) {
            permissions = data.map((p: any) => p.permission_name);
          } else {
            permissions = rolePermissions[userRole];
          }
        } else {
          console.warn('[Auth] permissions enrichment skipped:', permRes.reason?.message);
          permissions = rolePermissions[userRole];
        }
      } catch (e) {
        console.warn('[Auth] enrichment error:', e);
      }

      if (cancelled) return;
      setUser((prev) => (prev && prev.id === sUser.id ? { ...prev, role: userRole, permissions } : prev));
    };

    const handleSession = (event: string, session: Session | null) => {
      if (event === 'SIGNED_IN') {
        try {
          localStorage.removeItem('waouh_web_session_id');
          Object.keys(localStorage)
            .filter(
              (k) =>
                k.startsWith('waouh_notifs_') ||
                k.startsWith('waouh_open_matches_') ||
                k.startsWith('waouh_active_match_') ||
                k.startsWith('waouh_archived_matches_'),
            )
            .forEach((k) => localStorage.removeItem(k));
        } catch {}
      }

      setSession(session);
      setSupabaseUser(session?.user ?? null);

      if (session?.user) {
        setIsGuest(false);
        setGuestUser(null);
        // Set user immediately with defaults — UI no longer waits on DB roundtrips.
        setUser((prev) =>
          prev && prev.id === session.user.id
            ? prev
            : buildBaseUser(session.user, 'user', rolePermissions.user),
        );
        setIsLoading(false);
        // Defer enrichment to avoid the Supabase onAuthStateChange deadlock pattern.
        setTimeout(() => {
          if (!cancelled) enrichUser(session.user);
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(event, session);
    });

    // Initial session load
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        handleSession('INITIAL', session);
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
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
      // Reset WAOUH per-browser session so a different account on the same
      // browser doesn't inherit the previous user's chat/notifications history.
      try {
        localStorage.removeItem("waouh_web_session_id");
        localStorage.removeItem("waouh_geo_v1");
        // Wipe per-session caches (notifications, open match tabs, archived list)
        Object.keys(localStorage)
          .filter((k) =>
            k.startsWith("waouh_notifs_") ||
            k.startsWith("waouh_open_matches_") ||
            k.startsWith("waouh_active_match_") ||
            k.startsWith("waouh_archived_matches_")
          )
          .forEach((k) => localStorage.removeItem(k));
      } catch {}
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
