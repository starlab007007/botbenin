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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('AuthProvider: Initialisation...');
    let mounted = true;

    // Fonction pour traiter les changements d'état d'authentification
    const handleAuthStateChange = async (event: any, session: any) => {
      console.log('AuthProvider: Changement d\'état d\'auth:', event, session?.user?.email);
      
      if (!mounted) return;

      if (session?.user && event !== 'SIGNED_OUT') {
        console.log('AuthProvider: Session utilisateur détectée, chargement du profil...');
        setIsLoading(true);
        await loadUserProfile(session.user.id);
      } else {
        console.log('AuthProvider: Aucune session, réinitialisation de l\'utilisateur');
        setUser(null);
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    };

    // Vérifier la session actuelle
    const checkInitialSession = async () => {
      try {
        console.log('AuthProvider: Vérification de la session initiale...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Erreur lors de la récupération de la session:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        if (session?.user) {
          console.log('AuthProvider: Session existante trouvée:', session.user.email);
          await loadUserProfile(session.user.id);
        } else {
          console.log('AuthProvider: Aucune session existante');
        }
      } catch (error) {
        console.error('AuthProvider: Erreur lors de la vérification de la session:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Configurer l'écoute des changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Vérifier la session initiale
    checkInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('AuthProvider: Chargement du profil pour:', userId);
      
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
        console.error('AuthProvider: Erreur lors du chargement du profil:', userError);
        return;
      }

      if (userData) {
        console.log('AuthProvider: Données utilisateur chargées:', userData.email);
        
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

        console.log('AuthProvider: Profil utilisateur construit:', authUser.email, authUser.role, authUser.permissions);
        setUser(authUser);
      }
    } catch (error) {
      console.error('AuthProvider: Erreur lors du chargement du profil:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      console.log('AuthProvider: Tentative de connexion pour:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('AuthProvider: Erreur de connexion:', error);
        let errorMessage = "Une erreur est survenue lors de la connexion";
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Email ou mot de passe incorrect";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Veuillez confirmer votre email avant de vous connecter";
        } else if (error.message.includes('Too many requests')) {
          errorMessage = "Trop de tentatives. Veuillez réessayer dans quelques minutes";
        }

        toast({
          title: "Erreur de connexion",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        console.log('AuthProvider: Connexion réussie pour:', data.user.email);
        
        // Mettre à jour la dernière connexion
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);

        // Enregistrer l'activité de connexion
        try {
          await supabase.rpc('log_user_activity', {
            p_user_id: data.user.id,
            p_activity_type: 'login',
            p_description: 'Connexion par email',
            p_metadata: { method: 'email' }
          });
        } catch (activityError) {
          console.log('AuthProvider: Erreur lors de l\'enregistrement de l\'activité:', activityError);
        }

        // Ne pas charger le profil ici car onAuthStateChange le fera
        console.log('AuthProvider: Connexion terminée, attente de onAuthStateChange...');
        
        toast({
          title: "Connexion réussie",
          description: "Bienvenue !",
        });
        
        return true;
      }
    } catch (error) {
      console.error('AuthProvider: Erreur de connexion:', error);
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
        .eq('phone', phone.trim())
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
      setIsLoading(false); // Éviter le double loading
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
        email: userData.email.trim(),
        password: userData.password,
        options: {
          data: {
            full_name: userData.name.trim(),
            phone: userData.phone?.trim()
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        let errorMessage = "Une erreur est survenue lors de l'inscription";
        
        if (error.message.includes('already registered')) {
          errorMessage = "Un compte existe déjà avec cet email";
        } else if (error.message.includes('invalid email')) {
          errorMessage = "Format d'email invalide";
        } else if (error.message.includes('weak password')) {
          errorMessage = "Le mot de passe doit contenir au moins 6 caractères";
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
        const confirmationMessage = data.user.email_confirmed_at 
          ? 'Votre compte est activé et vous pouvez vous connecter.'
          : 'Vérifiez votre email pour activer votre compte.';

        toast({
          title: "Compte créé avec succès",
          description: `Bienvenue ${userData.name}! ${confirmationMessage}`,
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
      console.log('AuthProvider: Déconnexion...');
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

  console.log('AuthProvider: État actuel - user:', user?.email, 'isAuthenticated:', !!user, 'isLoading:', isLoading);

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

</edits_to_apply>
