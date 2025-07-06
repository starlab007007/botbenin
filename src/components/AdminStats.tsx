
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  UserCheck, 
  Crown, 
  MessageSquare,
  Bot,
  TrendingUp,
  Shield,
  AlertTriangle
} from 'lucide-react';

interface AdminDashboardStats {
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

interface AdminStatsProps {
  stats: AdminDashboardStats;
  isLoading?: boolean;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats, isLoading = false }) => {
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

  // Calcul du taux d'activité avec gestion des divisions par zéro
  const activityRate = stats.total_users > 0 
    ? ((stats.active_users_24h / stats.total_users) * 100).toFixed(1)
    : '0';

  const adminStats = [
    {
      title: 'Total Utilisateurs',
      value: stats.total_users?.toLocaleString() || '0',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      change: `+${stats.new_users_30d || 0} ce mois`,
      changeType: 'positive' as const
    },
    {
      title: 'Utilisateurs Actifs (24h)',
      value: stats.active_users_24h?.toLocaleString() || '0',
      icon: UserCheck,
      color: 'from-green-500 to-green-600',
      change: `${activityRate}% du total`,
      changeType: 'neutral' as const
    },
    {
      title: 'Bots Actifs',
      value: `${stats.active_bots || 0}/${stats.total_bots || 0}`,
      icon: Bot,
      color: 'from-purple-500 to-purple-600',
      change: 'Bots opérationnels',
      changeType: 'neutral' as const
    },
    {
      title: 'Messages (24h)',
      value: stats.total_messages_24h?.toLocaleString() || '0',
      icon: MessageSquare,
      color: 'from-orange-500 to-orange-600',
      change: 'Interactions récentes',
      changeType: 'neutral' as const
    },
    {
      title: 'Campagnes Actives',
      value: `${stats.active_campaigns || 0}/${stats.total_campaigns || 0}`,
      icon: TrendingUp,
      color: 'from-pink-500 to-pink-600',
      change: 'Campagnes en cours',
      changeType: 'neutral' as const
    },
    {
      title: 'Abonnements',
      value: stats.total_subscriptions?.toLocaleString() || '0',
      icon: Crown,
      color: 'from-yellow-500 to-yellow-600',
      change: `${stats.revenue_monthly || 0}€/mois`,
      changeType: 'positive' as const
    },
    {
      title: 'Utilisateurs Actifs (7j)',
      value: stats.active_users_7d?.toLocaleString() || '0',
      icon: Shield,
      color: 'from-indigo-500 to-indigo-600',
      change: 'Activité hebdomadaire',
      changeType: 'neutral' as const
    },
    {
      title: 'Taux d\'Engagement',
      value: `${activityRate}%`,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      change: 'Performance globale',
      changeType: stats.active_users_24h > stats.active_users_7d / 7 ? 'positive' : 'negative' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {adminStats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden border-l-4 border-l-transparent hover:border-l-blue-500 transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
            <CardDescription className={`text-xs flex items-center ${
              stat.changeType === 'positive' ? 'text-green-600' :
              stat.changeType === 'negative' ? 'text-red-600' :
              'text-gray-500'
            }`}>
              {stat.change}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
