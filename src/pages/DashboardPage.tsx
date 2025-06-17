
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { CompleteBotAnalytics } from '@/components/CompleteBotAnalytics';

// Dashboard components
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { QuickStatsCards } from '@/components/dashboard/QuickStatsCards';
import { ManagementSection } from '@/components/dashboard/ManagementSection';
import { BotAnalyticsSection } from '@/components/dashboard/BotAnalyticsSection';
import { MainContentTabs } from '@/components/dashboard/MainContentTabs';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DashboardStats, UserPermissions } from '@/components/dashboard/DashboardStats';

// Secure conversation manager
import { SecureConversationManager } from '@/components/secure-conversation/SecureConversationManager';

// Secure data services
import { getSecureDashboardStats } from '@/services/chat/secureHistoryManager';
import { supabase } from '@/integrations/supabase/client';

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
      fetchSecureDashboardData();
      fetchUserPermissions();
    }
  }, [user]);

  const fetchUserPermissions = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select(`
          roles (name)
        `)
        .eq('user_id', authUser.id);

      // Get bot_owner for specific permissions
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
      console.error('Error loading permissions:', error);
    }
  };

  const fetchSecureDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Use secure dashboard stats function
      const secureStats = await getSecureDashboardStats();
      
      if (secureStats) {
        setStats({
          totalBots: Number(secureStats.total_bots) || 0,
          totalMessages: Number(secureStats.total_messages) || 0,
          totalUsers: Number(secureStats.total_users) || 0,
          activeToday: Number(secureStats.active_users_24h) || 0
        });
      } else {
        // User has no bots or data yet
        setStats({
          totalBots: 0,
          totalMessages: 0,
          totalUsers: 0,
          activeToday: 0
        });
      }

    } catch (error) {
      console.error('Error loading secure dashboard data:', error);
      // Set default stats on error
      setStats({
        totalBots: 0,
        totalMessages: 0,
        totalUsers: 0,
        activeToday: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSecureMyBots();
    }
  }, [user]);

  const fetchSecureMyBots = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      
      // Get bot owner ID securely
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      if (!ownerData) return;
      
      // Get only bots owned by this user
      const { data: bots } = await supabase
        .from('bots')
        .select('id, name')
        .eq('owner_id', ownerData.id);

      console.log("[SECURE DASHBOARD] User's bots:", bots);
      setMyBots(bots || []);
      
    } catch (error) {
      console.error('Error loading user bots securely:', error);
    }
  };

  useEffect(() => {
    if (selectedBotId || selectedBotName) {
      console.log(
        `[SECURE DASHBOARD] Bot selected: ${selectedBotName || ''} (id: ${selectedBotId || ''})`
      );
    }
  }, [selectedBotId, selectedBotName]);

  const handleBotSelect = (botId: string, botName: string) => {
    console.log(`[SECURE DASHBOARD] Click bot: ${botName} (id: ${botId})`);
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
            Veuillez vous connecter pour accéder au tableau de bord sécurisé
          </p>
        </Card>
      </div>
    );
  }

  if (showBotAnalytics && selectedBotId && selectedBotName) {
    console.log("[SECURE DASHBOARD] Opening secure analytics:", { selectedBotId, selectedBotName });
    return (
      <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
        <CompleteBotAnalytics 
          botId={selectedBotId} 
          botName={selectedBotName} 
          onBack={() => setShowBotAnalytics(false)} 
        />
      </div>
    );
  }

  // Show secure conversation manager
  if (showConversationControlPanel) {
    return <SecureConversationManager onBack={() => setShowConversationControlPanel(false)} />;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 lg:space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <DashboardHeader permissions={permissions} />

      {/* Security Status */}
      <Card className="p-4 border-green-200 bg-green-50">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-800">
            Dashboard sécurisé - Isolation des données garantie
          </span>
        </div>
      </Card>

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
