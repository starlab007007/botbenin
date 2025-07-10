
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RefreshCw, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
// Refactored subcomponents
import { DashboardGlobalStats } from './owner-dashboard/DashboardGlobalStats';
import { TopPerformingBotCard } from './owner-dashboard/TopPerformingBotCard';
import { LastActivityCard } from './owner-dashboard/LastActivityCard';
import { BotsSummaryList } from './owner-dashboard/BotsSummaryList';

// Types
interface OwnerDashboardProps {
  onViewBotAnalytics: (botId: string, botName: string) => void;
}
interface DashboardStats {
  total_bots: number;
  active_bots: number;
  total_users: number;
  total_sessions: number;
  total_messages: number;
  active_users_24h: number;
  messages_24h: number;
  avg_session_duration: number;
  top_performing_bot_id: string;
  top_performing_bot_name: string;
  last_activity: string;
}
interface BotSummary {
  bot_id: string;
  bot_name: string;
  is_active: boolean;
  total_unique_users: number;
  total_messages: number;
  messages_24h: number;
  last_message_at: string;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ onViewBotAnalytics }) => {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [botsSummary, setBotsSummary] = useState<BotSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchDashboardStats(),
        fetchBotsSummary()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement du dashboard:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le dashboard",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      const { data, error } = await supabase.rpc('get_owner_dashboard_stats', {
        owner_uuid: ownerData.id
      });

      if (error) {
        console.error('Erreur statistiques dashboard:', error);
        return;
      }

      if (data && data.length > 0) {
        setDashboardStats(data[0]);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des stats:', error);
    }
  };

  const fetchBotsSummary = async () => {
    const { data, error } = await supabase
      .from('detailed_bot_stats')
      .select(`
        bot_id,
        bot_name,
        is_active,
        total_unique_users,
        total_messages,
        messages_24h,
        last_message_at
      `)
      .order('total_messages', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Erreur résumé des bots:', error);
      return;
    }

    setBotsSummary(data || []);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardStats) {
    return (
      <Card className="p-8 text-center">
        <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Aucun chatbot trouvé
        </h3>
        <p className="text-gray-600">
          Créez votre premier chatbot pour voir les statistiques
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-gray-600">Vue d'ensemble de vos chatbots et analytics</p>
        </div>
        <Button variant="outline" onClick={fetchDashboardData} className="w-full sm:w-auto">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques globales */}
      <DashboardGlobalStats
        totalBots={dashboardStats.total_bots}
        activeBots={dashboardStats.active_bots}
        totalUsers={dashboardStats.total_users}
        activeUsers24h={dashboardStats.active_users_24h}
        totalMessages={dashboardStats.total_messages}
        messages24h={dashboardStats.messages_24h}
        avgSessionDuration={dashboardStats.avg_session_duration}
        totalSessions={dashboardStats.total_sessions}
      />

      {/* Meilleur bot et dernière activité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TopPerformingBotCard
          topBotId={dashboardStats.top_performing_bot_id}
          topBotName={dashboardStats.top_performing_bot_name}
          onViewBotAnalytics={onViewBotAnalytics}
        />
        <LastActivityCard lastActivity={dashboardStats.last_activity} />
      </div>

      {/* Résumé des bots */}
      <BotsSummaryList
        botsSummary={botsSummary}
        onViewBotAnalytics={onViewBotAnalytics}
      />
    </div>
  );
};
