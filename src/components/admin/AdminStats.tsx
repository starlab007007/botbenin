
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, Bot, MessageSquare, Shield, TrendingUp, Activity } from 'lucide-react';

interface AdminStatsData {
  total_users: number;
  active_users_24h: number;
  active_users_7d: number;
  new_users_30d: number;
  total_bots: number;
  active_bots: number;
  total_campaigns: number;
  active_campaigns: number;
  total_messages_24h: number;
  total_subscriptions: number;
  revenue_monthly: number;
}

export const AdminStats: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      
      if (error) {
        console.error('Erreur stats:', error);
        // Utiliser des données de fallback
        setStats({
          total_users: 0,
          active_users_24h: 0,
          active_users_7d: 0,
          new_users_30d: 0,
          total_bots: 0,
          active_bots: 0,
          total_campaigns: 0,
          active_campaigns: 0,
          total_messages_24h: 0,
          total_subscriptions: 0,
          revenue_monthly: 0
        });
      } else {
        setStats(data?.[0] || {
          total_users: 0,
          active_users_24h: 0,
          active_users_7d: 0,
          new_users_30d: 0,
          total_bots: 0,
          active_bots: 0,
          total_campaigns: 0,
          active_campaigns: 0,
          total_messages_24h: 0,
          total_subscriptions: 0,
          revenue_monthly: 0
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
      setStats({
        total_users: 0,
        active_users_24h: 0,
        active_users_7d: 0,
        new_users_30d: 0,
        total_bots: 0,
        active_bots: 0,
        total_campaigns: 0,
        active_campaigns: 0,
        total_messages_24h: 0,
        total_subscriptions: 0,
        revenue_monthly: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Total Utilisateurs',
      value: stats?.total_users || 0,
      change: `+${stats?.new_users_30d || 0} ce mois`,
      icon: Users,
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Utilisateurs Actifs 24h',
      value: stats?.active_users_24h || 0,
      change: `${stats?.active_users_7d || 0} cette semaine`,
      icon: Activity,
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Total Bots',
      value: stats?.total_bots || 0,
      change: `${stats?.active_bots || 0} actifs`,
      icon: Bot,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Messages 24h',
      value: stats?.total_messages_24h || 0,
      change: 'Conversations actives',
      icon: MessageSquare,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Campagnes Actives',
      value: stats?.active_campaigns || 0,
      change: `${stats?.total_campaigns || 0} au total`,
      icon: TrendingUp,
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Abonnements',
      value: stats?.total_subscriptions || 0,
      change: `€${stats?.revenue_monthly || 0}/mois`,
      icon: Shield,
      color: 'from-indigo-500 to-indigo-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
              </div>
              <p className="text-xs text-gray-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vue d'ensemble de la plateforme</CardTitle>
          <CardDescription>
            Métriques clés et indicateurs de performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {((stats?.active_users_24h || 0) / Math.max(stats?.total_users || 1, 1) * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-blue-700">Taux d'activité utilisateurs</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {((stats?.active_bots || 0) / Math.max(stats?.total_bots || 1, 1) * 100).toFixed(1)}%
              </div>
              <p className="text-sm text-green-700">Taux d'activation bots</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {Math.round((stats?.total_messages_24h || 0) / Math.max(stats?.active_bots || 1, 1))}
              </div>
              <p className="text-sm text-purple-700">Messages/bot/jour</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
