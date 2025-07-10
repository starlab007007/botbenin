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
  register: (userData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const runAuthInit = async () => {
      // Si déjà connecté => pas de mode guest
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        setIsLoading(false);
      });
    };
    runAuthInit();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          setIsGuest(false);
          setGuestUser(null);
          // Create AuthUser from Supabase user
          const authUser: AuthUser = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Utilisateur',
            email: session.user.email || '',
            role: 'user', // Default role
            permissions: rolePermissions.user,
            status: 'active',
            createdAt: new Date(session.user.created_at),
            lastLogin: new Date(),
            subscription: {
              type: 'free',
              status: 'active'
            },
            chatHistory: []
          };
          setUser(authUser);
        } else {
          // Pas de session : conserver l’état guest si configuré
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
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
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        toast({
          title: "Connexion réussie",
          description: `Bienvenue !`,
        });
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
    return false;
  };

  const loginWithPhone = async (phone: string, password: string): Promise<boolean> => {
    // For now, use email login with phone as email
    return login(phone, password);
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
        toast({
          title: "Compte créé avec succès",
          description: "Vérifiez votre email pour confirmer votre compte. Vous pouvez déjà vous connecter.",
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
      register,
      logout,
      updateProfile,
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
