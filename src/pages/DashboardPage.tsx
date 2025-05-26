
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
  BarChart3, 
  TrendingUp, 
  Users, 
  Zap, 
  Activity, 
  Target, 
  Clock, 
  Star,
  Bot,
  MessageCircle,
  UserCheck,
  Calendar
} from 'lucide-react';

interface DashboardStats {
  totalBots: number;
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBots: 0,
    totalMessages: 0,
    totalUsers: 0,
    activeToday: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

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
      change: '+0%', 
      icon: Bot, 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Messages Total', 
      value: stats.totalMessages.toString(), 
      change: '+0%', 
      icon: MessageCircle, 
      color: 'bg-green-500' 
    },
    { 
      title: 'Utilisateurs', 
      value: stats.totalUsers.toString(), 
      change: '+0%', 
      icon: Users, 
      color: 'bg-purple-500' 
    },
    { 
      title: 'Actifs Aujourd\'hui', 
      value: stats.activeToday.toString(), 
      change: '+0%', 
      icon: UserCheck, 
      color: 'bg-teal-500' 
    }
  ];

  if (!user) {
    return (
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
        <Card className="p-8 text-center">
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
          Tableau de bord SaaS Chatbots
        </h1>
        <p className="text-gray-600">
          Gérez vos chatbots et consultez les interactions de vos utilisateurs
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {quickStats.map((stat, index) => (
          <Card key={index} className="p-6 hover:shadow-lg transition-all duration-200 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center shadow-sm`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-green-600 text-sm font-medium">{stat.change}</span>
            </div>
            <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Card className="bg-white border border-gray-200 rounded-xl">
        <Tabs defaultValue="bots" className="w-full">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100 rounded-t-xl">
            <TabsTrigger value="bots" className="flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>Mes Chatbots</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Abonnement</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="p-6">
            <TabsContent value="bots" className="mt-0">
              <BotManagement />
            </TabsContent>
            
            <TabsContent value="messages" className="mt-0">
              <MessagesOverview />
            </TabsContent>
            
            <TabsContent value="subscription" className="mt-0">
              <SubscriptionManagement />
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Performance Summary */}
      <Card className="p-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 rounded-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="text-center lg:text-left">
            <h3 className="text-xl font-semibold mb-2">Plateforme SaaS Chatbots</h3>
            <p className="text-blue-100">
              Votre solution complète pour créer et gérer des chatbots intelligents
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-1">{stats.totalBots}</div>
            <p className="text-blue-100 text-sm">Chatbots créés</p>
          </div>
          <div className="text-center lg:text-right">
            <div className="text-4xl font-bold mb-1">{stats.totalMessages}</div>
            <p className="text-blue-100 text-sm">Messages traités</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
