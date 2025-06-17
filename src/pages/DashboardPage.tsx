import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ConversationManager } from '@/components/ConversationManager';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CompleteBotAnalytics } from '@/components/CompleteBotAnalytics';

// Dashboard components
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { QuickStatsCards } from '@/components/dashboard/QuickStatsCards';
import { ManagementSection } from '@/components/dashboard/ManagementSection';
import { BotAnalyticsSection } from '@/components/dashboard/BotAnalyticsSection';
import { MainContentTabs } from '@/components/dashboard/MainContentTabs';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DashboardStats, UserPermissions } from '@/components/dashboard/DashboardStats';

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
  const [selectedTab, setSelectedTab] = useState("bots");
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedBotName, setSelectedBotName] = useState<string | null>(null);
  const [showBotAnalytics, setShowBotAnalytics] = useState(false);
  const [myBots, setMyBots] = useState<Array<{ id: string, name: string }>>([]);
  const [showConversationControlPanel, setShowConversationControlPanel] = useState(false);

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

      // LOG: Liste des bots récupérés
      console.log("[DASHBOARD] Bots de l'utilisateur :", bots);

      setMyBots(bots || []);
    } catch (error) {
      console.error('Erreur chargement bots utilisateur:', error);
    }
  };

  useEffect(() => {
    if (selectedBotId || selectedBotName) {
      console.log(
        `[DASHBOARD] Bot sélectionné : ${selectedBotName || ''} (id: ${selectedBotId || ''})`
      );
    }
  }, [selectedBotId, selectedBotName]);

  const handleBotSelect = (botId: string, botName: string) => {
    console.log(`[DASHBOARD] Click bot: ${botName} (id: ${botId})`);
    setSelectedBotId(botId);
    setSelectedBotName(botName);
    setShowBotAnalytics(true);
  };

  const handleQuickAction = (action: string) => {
    if (action === 'conversations') {
      setSelectedTab("conversations");
    }
    // Add other action handlers as needed
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

  if (showBotAnalytics && selectedBotId && selectedBotName) {
    // LOG: Ouverture du panel analytics détaillé avec le bon bot
    console.log("[DASHBOARD] Ouverture analytics bot :", { selectedBotId, selectedBotName });
    return (
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
        <CompleteBotAnalytics botId={selectedBotId} botName={selectedBotName} onBack={() => setShowBotAnalytics(false)} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <DashboardHeader permissions={permissions} />

      {/* Quick Stats */}
      <QuickStatsCards stats={stats} permissions={permissions} />

      {/* Management Section */}
      <ManagementSection 
        showConversationControlPanel={showConversationControlPanel}
        onToggleConversationControl={() => setShowConversationControlPanel((v) => !v)}
      />

      {/* Bot Analytics Section */}
      <BotAnalyticsSection 
        bots={myBots}
        selectedBotId={selectedBotId}
        onBotSelect={handleBotSelect}
      />

      {/* Main Content Tabs */}
      <MainContentTabs 
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
        permissions={permissions}
      />

      {/* Quick Actions */}
      <QuickActions onActionClick={handleQuickAction} />
    </div>
  );
};
