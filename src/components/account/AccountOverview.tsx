import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Bot, 
  Activity,
  Clock,
  Zap,
  Shield
} from 'lucide-react';

interface DashboardStats {
  totalBots: number;
  totalMessages: number;
  totalSessions: number;
  activeBots: number;
  lastActivity: string | null;
}

export const AccountOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBots: 0,
    totalMessages: 0,
    totalSessions: 0,
    activeBots: 0,
    lastActivity: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le bot_owner
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return;

      // Récupérer les statistiques des bots
      const { data: botsData } = await supabase
        .from('bots')
        .select('id, is_active')
        .eq('owner_id', ownerData.id);

      const totalBots = botsData?.length || 0;
      const activeBots = botsData?.filter(b => b.is_active).length || 0;

      // Récupérer les messages
      const { count: messagesCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('bot_id', botsData?.map(b => b.id) || []);

      // Récupérer les sessions
      const { count: sessionsCount } = await supabase
        .from('enhanced_chat_sessions')
        .select('*', { count: 'exact', head: true })
        .in('bot_id', botsData?.map(b => b.id) || []);

      // Dernière activité
      const { data: lastActivityData } = await supabase
        .from('chat_messages')
        .select('created_at')
        .in('bot_id', botsData?.map(b => b.id) || [])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setStats({
        totalBots,
        totalMessages: messagesCount || 0,
        totalSessions: sessionsCount || 0,
        activeBots,
        lastActivity: lastActivityData?.created_at || null
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Chatbots',
      value: stats.totalBots,
      subtitle: `${stats.activeBots} actifs`,
      icon: Bot,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Messages',
      value: stats.totalMessages,
      subtitle: 'Total échangés',
      icon: MessageSquare,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Sessions',
      value: stats.totalSessions,
      subtitle: 'Conversations',
      icon: Users,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      title: 'Activité',
      value: stats.lastActivity 
        ? new Date(stats.lastActivity).toLocaleDateString('fr-FR')
        : 'Aucune',
      subtitle: 'Dernière interaction',
      icon: Activity,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-16 bg-muted rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                  <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary"></div>
            </Card>
          );
        })}
      </div>

      {/* Activités récentes */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Aperçu de l'activité</h3>
            <p className="text-sm text-muted-foreground">Vue d'ensemble de votre utilisation</p>
          </div>
          <Badge variant="outline" className="gap-2">
            <Activity className="w-3 h-3" />
            Temps réel
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Temps de réponse moyen</p>
              <p className="text-2xl font-bold">2.3s</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Taux de succès</p>
              <p className="text-2xl font-bold">98.5%</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Sécurité</p>
              <p className="text-2xl font-bold text-green-600">Optimal</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
