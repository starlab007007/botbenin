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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setDatabases([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("prospect_databases")
        .select("*")
        .eq('user_id', userData.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Erreur récupération bases de données:', error);
        setError(error);
        setDatabases([]);
      } else {
        setDatabases(data || []);
      }
    } catch (error) {
      console.error('Erreur inattendue récupération bases de données:', error);
      setError(error);
      setDatabases([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function createDatabase(name: string, description?: string) {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        const error = "Vous devez être connecté.";
        setError(error);
        setIsLoading(false);
        return null;
      }
      
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
        setError(insertError);
        setIsLoading(false);
        return null;
      }

      if (inserted) {
        setDatabases((arr) => [inserted, ...arr]);
        toast({
          title: "Base de données créée",
          description: `La base "${name}" a été créée avec succès.`,
        });
        setIsLoading(false);
        return inserted;
      }
      
      setIsLoading(false);
      return null;
    } catch (error) {
      console.error('Erreur inattendue:', error);
      setError(error);
      setIsLoading(false);
      return null;
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