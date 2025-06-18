
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BotStats {
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

export const useBotStats = () => {
  const [botStats, setBotStats] = useState<Record<string, BotStats>>({});

  const fetchBotsStatsFromView = async (botIds: string[]) => {
    try {
      console.log('Récupération des statistiques pour les bots:', botIds);
      
      const { data: statsData, error } = await supabase
        .from('detailed_bot_stats')
        .select('bot_id, total_unique_users, total_messages, active_users_24h')
        .in('bot_id', botIds);

      if (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        return;
      }

      console.log('Statistiques récupérées:', statsData);

      const stats: Record<string, BotStats> = {};
      statsData?.forEach(stat => {
        stats[stat.bot_id] = {
          totalMessages: stat.total_messages || 0,
          totalUsers: stat.total_unique_users || 0,
          activeToday: stat.active_users_24h || 0
        };
      });

      console.log('Statistiques formatées:', stats);
      setBotStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  return {
    botStats,
    fetchBotsStatsFromView
  };
};
