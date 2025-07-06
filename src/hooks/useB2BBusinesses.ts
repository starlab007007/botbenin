
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface B2BBusiness {
  id: string;
  name: string;
  company_name: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin_url?: string;
  job_title?: string;
  location?: string;
  industry?: string;
  company_size?: string;
  coordinates?: [number, number];
  search_session_id?: string;
  source?: string;
  created_at: string;
}

export const useB2BBusinesses = () => {
  const [businesses, setBusinesses] = useState<B2BBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchBusinesses = async (sessionId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('b2b_businesses' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (sessionId) {
        query = query.eq('search_session_id', sessionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        coordinates: item.coordinates ? JSON.parse(item.coordinates) : undefined
      }));
      
      setBusinesses(transformedData);
    } catch (error) {
      console.error('Error fetching B2B businesses:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les entreprises B2B",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveBusinesses = async (businessesData: Omit<B2BBusiness, 'id' | 'created_at'>[], sessionId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('User not authenticated');
      }

      const businessesToInsert = businessesData.map(business => ({
        ...business,
        user_id: userData.user.id,
        search_session_id: sessionId,
        source: 'b2b_search',
        coordinates: business.coordinates ? JSON.stringify(business.coordinates) : null
      }));

      const { data, error } = await supabase
        .from('b2b_businesses' as any)
        .insert(businessesToInsert)
        .select();

      if (error) throw error;

      await fetchBusinesses(sessionId);
      
      toast({
        title: "Succès",
        description: `${businessesToInsert.length} entreprises sauvegardées`,
      });

      return data;
    } catch (error) {
      console.error('Error saving B2B businesses:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les entreprises",
        variant: "destructive",
      });
      throw error;
    }
  };

  const transferToProspects = async (businessIds: string[], databaseId: string) => {
    try {
      const { data, error } = await supabase.rpc('transfer_b2b_businesses_to_prospects' as any, {
        business_ids: businessIds,
        target_database_id: databaseId
      });

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${data} entreprises transférées vers les prospects`,
      });

      return data;
    } catch (error) {
      console.error('Error transferring businesses:', error);
      toast({
        title: "Erreur",
        description: "Impossible de transférer les entreprises",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  return {
    businesses,
    isLoading,
    fetchBusinesses,
    saveBusinesses,
    transferToProspects,
  };
};
