import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  content: any;
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  segment?: any;
  metrics?: any;
  results?: any;
}

interface UseCampaignsProps {
  databaseId?: string;
  status?: string;
}

export const useCampaigns = ({ databaseId, status }: UseCampaignsProps = {}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCampaigns = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter logic can be added here when needed

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setCampaigns(data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des campagnes');
      toast({
        title: "Erreur",
        description: "Impossible de charger les campagnes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [databaseId, status, toast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async (campaignData: Omit<Campaign, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error: createError } = await supabase
        .from('campaigns')
        .insert([{
          ...campaignData,
          user_id: user.user.id
        }])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      setCampaigns(prev => [data, ...prev]);
      
      toast({
        title: "Campagne créée",
        description: `La campagne "${data.name}" a été créée avec succès.`,
      });

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la création de la campagne';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setCampaigns(prev => prev.map(campaign => 
        campaign.id === id ? { ...campaign, ...data } : campaign
      ));

      toast({
        title: "Campagne mise à jour",
        description: "Les modifications ont été sauvegardées.",
      });

      return { error: null, updated: data };
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la mise à jour';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
      return { error: err, updated: null };
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
      
      toast({
        title: "Campagne supprimée",
        description: "La campagne a été supprimée avec succès.",
      });

      return { error: null };
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la suppression';
      setError(errorMessage);
      toast({
        title: "Erreur", 
        description: errorMessage,
        variant: "destructive"
      });
      return { error: err };
    }
  };

  const stats = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
    const draftCampaigns = campaigns.filter(c => c.status === 'draft').length;
    const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled').length;

    const statusCounts = campaigns.reduce((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeCounts = campaigns.reduce((acc, campaign) => {
      acc[campaign.type] = (acc[campaign.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      draftCampaigns,
      scheduledCampaigns,
      statusCounts,
      typeCounts
    };
  }, [campaigns]);

  const refreshCampaigns = useCallback(() => {
    fetchCampaigns(true);
  }, [fetchCampaigns]);

  return {
    campaigns,
    isLoading,
    error,
    stats,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    fetchCampaigns,
    refreshCampaigns
  };
};