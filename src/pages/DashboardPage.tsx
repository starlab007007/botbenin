import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BotManagement } from '@/components/BotManagement';
import { MessagesOverview } from '@/components/MessagesOverview';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { ConversationManager } from '@/components/ConversationManager';
import { LeadsManager } from "@/components/LeadsManager";
import { MarketingCampaignsManager } from "@/components/MarketingCampaignsManager";
import { ConversationInsightsPanel } from "@/components/ConversationInsightsPanel";
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
  Bell,
  Mail
} from 'lucide-react';
import { CompleteBotAnalytics } from '@/components/CompleteBotAnalytics';

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
    canCreateBots: true,
    canCreateAutomations: false,
    canAccessBusiness: false,
    canAccessMarketing: false,
    canAccessManagement: false,
    maxBots: 5,
    role: 'user'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showConversations, setShowConversations] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedBotName, setSelectedBotName] = useState<string | null>(null);
  const [showBotAnalytics, setShowBotAnalytics] = useState(false);
  const [myBots, setMyBots] = useState<Array<{ id: string, name: string }>>([]);
  
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
        canCreateBots: true,
        canCreateAutomations: ['admin', 'manager'].includes(userRole),
        canAccessBusiness: ['admin', 'manager'].includes(userRole),
        canAccessMarketing: ['admin', 'manager'].includes(userRole),
        canAccessManagement: ['admin'].includes(userRole),
        maxBots: ownerData?.max_bots || 5,
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

      if (!ownerData) {
        console.log('Aucun bot_owner trouvé pour cet utilisateur');
        setIsLoading(false);
        return;
      }

      // Utiliser la nouvelle vue detailed_bot_stats pour obtenir les statistiques
      const { data: statsData, error: statsError } = await supabase
        .from('detailed_bot_stats')
        .select('*')
        .eq('owner_id', ownerData.id);

      if (statsError) {
        console.error('Erreur lors du chargement des statistiques:', statsError);
        setIsLoading(false);
        return;
      }

      console.log('Données statistiques reçues:', statsData);

      if (statsData && statsData.length > 0) {
        // Agréger les statistiques de tous les bots de l'utilisateur
        const aggregatedStats = statsData.reduce((acc, bot) => ({
          totalBots: acc.totalBots + 1,
          totalMessages: acc.totalMessages + (bot.total_messages || 0),
          totalUsers: acc.totalUsers + (bot.total_unique_users || 0),
          activeToday: acc.activeToday + (bot.active_users_24h || 0)
        }), {
          totalBots: 0,
          totalMessages: 0,
          totalUsers: 0,
          activeToday: 0
        });

        console.log('Statistiques agrégées:', aggregatedStats);
        setStats(aggregatedStats);
      } else {
        console.log('Aucune donnée statistique trouvée');
        // L'utilisateur n'a pas encore de bots, garder les stats à 0
        setStats({
          totalBots: 0,
          totalMessages: 0,
          totalUsers: 0,
          activeToday: 0
        });
      }

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyBots();
    }
  }, [user]);

  const fetchMyBots = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      // On récupère l'id du bot_owner
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      if (!ownerData) return;
      const { data: bots } = await supabase
        .from('bots')
        .select('id, name')
        .eq('owner_id', ownerData.id);

      setMyBots(bots || []);
    } catch (error) {
      console.error('Erreur chargement bots utilisateur:', error);
    }
  };

  const quickStats = [
    { 
      title: 'Mes Chatbots', 
      value: stats.totalBots.toString(), 
      limit: permissions.maxBots,
      icon: Bot, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    { 
      title: 'Messages Total', 
      value: stats.totalMessages.toString(), 
      icon: MessageCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    { 
      title: 'Utilisateurs', 
      value: stats.totalUsers.toString(), 
      icon: Users, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    { 
      title: 'Actifs Aujourd\'hui', 
      value: stats.activeToday.toString(), 
      icon: TrendingUp, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
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

  if (showConversations) {
    return (
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
        <ConversationManager onBack={() => setShowConversations(false)} />
      </div>
    );
  }

  if (showBotAnalytics && selectedBotId && selectedBotName) {
    return (
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
        <CompleteBotAnalytics botId={selectedBotId} botName={selectedBotName} onBack={() => setShowBotAnalytics(false)} />
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
          Créez et gérez vos chatbots connectés via webhook
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="uniform-stats-card">
            <div className="flex flex-col items-center justify-center mb-3">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <h3 className="text-gray-600 text-sm mb-1 text-center">{stat.title}</h3>
            <div className="text-2xl font-bold text-gray-900 text-center">
              {stat.value}
              {stat.limit && <span className="text-sm text-gray-500">/{stat.limit}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Accès rapide aux conversations */}
      <Card className="uniform-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestion Centralisée</h3>
            <p className="text-gray-600">Accédez à toutes vos conversations et contacts</p>
          </div>
          <Button 
            onClick={() => setShowConversations(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Mail className="w-4 h-4 mr-2" />
            Voir toutes les conversations
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
            <MessageCircle className="w-8 h-8 mb-2 text-blue-600" />
            <div className="text-sm font-medium text-gray-900">Conversations</div>
            <div className="text-xs text-gray-600">Toutes les sessions de chat</div>
          </div>
          
          <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
            <Users className="w-8 h-8 mb-2 text-green-600" />
            <div className="text-sm font-medium text-gray-900">Contacts</div>
            <div className="text-xs text-gray-600">Base de données utilisateurs</div>
          </div>
          
          <div className="p-4 rounded-lg border-2 border-purple-200 bg-purple-50">
            <Mail className="w-8 h-8 mb-2 text-purple-600" />
            <div className="text-sm font-medium text-gray-900">Messagerie</div>
            <div className="text-xs text-gray-600">Contacter vos utilisateurs</div>
          </div>
        </div>
      </Card>

      {/* Fonctionnalités disponibles */}
      <Card className="uniform-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Fonctionnalités disponibles
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50">
            <Bot className="w-8 h-8 mb-2 text-green-600" />
            <div className="text-sm font-medium text-gray-900">Chatbots Webhook</div>
            <div className="text-xs text-gray-600">Toujours disponible</div>
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

      {myBots.length > 0 && (
        <Card className="uniform-card p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Voir les analytics d'un bot</h3>
          <div className="flex flex-wrap gap-2">
            {myBots.map(bot => (
              <Button
                key={bot.id}
                variant="outline"
                className={selectedBotId === bot.id ? "border-blue-600" : ""}
                onClick={() => { setSelectedBotId(bot.id); setSelectedBotName(bot.name); setShowBotAnalytics(true); }}
              >
                {bot.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Card className="uniform-card">
        <Tabs defaultValue="bots" className="w-full">
          <TabsList className="grid w-full grid-cols-7 p-1 bg-gray-100 rounded-t-xl">
            <TabsTrigger value="bots" className="flex items-center space-x-2">
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
            <TabsTrigger value="leads" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Leads</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Campagnes Marketing</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Insights</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="bots" className="mt-0">
              <BotManagement />
            </TabsContent>
            
            <TabsContent value="messages" className="mt-0">
              <MessagesOverview />
            </TabsContent>
            
            <TabsContent value="automations" className="mt-0"></TabsContent>
            
            <TabsContent value="subscription" className="mt-0">
              <SubscriptionManagement />
            </TabsContent>
            
            <TabsContent value="leads" className="mt-0">
              <LeadsManager />
            </TabsContent>
            <TabsContent value="campaigns" className="mt-0">
              <MarketingCampaignsManager />
            </TabsContent>
            <TabsContent value="insights" className="mt-0">
              <ConversationInsightsPanel />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Actions rapides */}
      <Card className="uniform-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            className="uniform-button-secondary flex items-center space-x-2"
            onClick={() => setShowConversations(true)}
          >
            <Mail className="w-4 h-4" />
            <span>Conversations</span>
          </Button>
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
        </div>
      </Card>
    </div>
  );
};
