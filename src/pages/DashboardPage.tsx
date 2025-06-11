
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Bot, 
  TrendingUp,
  Calendar,
  Bell,
  Settings,
  Plus,
  Activity,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalUsers: number;
  totalMessages: number;
  totalBots: number;
  totalAutomations: number;
  activeToday: number;
  unreadNotifications: number;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalMessages: 0,
    totalBots: 0,
    totalAutomations: 0,
    activeToday: 0,
    unreadNotifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user stats
      const { data: userStats, error: userStatsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (userStatsError && userStatsError.code !== 'PGRST116') {
        throw userStatsError;
      }

      // Fetch bot stats
      const { data: botStats, error: botStatsError } = await supabase
        .from('bot_stats')
        .select('*')
        .eq('owner_id', user?.id);

      if (botStatsError && botStatsError.code !== 'PGRST116') {
        throw botStatsError;
      }

      // Fetch recent activities
      const { data: activities, error: activitiesError } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (activitiesError && activitiesError.code !== 'PGRST116') {
        throw activitiesError;
      }

      setStats({
        totalUsers: userStats?.total_bots || 0,
        totalMessages: userStats?.total_messages || 0,
        totalBots: userStats?.total_bots || 0,
        totalAutomations: userStats?.total_automations || 0,
        activeToday: botStats?.reduce((sum: number, bot: any) => sum + (bot.active_today || 0), 0) || 0,
        unreadNotifications: userStats?.unread_notifications || 0
      });

      setRecentActivities(activities || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données du tableau de bord",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Bots Actifs',
      value: stats.totalBots,
      icon: Bot,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%'
    },
    {
      title: 'Messages Aujourd\'hui',
      value: stats.activeToday,
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+8%'
    },
    {
      title: 'Total Messages',
      value: stats.totalMessages,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+23%'
    },
    {
      title: 'Automatisations',
      value: stats.totalAutomations,
      icon: Settings,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '+5%'
    }
  ];

  if (!user) {
    return (
      <div className="p-4 lg:p-8 bg-gray-50 min-h-screen">
        <Card className="p-8 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Non connecté</h2>
          <p className="text-gray-600">Vous devez être connecté pour accéder au tableau de bord.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Tableau de bord
          </h1>
          <p className="text-gray-600">
            Bienvenue {user.name}, voici un aperçu de votre activité.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Derniers 30 jours
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau Bot
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                </div>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <Card className="lg:col-span-2 p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Activité des Messages</h2>
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Voir détails
            </Button>
          </div>
          
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Graphique des messages</p>
              <p className="text-sm text-gray-500">Données en cours de chargement...</p>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Activité Récente</h2>
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Aucune activité récente</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 bg-white border border-gray-200 rounded-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="h-20 flex-col space-y-2 bg-blue-600 hover:bg-blue-700">
            <Bot className="w-6 h-6" />
            <span>Créer un Bot</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <MessageSquare className="w-6 h-6" />
            <span>Voir Messages</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col space-y-2">
            <Settings className="w-6 h-6" />
            <span>Automatisations</span>
          </Button>
        </div>
      </Card>

      {/* Notifications */}
      {stats.unreadNotifications > 0 && (
        <Card className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Vous avez {stats.unreadNotifications} notification(s) non lue(s)
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-blue-300 text-blue-700">
              Voir tout
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
