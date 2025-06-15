
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Bot, MessageSquare, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminStats {
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

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (error) throw error;
      return data[0] as AdminStats;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Erreur lors du chargement des statistiques</span>
          </div>
        </Card>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Utilisateurs Total',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Utilisateurs Actifs (24h)',
      value: stats?.active_users_24h || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Nouveaux Utilisateurs (30j)',
      value: stats?.new_users_30d || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Bots',
      value: stats?.total_bots || 0,
      icon: Bot,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Bots Actifs',
      value: stats?.active_bots || 0,
      icon: Bot,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Messages (24h)',
      value: stats?.total_messages_24h || 0,
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Abonnements Actifs',
      value: stats?.total_subscriptions || 0,
      icon: CreditCard,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: 'Revenus Mensuels',
      value: `${stats?.revenue_monthly || 0}€`,
      icon: TrendingUp,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Administrateur</h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble de la plateforme et des métriques clés</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
          Accès Administrateur
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Utilisateurs actifs cette semaine</span>
              <Badge variant="outline">{stats?.active_users_7d || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Campagnes actives</span>
              <Badge variant="outline">{stats?.active_campaigns || 0}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total campagnes</span>
              <Badge variant="outline">{stats?.total_campaigns || 0}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <span className="text-sm font-medium text-blue-600">Gérer les utilisateurs</span>
            </button>
            <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <span className="text-sm font-medium text-green-600">Voir les analytics</span>
            </button>
            <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <span className="text-sm font-medium text-purple-600">Gérer les abonnements</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
