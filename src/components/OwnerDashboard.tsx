
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  Users, 
  MessageSquare, 
  Activity,
  TrendingUp,
  Calendar,
  RefreshCw,
  Eye,
  BarChart3
} from 'lucide-react';

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-gray-600">Vue d'ensemble de vos chatbots et analytics</p>
        </div>
        <Button variant="outline" onClick={fetchDashboardData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{dashboardStats.total_bots}</div>
                <div className="text-sm text-gray-600">Chatbots totaux</div>
                <div className="text-xs text-green-600">
                  {dashboardStats.active_bots} actifs
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{dashboardStats.total_users}</div>
                <div className="text-sm text-gray-600">Utilisateurs totaux</div>
                <div className="text-xs text-orange-600">
                  {dashboardStats.active_users_24h} actifs 24h
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{dashboardStats.total_messages}</div>
                <div className="text-sm text-gray-600">Messages totaux</div>
                <div className="text-xs text-blue-600">
                  {dashboardStats.messages_24h} aujourd'hui
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(dashboardStats.avg_session_duration || 0)}
                </div>
                <div className="text-sm text-gray-600">Msgs/session moy.</div>
                <div className="text-xs text-gray-500">
                  {dashboardStats.total_sessions} sessions
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meilleur bot et dernière activité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span>Bot le plus performant</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardStats.top_performing_bot_name ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {dashboardStats.top_performing_bot_name}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewBotAnalytics(
                      dashboardStats.top_performing_bot_id,
                      dashboardStats.top_performing_bot_name
                    )}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Voir
                  </Button>
                </div>
                <p className="text-gray-600 text-sm">
                  Ce bot génère le plus de conversations et d'engagement.
                </p>
              </div>
            ) : (
              <p className="text-gray-600">Aucun bot actif</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Dernière activité</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-semibold text-gray-900">
                {dashboardStats.last_activity 
                  ? new Date(dashboardStats.last_activity).toLocaleString('fr-FR')
                  : 'Aucune activité'
                }
              </div>
              <p className="text-gray-600 text-sm">
                {dashboardStats.last_activity 
                  ? 'Dernière interaction utilisateur enregistrée'
                  : 'Aucune interaction utilisateur détectée'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Résumé des bots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span>Résumé des chatbots</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {botsSummary.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun chatbot trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {botsSummary.map((bot) => (
                <div key={bot.bot_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      bot.is_active ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <div>
                      <div className="font-medium text-gray-900">{bot.bot_name}</div>
                      <div className="text-sm text-gray-600">
                        {bot.total_unique_users} utilisateurs • {bot.total_messages} messages
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {bot.messages_24h} msgs aujourd'hui
                      </div>
                      <div className="text-xs text-gray-500">
                        Dernière activité: {bot.last_message_at 
                          ? new Date(bot.last_message_at).toLocaleDateString('fr-FR')
                          : 'Jamais'
                        }
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewBotAnalytics(bot.bot_id, bot.bot_name)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Analytics
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
