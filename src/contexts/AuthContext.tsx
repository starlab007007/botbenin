
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface ExtendedUser extends User {
  name?: string;
  permissions?: string[];
  lastLogin?: Date;
  createdAt?: Date;
  subscription?: {
    type: string;
    status: string;
  };
  phone?: string;
  role?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPhone: (phone: string, password: string) => Promise<boolean>;
  register: (data: { name: string; email: string; phone?: string; password: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: any) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          // Extend user with additional properties
          const extendedUser: ExtendedUser = {
            ...session.user,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Utilisateur',
            permissions: ['read_own', 'write_own'],
            lastLogin: new Date(),
            createdAt: new Date(session.user.created_at),
            role: 'user',
            phone: session.user.user_metadata?.phone,
            subscription: {
              type: 'free',
              status: 'active'
            }
          };
          setUser(extendedUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const extendedUser: ExtendedUser = {
          ...session.user,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Utilisateur',
          permissions: ['read_own', 'write_own'],
          lastLogin: new Date(),
          createdAt: new Date(session.user.created_at),
          role: 'user',
          phone: session.user.user_metadata?.phone,
          subscription: {
            type: 'free',
            status: 'active'
          }
        };
        setUser(extendedUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    setIsLoading(false);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    return { error };
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setIsLoading(false);
    return !error;
  };

  const loginWithPhone = async (phone: string, password: string) => {
    setIsLoading(true);
    // For now, use email-based login with phone as identifier
    const { error } = await supabase.auth.signInWithPassword({
      email: phone,
      password,
    });
    setIsLoading(false);
    return !error;
  };

  const register = async (data: { name: string; email: string; phone?: string; password: string }) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
          phone: data.phone,
        },
      },
    });
    setIsLoading(false);
    return !error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const logout = () => {
    supabase.auth.signOut();
  };

  const updateProfile = (data: any) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!user,
        signUp,
        signIn,
        signOut,
        login,
        loginWithPhone,
        register,
        logout,
        updateProfile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
