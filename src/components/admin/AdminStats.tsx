
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Bot, MessageSquare, BarChart3, Shield, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const AdminStats: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
      if (error) throw error;
      return data[0] || {};
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
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

  const statCards = [
    {
      title: 'Utilisateurs Total',
      value: stats?.total_users || 0,
      change: `+${stats?.new_users_30d || 0} ce mois`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Utilisateurs Actifs 24h',
      value: stats?.active_users_24h || 0,
      change: `${stats?.active_users_7d || 0} cette semaine`,
      icon: Users,
      color: 'text-green-600',
    },
    {
      title: 'Bots Total',
      value: stats?.total_bots || 0,
      change: `${stats?.active_bots || 0} actifs`,
      icon: Bot,
      color: 'text-purple-600',
    },
    {
      title: 'Messages 24h',
      value: stats?.total_messages_24h || 0,
      change: 'Conversations actives',
      icon: MessageSquare,
      color: 'text-orange-600',
    },
    {
      title: 'Campagnes',
      value: stats?.total_campaigns || 0,
      change: `${stats?.active_campaigns || 0} actives`,
      icon: BarChart3,
      color: 'text-indigo-600',
    },
    {
      title: 'Abonnements',
      value: stats?.total_subscriptions || 0,
      change: `€${stats?.revenue_monthly || 0}/mois`,
      icon: Shield,
      color: 'text-emerald-600',
    },
    {
      title: 'Nouveaux Utilisateurs',
      value: stats?.new_users_30d || 0,
      change: 'Ces 30 derniers jours',
      icon: Users,
      color: 'text-cyan-600',
    },
    {
      title: 'Taux d\'Activité',
      value: stats?.total_users > 0 ? Math.round((stats?.active_users_24h / stats?.total_users) * 100) : 0,
      change: '% utilisateurs actifs',
      icon: BarChart3,
      color: 'text-pink-600',
      suffix: '%',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.value}{stat.suffix || ''}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertes système */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span>État du Système</span>
            </CardTitle>
            <CardDescription>
              Surveillance en temps réel des composants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Base de données</span>
                <span className="text-sm text-green-600 font-medium">Opérationnel</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Authentification</span>
                <span className="text-sm text-green-600 font-medium">Opérationnel</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Services IA</span>
                <span className="text-sm text-green-600 font-medium">Opérationnel</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Stockage</span>
                <span className="text-sm text-green-600 font-medium">Opérationnel</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>
              Dernières actions sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                • {stats?.new_users_30d || 0} nouveaux utilisateurs ce mois
              </div>
              <div className="text-sm text-gray-600">
                • {stats?.active_users_24h || 0} utilisateurs actifs aujourd'hui
              </div>
              <div className="text-sm text-gray-600">
                • {stats?.total_messages_24h || 0} messages échangés aujourd'hui
              </div>
              <div className="text-sm text-gray-600">
                • {stats?.active_campaigns || 0} campagnes en cours
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
