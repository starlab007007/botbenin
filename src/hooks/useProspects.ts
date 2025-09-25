import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface Prospect {
  id: string;
  database_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  source: string;
  status: string;
  score: number;
  notes?: string;
  tags?: any;
  custom_fields?: any;
  last_contact_date?: string;
  next_follow_up?: string;
  created_at: string;
  updated_at: string;
}

interface UseProspectsProps {
  databaseId?: string;
  searchTerm?: string;
}

export function useProspects({ databaseId, searchTerm = '' }: UseProspectsProps = {}) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const { toast } = useToast();

  // Cache intelligent - évite les requêtes trop fréquentes
  const shouldRefetch = useCallback(() => {
    const now = Date.now();
    return now - lastFetch > 10000; // 10 secondes pour les prospects
  }, [lastFetch]);

  const fetchProspects = useCallback(async (force = false) => {
    if (!force && !shouldRefetch()) {
      return;
    }

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
        setProspects([]);
        setIsLoading(false);
        return;
      }

      console.log('Récupération des prospects pour user:', userData.user.id);
      
      let query = supabase
        .from("prospects")
        .select(`
          *,
          prospect_databases:database_id(name)
        `)
        .eq('user_id', userData.user.id);

      // Filtrer par base de données si spécifié
      if (databaseId) {
        query = query.eq('database_id', databaseId);
      }

      // Filtrer par terme de recherche si spécifié
      if (searchTerm.trim()) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) {
        console.error('Erreur récupération prospects:', error);
        throw error;
      }

      console.log('Prospects récupérés:', data?.length || 0);
      // Déduplication côté client pour éviter les doublons
      const uniqueProspects = data ? data.filter((prospect, index, self) => 
        index === self.findIndex(p => 
          p.id === prospect.id || 
          (p.email === prospect.email && p.company === prospect.company && p.phone === prospect.phone && 
           p.email && p.company && p.phone) // Déduplication par critères métier
        )
      ) : [];
      console.log('Après déduplication:', uniqueProspects.length);
      setProspects(uniqueProspects);
      setLastFetch(Date.now());
    } catch (error: any) {
      console.error('Erreur dans fetchProspects:', error);
      setError(error);
      setProspects([]);
    } finally {
      setIsLoading(false);
    }
  }, [databaseId, searchTerm, shouldRefetch]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const createProspect = useCallback(async (prospectData: Omit<Prospect, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      
      if (!userData?.user) {
        throw new Error("Vous devez être connecté.");
      }

      console.log('Création prospect:', prospectData);
      
      const { data: inserted, error: insertError } = await supabase
        .from("prospects")
        .insert([{
          ...prospectData,
          user_id: userData.user.id,
        }])
        .select("*")
        .single();

      if (insertError) {
        console.error('Erreur création prospect:', insertError);
        throw insertError;
      }

      console.log('Prospect créé:', inserted);
      // Vérifier les doublons avant d'ajouter
      setProspects((prev) => {
        const existingIds = new Set(prev.map(p => p.id));
        if (existingIds.has(inserted.id)) {
          console.log('Prospect déjà présent, pas de duplication');
          return prev;
        }
        return [inserted, ...prev];
      });
      
      toast({
        title: "Prospect créé",
        description: `Le prospect "${prospectData.first_name} ${prospectData.last_name}" a été créé avec succès.`,
      });
      
      return inserted;
    } catch (error: any) {
      console.error('Erreur création prospect:', error);
      setError(error);
      
      let errorMessage = "Impossible de créer le prospect";
      if (error?.message?.includes('duplicate key')) {
        errorMessage = "Un prospect avec cette information existe déjà";
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
  }, [toast]);

  const updateProspect = useCallback(async (id: string, updates: Partial<Prospect>) => {
    const { error, data: updated } = await supabase
      .from("prospects")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();
    
    if (error) {
      console.error('Erreur mise à jour prospect:', error);
      return { error, updated: null };
    }
    
    if (updated) {
      setProspects(prev => prev.map(prospect => prospect.id === id ? updated : prospect));
      toast({
        title: "Prospect mis à jour",
        description: "Les modifications ont été sauvegardées.",
      });
    }
    
    return { error: null, updated };
  }, [toast]);

  const deleteProspect = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("prospects")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error('Erreur suppression prospect:', error);
      return { error };
    }
    
    setProspects(prev => prev.filter(prospect => prospect.id !== id));
    toast({
      title: "Prospect supprimé",
      description: "Le prospect a été supprimé avec succès.",
    });
    
    return { error: null };
  }, [toast]);

  // Statistiques calculées
  const stats = useMemo(() => {
    const totalProspects = prospects.length;
    const statusCounts = prospects.reduce((acc, prospect) => {
      acc[prospect.status] = (acc[prospect.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgScore = totalProspects > 0 
      ? Math.round(prospects.reduce((sum, p) => sum + p.score, 0) / totalProspects)
      : 0;

    return {
      totalProspects,
      statusCounts,
      avgScore,
      newProspects: statusCounts['new'] || 0,
      qualifiedProspects: statusCounts['qualified'] || 0,
      contactedProspects: statusCounts['contacted'] || 0,
      convertedProspects: statusCounts['converted'] || 0,
    };
  }, [prospects]);

  return { 
    prospects, 
    isLoading, 
    error,
    stats,
    createProspect, 
    fetchProspects, 
    updateProspect, 
    deleteProspect,
    refreshProspects: () => fetchProspects(true)
  };
}