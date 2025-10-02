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
    console.log('[Auth] Setting up authentication...');

    // ÉTAPE 1: Configurer le listener AVANT toute initialisation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('[Auth] Auth state change:', event, session?.user?.email || 'No user');
        setSession(session);
        setSupabaseUser(session?.user ?? null);

        if (session?.user) {
          setIsGuest(false);
          setGuestUser(null);

          // Create AuthUser from Supabase user with Google info
          const authUser: AuthUser = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Utilisateur',
            email: session.user.email || '',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            role: 'user',
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
          console.log('[Auth] User state updated:', authUser.email);

          // UNIQUEMENT envoyer notification sur SIGNED_IN (nouvelle connexion)
          if (event === 'SIGNED_IN') {
            console.log('[Auth] New sign-in detected, creating bot owner and sending notification...');
            
            // Utiliser setTimeout pour éviter le deadlock Supabase
            setTimeout(async () => {
              try {
                const { data: ownerId, error: ownerError } = await supabase
                  .rpc('get_or_create_bot_owner', { user_uuid: session.user.id });

                if (ownerError) throw ownerError;
                console.log('[Auth] Bot owner created/verified:', ownerId);

                // Envoyer une notification de connexion
                const { error: notificationError } = await supabase.functions.invoke(
                  'send-login-notification',
                  {
                    body: {
                      email: session.user.email,
                      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
                      provider: session.user.app_metadata?.provider || 'google',
                      loginTime: new Date().toISOString(),
                      ipAddress: session.user.user_metadata?.ip_address,
                      userAgent: navigator.userAgent
                    }
                  }
                );

                if (notificationError) {
                  console.error('[Auth] Error sending login notification:', notificationError);
                } else {
                  console.log('[Auth] Login notification sent successfully');
                }
              } catch (error) {
                console.error('[Auth] Error in post-signin operations:', error);
              }
            }, 0);
          }
        } else {
          setUser(null);
          console.log('[Auth] User signed out');
        }
      }
    );

    // ÉTAPE 2: Initialiser la session APRÈS avoir configuré le listener
    const initializeAuth = async () => {
      try {
        console.log('[Auth] Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Error getting session:', error);
        } else if (session) {
          console.log('[Auth] Existing session found:', session.user.email);
          // Le listener onAuthStateChange se chargera de mettre à jour l'état
        } else {
          console.log('[Auth] No existing session');
        }
      } catch (error) {
        console.error('[Auth] Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      console.log('[Auth] Cleanup: unsubscribed from auth changes');
    };
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

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      console.log('[Auth] Starting Google OAuth...');
      
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
        console.error('[Auth] Google OAuth error:', error);
        toast({
          title: "Erreur de connexion Google",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      console.log('[Auth] Google OAuth redirect initiated');
      // OAuth redirect - ne pas désactiver loading ici car l'utilisateur sera redirigé
      return true;
    } catch (error) {
      console.error('[Auth] Google OAuth exception:', error);
      toast({
        title: "Erreur de connexion Google",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
      setIsLoading(false);
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
      // Vérifier que le client Supabase est configuré
      console.log('[Auth] Starting registration for:', userData.email);
      
      // Étape 1: Inscription Supabase avec retry
      let data, error;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        const result = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: userData.name,
              phone: userData.phone
            }
          }
        });
        
        data = result.data;
        error = result.error;
        
        // Si pas d'erreur d'API key, sortir de la boucle
        if (!error || !error.message?.includes('API key')) {
          break;
        }
        
        retryCount++;
        console.warn(`[Auth] API key error, retry ${retryCount}/${maxRetries}`);
        
        // Attendre un peu avant de réessayer
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (error) {
        console.error('[Auth] Signup error:', error);
        
        let errorMessage = error.message;
        
        if (error.message?.includes('API key')) {
          errorMessage = "Problème de configuration. Veuillez vider le cache de votre navigateur (Ctrl+Shift+R) et réessayer.";
        } else if (error.message?.includes('already registered') || error.message?.includes('duplicate')) {
          errorMessage = "Un compte existe déjà avec cette adresse email";
        } else if (error.message?.includes('Password')) {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères";
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = "Veuillez vérifier votre email et cliquer sur le lien de confirmation";
        } else if (error.message?.includes('Invalid email')) {
          errorMessage = "Adresse email invalide";
        } else if (error.status === 500) {
          errorMessage = "Erreur serveur. Veuillez réessayer dans quelques instants.";
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
        // Étape 2: Créer manuellement le bot_owner (méthode additive)
        try {
          // Utiliser la fonction RPC qui gère automatiquement les conflits
          const { data: ownerId, error: ownerError } = await supabase
            .rpc('get_or_create_bot_owner', { user_uuid: data.user.id });
          
          if (ownerError) {
            console.error('Bot owner creation error (non-blocking):', ownerError);
          } else {
            console.log('Bot owner créé/récupéré avec succès:', ownerId);
          }
        } catch (ownerError) {
          console.error('Bot owner creation error (non-blocking):', ownerError);
          // Ne pas bloquer l'inscription même si la création du bot_owner échoue
        }
        
        toast({
          title: "Compte créé avec succès",
          description: "Vérifiez votre email pour confirmer votre compte.",
        });
        setIsLoading(false);
        return true;
      }
    } catch (error: any) {
      console.error('Registration exception:', error);
      toast({
        title: "Erreur d'inscription",
        description: error?.message || "Une erreur est survenue lors de la création du compte",
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
