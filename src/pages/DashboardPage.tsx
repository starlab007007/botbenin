
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BotManagement } from '@/components/BotManagement';
import { MessagesOverview } from '@/components/MessagesOverview';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot,
  MessageCircle,
  Star,
  Zap,
  BarChart3,
  Users,
  TrendingUp,
  Settings,
  History,
  Bell
} from 'lucide-react';

interface DashboardStats {
  totalBots: number;
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

interface UserPermissions {
  canCreateBots: boolean;
  canCreateAutomations: boolean;
  canAccessBusiness: boolean;
  canAccessMarketing: boolean;
  canAccessManagement: boolean;
  maxBots: number;
  role: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBots: 0,
    totalMessages: 0,
    totalUsers: 0,
    activeToday: 0
  });
  const [permissions, setPermissions] = useState<UserPermissions>({
    canCreateBots: false,
    canCreateAutomations: false,
    canAccessBusiness: false,
    canAccessMarketing: false,
    canAccessManagement: false,
    maxBots: 0,
    role: 'user'
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
      fetchUserPermissions();
    }
  }, [user]);

  const fetchUserPermissions = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Récupérer les rôles utilisateur
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          roles (name)
        `)
        .eq('user_id', authUser.id);

      // Récupérer le bot_owner pour les permissions spécifiques
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('subscription_plan, max_bots')
        .eq('user_id', authUser.id)
        .single();

      const userRole = userRoles?.[0]?.roles?.name || 'user';
      
      setPermissions({
        canCreateBots: ['admin', 'manager', 'user'].includes(userRole),
        canCreateAutomations: ['admin', 'manager'].includes(userRole),
        canAccessBusiness: ['admin', 'manager'].includes(userRole),
        canAccessMarketing: ['admin', 'manager'].includes(userRole),
        canAccessManagement: ['admin'].includes(userRole),
        maxBots: ownerData?.max_bots || 1,
        role: userRole
      });

    } catch (error) {
      console.error('Erreur lors du chargement des permissions:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Récupérer le bot_owner
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      if (!ownerData) return;

      // Statistiques des bots
      const { data: botsData } = await supabase
        .from('bots')
        .select('id')
        .eq('owner_id', ownerData.id);

      const botIds = botsData?.map(bot => bot.id) || [];

      // Statistiques des messages
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('id, created_at')
        .in('bot_id', botIds);

      // Statistiques des utilisateurs uniques
      const { data: usersData } = await supabase
        .from('bot_users')
        .select('id, last_active')
        .in('bot_id', botIds);

      // Activité d'aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeToday = usersData?.filter(user => 
        new Date(user.last_active) >= today
      ).length || 0;

      setStats({
        totalBots: botsData?.length || 0,
        totalMessages: messagesData?.length || 0,
        totalUsers: usersData?.length || 0,
        activeToday: activeToday
      });

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickStats = [
    { 
      title: 'Mes Chatbots', 
      value: stats.totalBots.toString(), 
      limit: permissions.maxBots,
      icon: Bot, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      title: 'Messages Total', 
      value: stats.totalMessages.toString(), 
      icon: MessageCircle, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      title: 'Utilisateurs', 
      value: stats.totalUsers.toString(), 
      icon: Users, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    },
    { 
      title: 'Actifs Aujourd\'hui', 
      value: stats.activeToday.toString(), 
      icon: TrendingUp, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    }
  ];

  if (!user) {
    return (
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
        <Card className="uniform-card p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connexion requise
          </h2>
          <p className="text-gray-600">
            Veuillez vous connecter pour accéder au tableau de bord
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          Tableau de bord - Profil {permissions.role}
        </h1>
        <p className="text-gray-600">
          Gérez vos fonctionnalités selon vos permissions
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="uniform-stats-card">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
            <div className="text-2xl font-bold text-gray-900">
              {stat.value}
              {stat.limit && <span className="text-sm text-gray-500">/{stat.limit}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Permissions Available */}
      <Card className="uniform-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Fonctionnalités disponibles
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className={`p-4 rounded-lg border-2 ${permissions.canCreateBots ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <Bot className={`w-8 h-8 mb-2 ${permissions.canCreateBots ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="text-sm font-medium text-gray-900">Chatbots</div>
            <div className="text-xs text-gray-600">
              {permissions.canCreateBots ? 'Disponible' : 'Non autorisé'}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border-2 ${permissions.canCreateAutomations ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <Zap className={`w-8 h-8 mb-2 ${permissions.canCreateAutomations ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="text-sm font-medium text-gray-900">Automatisations</div>
            <div className="text-xs text-gray-600">
              {permissions.canCreateAutomations ? 'Disponible' : 'Non autorisé'}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border-2 ${permissions.canAccessBusiness ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <BarChart3 className={`w-8 h-8 mb-2 ${permissions.canAccessBusiness ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="text-sm font-medium text-gray-900">IA Business</div>
            <div className="text-xs text-gray-600">
              {permissions.canAccessBusiness ? 'Disponible' : 'Non autorisé'}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border-2 ${permissions.canAccessMarketing ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <TrendingUp className={`w-8 h-8 mb-2 ${permissions.canAccessMarketing ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="text-sm font-medium text-gray-900">IA Marketing</div>
            <div className="text-xs text-gray-600">
              {permissions.canAccessMarketing ? 'Disponible' : 'Non autorisé'}
            </div>
          </div>
          
          <div className={`p-4 rounded-lg border-2 ${permissions.canAccessManagement ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <Settings className={`w-8 h-8 mb-2 ${permissions.canAccessManagement ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="text-sm font-medium text-gray-900">IA Gestion</div>
            <div className="text-xs text-gray-600">
              {permissions.canAccessManagement ? 'Disponible' : 'Non autorisé'}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content Tabs */}
      <Card className="uniform-card">
        <Tabs defaultValue="bots" className="w-full">
          <TabsList className="grid w-full grid-cols-4 p-1 bg-gray-100 rounded-t-xl">
            <TabsTrigger value="bots" className="flex items-center space-x-2" disabled={!permissions.canCreateBots}>
              <Bot className="w-4 h-4" />
              <span>Chatbots</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center space-x-2" disabled={!permissions.canCreateAutomations}>
              <Zap className="w-4 h-4" />
              <span>Automatisations</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Abonnement</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="bots" className="mt-0">
              {permissions.canCreateBots ? (
                <BotManagement />
              ) : (
                <div className="text-center py-8">
                  <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Accès restreint
                  </h3>
                  <p className="text-gray-600">
                    Vous n'avez pas les permissions pour créer des chatbots
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="messages" className="mt-0">
              <MessagesOverview />
            </TabsContent>
            
            <TabsContent value="automations" className="mt-0">
              {permissions.canCreateAutomations ? (
                <div className="text-center py-8">
                  <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Automatisations
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Créez et gérez vos automatisations IA
                  </p>
                  <Button className="uniform-button-primary">
                    Créer une automatisation
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Accès restreint
                  </h3>
                  <p className="text-gray-600">
                    Vous n'avez pas les permissions pour les automatisations
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="subscription" className="mt-0">
              <SubscriptionManagement />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Actions rapides */}
      <Card className="uniform-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button className="uniform-button-secondary flex items-center space-x-2">
            <History className="w-4 h-4" />
            <span>Historique</span>
          </Button>
          <Button className="uniform-button-secondary flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </Button>
          <Button className="uniform-button-secondary flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </Button>
          <Button className="uniform-button-secondary flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Analyses</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
