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

  // Contrôle plus strict des re-fetches pour éviter les boucles
  const shouldRefetch = useCallback((force: boolean = false) => {
    if (force) return true;
    const now = Date.now();
    return now - lastFetch > 30000; // Augmenté à 30 secondes pour éviter les requêtes excessives
  }, [lastFetch]);

  const fetchProspects = useCallback(async (force = false) => {
    // Éviter les requêtes multiples concurrentes
    if (isLoading && !force) {
      console.log('Requête déjà en cours, ignorée');
      return;
    }

    if (!shouldRefetch(force)) {
      console.log('Refetch non nécessaire');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      
      // Gestion améliorée des erreurs d'authentification
      if (authError) {
        console.error('Erreur authentification:', authError);
        if (authError.message?.includes('refresh_token_not_found')) {
          // Token expiré, redirection nécessaire vers login
          console.log('Token expiré, utilisateur déconnecté');
          setProspects([]);
          setError(new Error('Session expirée, veuillez vous reconnecter'));
          return;
        }
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
      if (searchTerm?.trim()) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) {
        console.error('Erreur récupération prospects:', error);
        throw error;
      }

      console.log('Prospects récupérés:', data?.length || 0);
      
      // Déduplication stricte côté client
      const uniqueProspects = data ? data.filter((prospect, index, self) => {
        const isDuplicate = self.findIndex(p => {
          // Déduplication par ID d'abord
          if (p.id === prospect.id) return true;
          
          // Puis par critères métier si tous les champs sont présents
          if (p.email && p.company && p.phone && 
              prospect.email && prospect.company && prospect.phone) {
            return p.email.toLowerCase() === prospect.email.toLowerCase() && 
                   p.company.toLowerCase() === prospect.company.toLowerCase() && 
                   p.phone === prospect.phone;
          }
          
          return false;
        }) === index;
        
        return isDuplicate;
      }) : [];
      
      console.log('Après déduplication:', uniqueProspects.length, 'prospects uniques');
      setProspects(uniqueProspects);
      setLastFetch(Date.now());
      
    } catch (error: any) {
      console.error('Erreur dans fetchProspects:', error);
      setError(error);
      if (!error.message?.includes('refresh_token_not_found')) {
        setProspects([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [databaseId, searchTerm, isLoading, shouldRefetch]);

  // Éviter la boucle infinie - useEffect ne dépend que des paramètres de recherche
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProspects();
    }, 100); // Debounce de 100ms
    
    return () => clearTimeout(timeoutId);
  }, [databaseId, searchTerm]); // Retirer fetchProspects des dépendances

  const createProspect = useCallback(async (prospectData: Omit<Prospect, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    // Éviter les créations multiples concurrentes
    if (isLoading) {
      console.log('Création déjà en cours, ignorée');
      return null;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        if (authError.message?.includes('refresh_token_not_found')) {
          setError(new Error('Session expirée, veuillez vous reconnecter'));
          return null;
        }
        throw authError;
      }
      
      if (!userData?.user) {
        throw new Error("Vous devez être connecté.");
      }

      // Vérification anti-doublons AVANT insertion - Critères plus stricts
      const duplicateCheckCriteria = {
        email: prospectData.email?.toLowerCase().trim(),
        company: prospectData.company?.toLowerCase().trim(),
        phone: prospectData.phone?.trim(),
        name: `${prospectData.first_name?.toLowerCase().trim()} ${prospectData.last_name?.toLowerCase().trim()}`
      };
      
      const existingDuplicate = prospects.find(p => {        
        // Vérification par email + entreprise (critères forts)
        if (duplicateCheckCriteria.email && duplicateCheckCriteria.company && p.email && p.company) {
          if (p.email.toLowerCase().trim() === duplicateCheckCriteria.email && 
              p.company.toLowerCase().trim() === duplicateCheckCriteria.company) {
            return true;
          }
        }
        
        // Vérification par nom complet + entreprise
        if (duplicateCheckCriteria.name && duplicateCheckCriteria.company && p.first_name && p.last_name && p.company) {
          const existingName = `${p.first_name.toLowerCase().trim()} ${p.last_name.toLowerCase().trim()}`;
          if (existingName === duplicateCheckCriteria.name && 
              p.company.toLowerCase().trim() === duplicateCheckCriteria.company) {
            return true;
          }
        }
        
        return false;
      });

      if (existingDuplicate) {
        console.log('🔒 Prospect déjà existant détecté:', existingDuplicate);
        toast({
          title: "Prospect déjà existant",
          description: `Un prospect similaire existe déjà: ${existingDuplicate.first_name} ${existingDuplicate.last_name} chez ${existingDuplicate.company}`,
          variant: "destructive"
        });
        return null;
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
        
        if (insertError.code === '23505') { // Contrainte d'unicité violée
          toast({
            title: "Prospect déjà existant",
            description: "Un prospect avec ces informations existe déjà dans la base de données.",
            variant: "destructive"
          });
          return null;
        }
        
        throw insertError;
      }

      console.log('Prospect créé:', inserted);
      
      // Mise à jour optimiste avec vérification STRICTE
      setProspects((prev) => {
        // Vérification finale anti-doublons par ID
        const alreadyExistsById = prev.some(p => p.id === inserted.id);
        if (alreadyExistsById) {
          console.log('🔒 Prospect déjà présent par ID, pas de duplication');
          return prev;
        }
        
        // Vérification par critères métier pour éviter les doublons logiques
        const alreadyExistsByBusiness = prev.some(p => {
          if (!p.email || !p.company || !p.phone || 
              !inserted.email || !inserted.company || !inserted.phone) {
            return false; // Skip si champs manquants
          }
          return p.email.toLowerCase() === inserted.email.toLowerCase() && 
                 p.company.toLowerCase() === inserted.company.toLowerCase() && 
                 p.phone === inserted.phone;
        });
        
        if (alreadyExistsByBusiness) {
          console.log('🔒 Prospect déjà présent par critères métier, pas de duplication');
          return prev;
        }
        
        console.log('✅ Ajout du nouveau prospect à la liste locale');
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
      if (error?.message?.includes('duplicate key') || error?.code === '23505') {
        errorMessage = "Un prospect avec ces informations existe déjà";
      } else if (error?.code === 'PGRST301') {
        errorMessage = "Problème de permissions. Veuillez vous reconnecter.";
      } else if (error?.message?.includes('refresh_token_not_found')) {
        errorMessage = "Session expirée, veuillez vous reconnecter.";
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
  }, [toast, isLoading, prospects]);

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
    // Éviter les suppressions multiples concurrentes
    if (isLoading) {
      console.log('Suppression déjà en cours, ignorée');
      return { error: new Error('Opération déjà en cours') };
    }

    const prospectToDelete = prospects.find(p => p.id === id);
    if (!prospectToDelete) {
      console.error('Prospect non trouvé pour suppression');
      return { error: new Error('Prospect non trouvé') };
    }

    setIsLoading(true);

    // Mise à jour optimiste immédiate
    const previousProspects = [...prospects];
    setProspects(prev => prev.filter(prospect => prospect.id !== id));
    
    try {
      const { error } = await supabase
        .from("prospects")
        .delete()
        .eq("id", id);
      
      if (error) {
        console.error('Erreur suppression prospect:', error);
        
        // Restaurer l'état précédent en cas d'erreur
        setProspects(previousProspects);
        
        let errorMessage = "Erreur lors de la suppression";
        if (error.message?.includes('refresh_token_not_found')) {
          errorMessage = "Session expirée, veuillez vous reconnecter.";
        }
        
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive"
        });
        
        return { error };
      }
      
      toast({
        title: "Prospect supprimé",
        description: `${prospectToDelete.first_name} ${prospectToDelete.last_name} a été supprimé avec succès.`,
      });
      
      return { error: null };
      
    } catch (error: any) {
      console.error('Exception lors de la suppression:', error);
      
      // Restaurer l'état précédent en cas d'exception
      setProspects(previousProspects);
      
      toast({
        title: "Erreur",
        description: "Une erreur technique est survenue lors de la suppression.",
        variant: "destructive"
      });
      
      return { error };
    } finally {
      setIsLoading(false);
    }
  }, [prospects, toast, isLoading]);

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