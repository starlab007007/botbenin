
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { GuestAuthService, GuestUser } from "@/services/GuestAuthService";
import { AuthContextType, AuthUser } from './auth/types';
import { useAuthOperations } from './auth/useAuthOperations';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const { toast } = useToast();

  const { login, loginWithPhone, register, logout, createAuthUserFromSupabase } = useAuthOperations();

  useEffect(() => {
    const runAuthInit = async () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        setIsLoading(false);
      });
    };
    runAuthInit();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          setIsGuest(false);
          setGuestUser(null);
          const authUser = createAuthUserFromSupabase(session.user);
          setUser(authUser);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

  const handleLogout = () => {
    logout();
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
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
      logout: handleLogout,
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
