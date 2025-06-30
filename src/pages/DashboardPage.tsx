
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ConversationManager } from '@/components/ConversationManager';
import { useAuth } from '@/contexts/AuthContext';
import { CompleteBotAnalytics } from '@/components/CompleteBotAnalytics';
import { SecureDataManager } from '@/services/dashboard/secureDataManager';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
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
      fetchMyBots();
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
      setIsLoading(true);
      
      // Utiliser le nouveau gestionnaire sécurisé
      const dashboardStats = await SecureDataManager.getDashboardStats();
      setStats(dashboardStats);

      console.log('[DashboardPage] Statistiques chargées:', dashboardStats);

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyBots = async () => {
    try {
      const botsData = await SecureDataManager.getOwnerBots();
      setMyBots(botsData);
      console.log(`[DashboardPage] ${botsData.length} bots récupérés`);
    } catch (error) {
      console.error('Erreur chargement bots utilisateur:', error);
    }
  };

  useEffect(() => {
    if (selectedBotId || selectedBotName) {
      console.log(
        `[DashboardPage] Bot sélectionné : ${selectedBotName || ''} (id: ${selectedBotId || ''})`
      );
    }
  }, [selectedBotId, selectedBotName]);

  const handleBotSelect = (botId: string, botName: string) => {
    console.log(`[DashboardPage] Click bot: ${botName} (id: ${botId})`);
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
      <div className={`${isMobile ? 'p-4' : 'p-4 lg:p-8'} space-y-6 lg:space-y-8 bg-gray-50 min-h-screen`}>
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
    console.log("[DashboardPage] Ouverture analytics bot :", { selectedBotId, selectedBotName });
    return (
      <div className={`${isMobile ? 'p-2' : 'p-4 lg:p-8'} space-y-6 lg:space-y-8 bg-gray-50 min-h-screen overflow-x-hidden`}>
        <CompleteBotAnalytics 
          botId={selectedBotId} 
          botName={selectedBotName} 
          onBack={() => setShowBotAnalytics(false)} 
        />
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-2' : 'p-4 lg:p-8'} space-y-4 lg:space-y-8 bg-gray-50 min-h-screen overflow-x-hidden`}>
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
