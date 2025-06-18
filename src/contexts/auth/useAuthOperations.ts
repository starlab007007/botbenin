
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AuthUser, rolePermissions } from './types';
import { User as SupabaseUser } from '@supabase/supabase-js';

export const useAuthOperations = () => {
  const { toast } = useToast();

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
    return login(phone, password);
  };

  const register = async (userData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<boolean> => {
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
        toast({
          title: "Erreur d'inscription",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      if (data.user) {
        toast({
          title: "Compte créé avec succès",
          description: "Vérifiez votre email pour confirmer votre compte",
        });
        return true;
      }
    } catch (error) {
      toast({
        title: "Erreur d'inscription",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    }
    
    return false;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
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

  const createAuthUserFromSupabase = (supabaseUser: SupabaseUser): AuthUser => {
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Utilisateur',
      email: supabaseUser.email || '',
      role: 'user',
      permissions: rolePermissions.user,
      status: 'active',
      createdAt: new Date(supabaseUser.created_at),
      lastLogin: new Date(),
      subscription: {
        type: 'free',
        status: 'active'
      },
      chatHistory: []
    };
  };

  return {
    login,
    loginWithPhone,
    register,
    logout,
    createAuthUserFromSupabase
  };
};
