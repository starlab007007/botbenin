import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  profile?: {
    bio?: string;
    avatar_url?: string;
    preferences: any;
    social_links: any;
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
  authProvider?: 'email' | 'google';
  emailVerified?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier la session actuelle au chargement
    checkUser();
    
    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email);
        
        if (session?.user) {
          console.log('Session utilisateur détectée, chargement du profil...');
          await loadUserProfile(session.user.id);
        } else {
          console.log('Aucune session, réinitialisation de l\'utilisateur');
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('Session existante trouvée:', session.user.email);
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', error);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Chargement du profil pour:', userId);
      
      // Récupérer les données utilisateur depuis la table users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (
            bio,
            avatar_url,
            preferences,
            social_links
          ),
          user_roles (
            roles (
              name,
              role_permissions (
                permissions (name, action, resource)
              )
            )
          ),
          bot_owners (
            subscription_plan,
            max_bots
          )
        `)
        .eq('id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Erreur lors du chargement du profil:', userError);
        return;
      }

      if (userData) {
        console.log('Données utilisateur chargées:', userData.email);
        
        // Construire les permissions à partir des rôles
        const permissions: string[] = [];
        const roleName = userData.user_roles?.[0]?.roles?.name || 'user';
        
        userData.user_roles?.forEach((userRole: any) => {
          userRole.roles?.role_permissions?.forEach((rp: any) => {
            permissions.push(`${rp.permissions.action}:${rp.permissions.resource}`);
          });
        });

        // Handle bot_owners data safely
        const botOwnerData = Array.isArray(userData.bot_owners) ? userData.bot_owners[0] : userData.bot_owners;
        const subscriptionPlan = botOwnerData?.subscription_plan || 'free';

        const authUser: AuthUser = {
          id: userData.id,
          name: userData.full_name || '',
          email: userData.email || '',
          phone: userData.phone,
          role: roleName as any || 'user',
          permissions: permissions.length > 0 ? permissions : rolePermissions[roleName as keyof typeof rolePermissions] || [],
          status: userData.is_active ? 'active' : 'inactive',
          lastLogin: userData.last_login ? new Date(userData.last_login) : undefined,
          createdAt: new Date(userData.created_at),
          subscription: {
            type: subscriptionPlan as 'free' | 'pro' | 'enterprise',
            status: 'active'
          },
          profile: userData.user_profiles?.[0] || undefined,
          chatHistory: [],
          authProvider: userData.auth_provider === 'google' ? 'google' : 'email',
          emailVerified: userData.email_verified || false
        };

        console.log('Profil utilisateur construit:', authUser.email, authUser.authProvider);
        setUser(authUser);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
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
        // Mettre à jour la dernière connexion
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);

        // Enregistrer l'activité de connexion
        await supabase.rpc('log_user_activity', {
          p_user_id: data.user.id,
          p_activity_type: 'login',
          p_description: 'Connexion par email',
          p_metadata: { method: 'email' }
        });

        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
        });
        
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      toast({
        title: "Erreur de connexion",
        description: "Une erreur est survenue lors de la connexion",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
    return false;
  };

  const loginWithPhone = async (phone: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Rechercher l'utilisateur par téléphone
      const { data: userData, error: searchError } = await supabase
        .from('users')
        .select('email')
        .eq('phone', phone)
        .single();

      if (searchError || !userData) {
        toast({
          title: "Erreur de connexion",
          description: "Numéro de téléphone ou mot de passe incorrect",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      // Utiliser l'email trouvé pour la connexion
      return await login(userData.email, password);
    } catch (error) {
      console.error('Erreur de connexion par téléphone:', error);
      toast({
        title: "Erreur de connexion",
        description: "Une erreur est survenue lors de la connexion",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      console.log('Démarrage de la connexion Google...');
      
      // Détecter l'environnement et définir l'URL de redirection appropriée
      const isLocalhost = window.location.hostname === 'localhost';
      const baseUrl = isLocalhost 
        ? 'http://localhost:3000'
        : 'https://bot.bj';
      
      const redirectTo = `${baseUrl}/account`;

      console.log('Google auth redirect URL:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Erreur Google Auth:', error);
        toast({
          title: "Erreur de connexion Google",
          description: `Erreur: ${error.message}. Vérifiez la configuration OAuth dans Supabase.`,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      // La redirection se fera automatiquement
      console.log('Redirection Google initiée avec succès');
      
      // Ne pas désactiver le loading ici car la redirection va se faire
      return true;
    } catch (error) {
      console.error('Erreur de connexion Google:', error);
      toast({
        title: "Erreur de connexion Google",
        description: "Une erreur est survenue lors de la connexion avec Google",
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
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.name,
            phone: userData.phone
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        toast({
          title: "Compte créé avec succès",
          description: `Bienvenue ${userData.name}! ${data.user.email_confirmed_at ? 'Votre compte est activé.' : 'Vérifiez votre email pour activer votre compte.'}`,
        });
        
        setIsLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erreur de déconnexion:', error);
      }
      
      setUser(null);
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès",
      });
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
    }
  };

  const updateProfile = async (updates: Partial<AuthUser>) => {
    if (!user) return;

    try {
      // Mettre à jour la table users
      const userUpdates: any = {};
      if (updates.name !== undefined) userUpdates.full_name = updates.name;
      if (updates.phone !== undefined) userUpdates.phone = updates.phone;

      if (Object.keys(userUpdates).length > 0) {
        await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', user.id);
      }

      // Mettre à jour le profil étendu
      if (updates.profile) {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            ...updates.profile,
            updated_at: new Date().toISOString()
          });
      }

      // Recharger le profil
      await loadUserProfile(user.id);
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      loginWithPhone,
      loginWithGoogle,
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
