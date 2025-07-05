
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProspectDatabase {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useProspectDatabases = () => {
  const [databases, setDatabases] = useState<ProspectDatabase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchDatabases = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospect_databases')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDatabases(data || []);
    } catch (error) {
      console.error('Error fetching databases:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les bases de données",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDatabase = async (name: string, description?: string) => {
    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('prospect_databases')
        .insert({ 
          user_id: userData.user.id,
          name, 
          description,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchDatabases();
      toast({
        title: "Succès",
        description: "Base de données créée avec succès",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating database:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la base de données",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  return {
    databases,
    isLoading,
    fetchDatabases,
    createDatabase,
  };
};
