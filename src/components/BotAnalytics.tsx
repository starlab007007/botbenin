
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Clock, 
  TrendingUp,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BotAnalyticsProps {
  botId: string;
  botName: string;
  onBack: () => void;
}

interface Analytics {
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
  averageSessionDuration: number;
  topHours: Array<{ hour: number; count: number }>;
  recentSessions: Array<{
    id: string;
    started_at: string;
    total_messages: number;
    session_metadata: any;
  }>;
}

export const BotAnalytics: React.FC<BotAnalyticsProps> = ({ botId, botName, onBack }) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, [botId]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);

      // Récupérer les statistiques générales
      const { data: statsData } = await supabase
        .from('bot_stats')
        .select('*')
        .eq('bot_id', botId)
        .single();

      // Récupérer les sessions récentes
      const { data: sessionsData } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('bot_id', botId)
        .order('started_at', { ascending: false })
        .limit(10);

      // Récupérer les messages pour analyser les heures de pointe
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('bot_id', botId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      // Analyser les heures de pointe
      const hourCounts: Record<number, number> = {};
      messagesData?.forEach(message => {
        const hour = new Date(message.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const topHours = Object.entries(hourCounts)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalMessages: statsData?.total_messages || 0,
        totalUsers: statsData?.total_users || 0,
        activeToday: statsData?.active_today || 0,
        averageSessionDuration: 5, // Placeholder
        topHours,
        recentSessions: sessionsData || []
      });

    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h2 className="text-2xl font-bold">Chargement...</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics - {botName}</h2>
          <p className="text-gray-600">Statistiques détaillées de votre bot</p>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Messages</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalMessages || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Utilisateurs</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.totalUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Actifs aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.activeToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Durée moy. (min)</p>
                <p className="text-2xl font-bold text-gray-900">{analytics?.averageSessionDuration || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heures de pointe */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Heures de pointe</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.topHours.map((hour, index) => (
                <div key={hour.hour} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {hour.hour}h - {hour.hour + 1}h
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${(hour.count / (analytics.topHours[0]?.count || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{hour.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sessions récentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Sessions récentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.recentSessions.slice(0, 5).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(session.started_at).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.started_at).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {session.total_messages} messages
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
