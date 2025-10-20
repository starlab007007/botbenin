import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useIACreatorAdmin = () => {
  const queryClient = useQueryClient();

  // Récupération des stats globales
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ia-creator-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_creator_admin_stats')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Récupération des utilisateurs avec leur utilisation
  const { data: usersUsage, isLoading: usersLoading } = useQuery({
    queryKey: ['ia-creator-users-usage'],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: usageData, error } = await supabase
        .from('ia_creator_user_usage')
        .select('*')
        .eq('year_month', currentMonth);
      
      if (error) throw error;
      
      // Enrichir avec les emails des utilisateurs depuis bot_owners et users
      const enrichedData = await Promise.all(
        (usageData || []).map(async (usage) => {
          const { data: ownerData } = await supabase
            .from('bot_owners')
            .select('*')
            .eq('user_id', usage.user_id)
            .single();
          
          return {
            ...usage,
            user: {
              id: usage.user_id,
              email: ownerData?.user_id || 'N/A', // Nous utiliserons l'ID comme fallback
            },
          };
        })
      );
      
      return enrichedData;
    },
  });

  // Récupération des créations récentes
  const { data: creations, isLoading: creationsLoading } = useQuery({
    queryKey: ['ia-creator-creations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visual_creations')
        .select(`
          *,
          moderation:ia_creator_moderation(*)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Récupération des limites par pack
  const { data: limits, isLoading: limitsLoading } = useQuery({
    queryKey: ['ia-creator-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ia_creator_usage_limits')
        .select('*')
        .order('monthly_images', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Mutation pour modérer une création
  const moderateCreation = useMutation({
    mutationFn: async ({ 
      creationId, 
      status, 
      notes 
    }: { 
      creationId: string; 
      status: 'approved' | 'rejected' | 'flagged'; 
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('ia_creator_moderation')
        .upsert({
          creation_id: creationId,
          status,
          moderator_id: user.id,
          moderation_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Modération appliquée');
      queryClient.invalidateQueries({ queryKey: ['ia-creator-creations'] });
      queryClient.invalidateQueries({ queryKey: ['ia-creator-stats'] });
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mutation pour supprimer une création
  const deleteCreation = useMutation({
    mutationFn: async (creationId: string) => {
      const { error } = await supabase
        .from('visual_creations')
        .delete()
        .eq('id', creationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Création supprimée');
      queryClient.invalidateQueries({ queryKey: ['ia-creator-creations'] });
      queryClient.invalidateQueries({ queryKey: ['ia-creator-stats'] });
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mutation pour ajuster les limites d'un pack
  const updatePackLimits = useMutation({
    mutationFn: async ({
      planName,
      limits,
    }: {
      planName: string;
      limits: Partial<{
        monthly_images: number;
        monthly_flyers: number;
        monthly_videos: number;
        storage_gb: number;
        is_unlimited: boolean;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('ia_creator_usage_limits')
        .update(limits)
        .eq('plan_name', planName)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Limites mises à jour');
      queryClient.invalidateQueries({ queryKey: ['ia-creator-limits'] });
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Mutation pour réinitialiser le compteur d'un utilisateur
  const resetUserUsage = useMutation({
    mutationFn: async (userId: string) => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { error } = await supabase
        .from('ia_creator_user_usage')
        .update({
          images_created: 0,
          flyers_created: 0,
          videos_created: 0,
          last_reset_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('year_month', currentMonth);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Compteur réinitialisé');
      queryClient.invalidateQueries({ queryKey: ['ia-creator-users-usage'] });
    },
    onError: (error: any) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  return {
    stats,
    usersUsage,
    creations,
    limits,
    isLoading: statsLoading || usersLoading || creationsLoading || limitsLoading,
    moderateCreation,
    deleteCreation,
    updatePackLimits,
    resetUserUsage,
  };
};