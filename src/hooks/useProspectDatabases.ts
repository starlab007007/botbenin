import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface ProspectDatabase {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useProspectDatabases() {
  const [databases, setDatabases] = useState<ProspectDatabase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchDatabases();
  }, []);

  async function fetchDatabases() {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Erreur authentification:', authError);
        throw authError;
      }
      
      if (!userData?.user) {
        console.log('Utilisateur non connecté');
        setDatabases([]);
        setIsLoading(false);
        return;
      }

      console.log('Récupération des bases pour user:', userData.user.id);
      const { data, error } = await supabase
        .from("prospect_databases")
        .select("*")
        .eq('user_id', userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Erreur récupération bases de données:', error);
        throw error;
      }

      console.log('Bases récupérées:', data);
      setDatabases(data || []);
    } catch (error: any) {
      console.error('Erreur dans fetchDatabases:', error);
      setError(error);
      setDatabases([]);
      
      // Si c'est une erreur RLS ou de permissions, on essaie de créer une base par défaut
      if (error?.code === 'PGRST301' || error?.message?.includes('permission denied')) {
        console.log('Tentative de création base par défaut...');
        try {
          await createDatabase('Ma première base', 'Base de données créée automatiquement');
        } catch (createError) {
          console.error('Impossible de créer la base par défaut:', createError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function createDatabase(name: string, description?: string) {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      if (!userData?.user) {
        throw new Error("Vous devez être connecté.");
      }

      console.log('Création base de données:', { name, description, user_id: userData.user.id });
      
      const { data: inserted, error: insertError } = await supabase
        .from("prospect_databases")
        .insert([{
          user_id: userData.user.id,
          name: name.trim(),
          description: description?.trim() || null,
          is_active: true
        }])
        .select("*")
        .single();

      if (insertError) {
        console.error('Erreur création base de données:', insertError);
        throw insertError;
      }

      console.log('Base créée:', inserted);
      setDatabases((arr) => [inserted, ...arr]);
      
      toast({
        title: "Base de données créée",
        description: `La base "${name}" a été créée avec succès.`,
      });
      
      return inserted;
    } catch (error: any) {
      console.error('Erreur création base:', error);
      setError(error);
      
      let errorMessage = "Impossible de créer la base de données";
      if (error?.message?.includes('duplicate key')) {
        errorMessage = "Une base avec ce nom existe déjà";
      } else if (error?.code === 'PGRST301') {
        errorMessage = "Problème de permissions. Veuillez vous reconnecter.";
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function updateDatabase(id: string, updates: Partial<Pick<ProspectDatabase, 'name' | 'description' | 'is_active'>>) {
    const { error, data: updated } = await supabase
      .from("prospect_databases")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    
    if (error) {
      console.error('Erreur mise à jour base de données:', error);
      return { error, updated: null };
    }
    
    if (updated) {
      setDatabases(prev => prev.map(db => db.id === id ? updated : db));
      toast({
        title: "Base de données mise à jour",
        description: "Les modifications ont été sauvegardées.",
      });
    }
    
    return { error: null, updated };
  }

  async function deleteDatabase(id: string) {
    const { error } = await supabase
      .from("prospect_databases")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error('Erreur suppression base de données:', error);
      return { error };
    }
    
    setDatabases(prev => prev.filter(db => db.id !== id));
    toast({
      title: "Base de données supprimée",
      description: "La base de données a été supprimée avec succès.",
    });
    
    return { error: null };
  }

  return { 
    databases, 
    isLoading, 
    error, 
    createDatabase, 
    fetchDatabases, 
    updateDatabase, 
    deleteDatabase 
  };
}