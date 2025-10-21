
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeText } from '@/components/security/SafeText';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Activity,
  TrendingUp,
  Clock,
  ArrowLeft,
  Download,
  RefreshCw,
  Calendar,
  Eye
} from 'lucide-react';

interface DetailedBotAnalyticsProps {
  botId: string;
  botName: string;
  onBack: () => void;
}

interface BotStats {
  bot_id: string;
  bot_name: string;
  owner_id: string;
  is_active: boolean;
  total_unique_users: number;
  total_sessions: number;
  total_messages: number;
  active_users_24h: number;
  sessions_24h: number;
  messages_24h: number;
  last_user_activity: string;
  last_message_at: string;
  avg_messages_per_session: number;
  user_messages: number;
  bot_messages: number;
  active_sessions: number;
  avg_session_duration_minutes: number;
}

interface PerformanceMetric {
  bot_id: string;
  bot_name: string;
  owner_id: string;
  date: string;
  unique_users: number;
  sessions: number;
  total_messages: number;
  user_messages: number;
  bot_responses: number;
  avg_messages_per_session: number;
  unique_ips: number;
  avg_session_duration_minutes: number;
}

interface ConversationHistory {
  message_id: string;
  message_content: string;
  message_type: string;
  message_timestamp: string;
  user_name: string;
  user_email: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  session_start: string;
  message_order_in_session: number;
}

export const DetailedBotAnalytics: React.FC<DetailedBotAnalyticsProps> = ({ 
  botId, 
  botName, 
  onBack 
}) => {
  const [botStats, setBotStats] = useState<BotStats | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    fetchAllAnalytics();
  }, [botId]);

  const fetchAllAnalytics = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        fetchBotStats(),
        fetchPerformanceMetrics(),
        fetchConversationHistory()
      ]);
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

  const fetchBotStats = async () => {
    const { data, error } = await supabase
      .from('detailed_bot_stats')
      .select('*')
      .eq('bot_id', botId)
      .single();

    if (error) {
      console.error('Erreur statistiques détaillées:', error);
      return;
    }

    setBotStats(data);
  };

  const fetchPerformanceMetrics = async () => {
    const { data, error } = await supabase
      .from('bot_performance_metrics')
      .select('*')
      .eq('bot_id', botId)
      .order('date', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Erreur métriques de performance:', error);
      return;
    }

    setPerformanceMetrics(data || []);
  };

  const fetchConversationHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      const { data, error } = await supabase.rpc('get_bot_detailed_history', {
        bot_uuid: botId,
        owner_uuid: ownerData.id,
        limit_count: 100,
        offset_count: 0
      });

      if (error) {
        console.error('Erreur historique des conversations:', error);
        return;
      }

      setConversationHistory(data || []);
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
    }
  };

  const exportData = () => {
    if (!botStats) return;

    const exportData = {
      bot_name: botStats.bot_name,
      statistics: botStats,
      performance_metrics: performanceMetrics,
      conversation_history: conversationHistory.slice(0, 50) // Limiter pour l'export
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${botStats.bot_name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export réussi",
      description: "Les analytics ont été exportées",
    });
  };

  if (isLoading || !botStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Analytics - {botStats.bot_name}</h2>
            <p className="text-gray-600">Analytics détaillées et historique complet</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchAllAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{botStats.total_unique_users}</div>
                <div className="text-sm text-gray-600">Utilisateurs uniques</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{botStats.total_messages}</div>
                <div className="text-sm text-gray-600">Messages totaux</div>
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
                <div className="text-2xl font-bold text-gray-900">{botStats.active_users_24h}</div>
                <div className="text-sm text-gray-600">Actifs 24h</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(botStats.avg_messages_per_session || 0)}
                </div>
                <div className="text-sm text-gray-600">Msgs/session</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets détaillés */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="overview" className="mt-0">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Statistiques détaillées</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Activité générale</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sessions totales</span>
                        <span className="font-medium">{botStats.total_sessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sessions 24h</span>
                        <span className="font-medium">{botStats.sessions_24h}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Messages 24h</span>
                        <span className="font-medium">{botStats.messages_24h}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Messages totaux</span>
                        <span className="font-medium">{botStats.total_messages}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Messages</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Messages utilisateurs</span>
                        <span className="font-medium">{botStats.user_messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Réponses bot</span>
                        <span className="font-medium">{botStats.bot_messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ratio réponse</span>
                        <span className="font-medium">
                          {botStats.user_messages > 0 
                            ? `${Math.round((botStats.bot_messages / botStats.user_messages) * 100)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Activité</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sessions actives</span>
                        <span className="font-medium">{botStats.active_sessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Durée moyenne</span>
                        <span className="font-medium">
                          {Math.round(botStats.avg_session_duration_minutes || 0)}min
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dernière activité</span>
                        <span className="font-medium">
                          {botStats.last_user_activity 
                            ? new Date(botStats.last_user_activity).toLocaleDateString('fr-FR')
                            : 'Jamais'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Statut</span>
                        <Badge variant={botStats.is_active ? "default" : "secondary"}>
                          {botStats.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="mt-0">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Métriques de performance (30 derniers jours)</h3>
                
                {performanceMetrics.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune donnée de performance disponible</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                          <th className="border border-gray-200 px-4 py-2 text-center">Utilisateurs</th>
                          <th className="border border-gray-200 px-4 py-2 text-center">Sessions</th>
                          <th className="border border-gray-200 px-4 py-2 text-center">Messages</th>
                          <th className="border border-gray-200 px-4 py-2 text-center">Durée moy.</th>
                          <th className="border border-gray-200 px-4 py-2 text-center">IPs uniques</th>
                        </tr>
                      </thead>
                      <tbody>
                        {performanceMetrics.map((metric, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2">
                              {new Date(metric.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              {metric.unique_users}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              {metric.sessions}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              {metric.total_messages}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              {Math.round(metric.avg_session_duration_minutes || 0)}min
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-center">
                              {metric.unique_ips}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="conversations" className="mt-0">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Historique des conversations</h3>
                
                {conversationHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune conversation trouvée</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {conversationHistory.map((message) => (
                      <div key={message.message_id} className={`p-4 rounded-lg border ${
                        message.message_type === 'user' 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-green-200 bg-green-50'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant={message.message_type === 'user' ? "default" : "secondary"}>
                              {message.message_type === 'user' ? 'Utilisateur' : 'Bot'}
                            </Badge>
                            <span className="text-sm font-medium text-gray-900">
                              {message.user_name || message.user_email || 'Utilisateur anonyme'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(message.message_timestamp).toLocaleString('fr-FR')}</span>
                          </div>
                        </div>
                        
                        <p className="text-gray-700 mb-2">
                          <SafeText maxLength={200}>{message.message_content}</SafeText>
                        </p>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Session: {message.session_id}</div>
                          {message.ip_address && <div>IP: {message.ip_address}</div>}
                          <div>Message #{message.message_order_in_session} de la session</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
};
