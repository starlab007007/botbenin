import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Activity,
  TrendingUp,
  Clock,
  Link,
  Eye,
  ArrowLeft,
  RefreshCw,
  Calendar,
  Globe
} from 'lucide-react';

interface CompleteBotAnalyticsProps {
  botId: string;
  botName: string;
  onBack: () => void;
}

interface BotAnalytics {
  bot_id: string;
  bot_name: string;
  owner_id: string;
  is_active: boolean;
  bot_created_at: string;
  total_unique_users: number;
  active_users_24h: number;
  active_users_7d: number;
  active_users_30d: number;
  total_sessions: number;
  sessions_24h: number;
  active_sessions: number;
  total_messages: number;
  user_messages: number;
  bot_messages: number;
  messages_24h: number;
  avg_messages_per_session: number;
  avg_session_duration_minutes: number;
  total_short_links: number;
  total_link_clicks: number;
  last_user_activity: string;
  last_message_at: string;
  engagement_rate_7d: number;
  response_rate_percent: number;
}

export const CompleteBotAnalytics: React.FC<CompleteBotAnalyticsProps> = ({
  botId,
  botName,
  onBack
}) => {
  const [analytics, setAnalytics] = useState<BotAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // LOG: Props reçues
  useEffect(() => {
    console.log(`[CompleteBotAnalytics] Chargement analytics pour: botId=${botId}, botName=${botName}`);
  }, [botId, botName]);

  useEffect(() => {
    fetchAnalytics();
  }, [botId]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      // LOG: Requête analytics Supabase
      console.log(`[CompleteBotAnalytics] Requête Supabase pour bot_id: `, botId);

      const { data, error } = await supabase
        .from('complete_bot_analytics')
        .select('*')
        .eq('bot_id', botId)
        .single();

      // LOG: Résultat brut
      console.log(`[CompleteBotAnalytics] Résultat analytics récupéré:`, data, error);

      if (error) throw error;

      setAnalytics(data);

      // LOG: Statistiques principales (si data bien reçue)
      if (data) {
        const msg = `
[CompleteBotAnalytics] Statistiques clés:
- Utilisateurs uniques: ${data.total_unique_users}
- Utilisateurs actifs 24h: ${data.active_users_24h}
- Utilisateurs actifs 7j: ${data.active_users_7d}
- Messages totaux: ${data.total_messages}
- Sessions: ${data.total_sessions}
- Sessions actives: ${data.active_sessions}
- Dernière activité: ${data.last_user_activity}
- Taux d'engagement 7j: ${data.engagement_rate_7d}
- Taux de réponse: ${data.response_rate_percent}
        `;
        console.log(msg);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les analytics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
        <Card className="p-8 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucune donnée disponible
          </h3>
          <p className="text-gray-600">
            Les analytics pour ce bot ne sont pas encore disponibles
          </p>
        </Card>
      </div>
    );
  }

  const userEngagementRate = analytics.total_unique_users > 0 
    ? ((analytics.active_users_7d / analytics.total_unique_users) * 100).toFixed(1)
    : '0';

  const responseRate = analytics.user_messages > 0
    ? ((analytics.bot_messages / analytics.user_messages) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{botName}</h1>
            <p className="text-gray-600">Analytics complètes</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchAnalytics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.total_unique_users)}
                </div>
                <div className="text-sm text-gray-600">Utilisateurs uniques</div>
                <div className="text-xs text-green-600">
                  {formatNumber(analytics.active_users_24h)} actifs 24h
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.total_messages)}
                </div>
                <div className="text-sm text-gray-600">Messages totaux</div>
                <div className="text-xs text-blue-600">
                  {formatNumber(analytics.messages_24h)} aujourd'hui
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.total_sessions)}
                </div>
                <div className="text-sm text-gray-600">Sessions totales</div>
                <div className="text-xs text-orange-600">
                  {formatNumber(analytics.active_sessions)} actives
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Link className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatNumber(analytics.total_link_clicks)}
                </div>
                <div className="text-sm text-gray-600">Clics liens</div>
                <div className="text-xs text-purple-600">
                  {formatNumber(analytics.total_short_links)} liens créés
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métriques de qualité */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span>Engagement Utilisateurs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Taux d'engagement (7j)</span>
                  <span className="text-sm font-medium">{userEngagementRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(parseFloat(userEngagementRate), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">{formatNumber(analytics.active_users_24h)}</div>
                  <div className="text-xs text-gray-500">24h</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{formatNumber(analytics.active_users_7d)}</div>
                  <div className="text-xs text-gray-500">7j</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">{formatNumber(analytics.active_users_30d)}</div>
                  <div className="text-xs text-gray-500">30j</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Qualité des Sessions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {analytics.avg_messages_per_session.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Messages par session</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {analytics.avg_session_duration_minutes.toFixed(1)} min
                </div>
                <div className="text-sm text-gray-600">Durée moyenne</div>
              </div>
              <div className="text-xs text-gray-500">
                Taux de réponse: {responseRate}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span>Activité Récente</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-900">Dernier message</div>
                <div className="text-xs text-gray-600">
                  {formatDate(analytics.last_message_at)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Dernière activité</div>
                <div className="text-xs text-gray-600">
                  {formatDate(analytics.last_user_activity)}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Bot créé le</div>
                <div className="text-xs text-gray-600">
                  {formatDate(analytics.bot_created_at)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition des messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <span>Répartition des Messages</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {formatNumber(analytics.user_messages)}
              </div>
              <div className="text-sm text-gray-600">Messages utilisateurs</div>
              <div className="text-xs text-gray-500">
                {analytics.total_messages > 0 
                  ? ((analytics.user_messages / analytics.total_messages) * 100).toFixed(1)
                  : 0}% du total
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatNumber(analytics.bot_messages)}
              </div>
              <div className="text-sm text-gray-600">Réponses du bot</div>
              <div className="text-xs text-gray-500">
                {analytics.total_messages > 0 
                  ? ((analytics.bot_messages / analytics.total_messages) * 100).toFixed(1)
                  : 0}% du total
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {formatNumber(analytics.total_messages)}
              </div>
              <div className="text-sm text-gray-600">Total messages</div>
              <div className="text-xs text-gray-500">
                {formatNumber(analytics.messages_24h)} dernières 24h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
