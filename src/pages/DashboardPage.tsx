
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BotManagement } from '@/components/BotManagement';
import { MessagesOverview } from '@/components/MessagesOverview';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { QuickStats } from '@/components/dashboard/QuickStats';
import { PermissionsCard } from '@/components/dashboard/PermissionsCard';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot,
  MessageCircle,
  Star,
  Zap
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
      <DashboardHeader role={permissions.role} />
      <QuickStats stats={stats} maxBots={permissions.maxBots} />
      <PermissionsCard permissions={permissions} />

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

      <QuickActionsCard />
    </div>
  );
};
