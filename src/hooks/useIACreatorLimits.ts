import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useIACreatorLimits = (userId: string | undefined, creationType: 'image' | 'flyer' | 'video') => {
  return useQuery({
    queryKey: ['ia-creator-limits', userId, creationType],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('check_ia_creator_limit', {
        p_user_id: userId,
        p_creation_type: creationType,
      });

      if (error) throw error;
      return data as {
        allowed: boolean;
        unlimited: boolean;
        used?: number;
        limit?: number;
        remaining?: number;
      };
    },
    enabled: !!userId,
  });
};