
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  CreditCard, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  Settings,
  UserCheck,
  Bot,
  MessageSquare,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  new_users_30d: number;
  total_bots: number;
  new_bots_30d: number;
  active_subscriptions: number;
  total_link_clicks: number;
  messages_24h: number;
  active_chat_users_24h: number;
}

interface AdminDashboardProps {
  onNavigate: (section: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_dashboard_stats')
        .select('*')
        .single();

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dashboardStats = [
    {
      title: 'Utilisateurs Actifs',
      value: stats?.active_users || 0,
      icon: UserCheck,
      color: 'from-green-500 to-green-600',
      change: `+${stats?.new_users_30d || 0} ce mois`,
      onClick: () => onNavigate('users')
    },
    {
      title: 'Total Bots',
      value: stats?.total_bots || 0,
      icon: Bot,
      color: 'from-blue-500 to-blue-600',
      change: `+${stats?.new_bots_30d || 0} nouveaux`,
      onClick: () => onNavigate('bots')
    },
    {
      title: 'Abonnements Actifs',
      value: stats?.active_subscriptions || 0,
      icon: CreditCard,
      color: 'from-purple-500 to-purple-600',
      change: 'Revenus stables',
      onClick: () => onNavigate('subscriptions')
    },
    {
      title: 'Messages 24h',
      value: stats?.messages_24h || 0,
      icon: MessageSquare,
      color: 'from-orange-500 to-orange-600',
      change: `${stats?.active_chat_users_24h || 0} utilisateurs actifs`,
      onClick: () => onNavigate('analytics')
    }
  ];

  const quickActions = [
    {
      title: 'Gestion des utilisateurs',
      description: 'Voir, modifier et gérer tous les utilisateurs',
      icon: Users,
      action: () => onNavigate('users'),
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      title: 'Abonnements',
      description: 'Gérer les plans et abonnements',
      icon: CreditCard,
      action: () => onNavigate('subscriptions'),
      color: 'bg-green-50 hover:bg-green-100 border-green-200'
    },
    {
      title: 'Analytics Plateforme',
      description: 'Voir les métriques et performances',
      icon: TrendingUp,
      action: () => onNavigate('analytics'),
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200'
    },
    {
      title: 'Logs Système',
      description: 'Surveiller les activités et erreurs',
      icon: Activity,
      action: () => onNavigate('logs'),
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
      title: 'Paramètres',
      description: 'Configuration de la plateforme',
      icon: Settings,
      action: () => onNavigate('settings'),
      color: 'bg-gray-50 hover:bg-gray-100 border-gray-200'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de bord Admin</h1>
        <p className="text-gray-600 mt-1">
          Vue d'ensemble de la plateforme et outils d'administration
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <Card 
            key={index} 
            className="relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={stat.onClick}
          >
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
                {stat.value.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertes système */}
      {(stats?.suspended_users || 0) > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-yellow-800">Alertes Système</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-yellow-700">Utilisateurs suspendus</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {stats?.suspended_users}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
          <CardDescription>
            Accès direct aux fonctionnalités d'administration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${action.color}`}
                onClick={action.action}
              >
                <div className="flex items-start space-x-3">
                  <action.icon className="h-6 w-6 text-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activité récente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>Dernières actions sur la plateforme</CardDescription>
          </div>
          <Button variant="outline" onClick={() => onNavigate('logs')}>
            <Eye className="w-4 h-4 mr-2" />
            Voir tout
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nouveau utilisateur inscrit</p>
                <p className="text-xs text-gray-500">Il y a 5 minutes</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Nouveau bot créé</p>
                <p className="text-xs text-gray-500">Il y a 12 minutes</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Abonnement mis à jour</p>
                <p className="text-xs text-gray-500">Il y a 1 heure</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
