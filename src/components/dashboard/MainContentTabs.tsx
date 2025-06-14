
import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BotManagement } from '@/components/BotManagement';
import { MessagesOverview } from '@/components/MessagesOverview';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { LeadsManager } from "@/components/LeadsManager";
import { MarketingCampaignsManager } from "@/components/MarketingCampaignsManager";
import { ConversationInsightsPanel } from "@/components/ConversationInsightsPanel";
import { 
  Bot,
  MessageCircle,
  Star,
  Zap,
  BarChart3,
  Users,
  TrendingUp 
} from 'lucide-react';
import { UserPermissions } from './DashboardStats';

interface MainContentTabsProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  permissions: UserPermissions;
}

export const MainContentTabs: React.FC<MainContentTabsProps> = ({
  selectedTab,
  onTabChange,
  permissions
}) => {
  return (
    <Card className="uniform-card">
      <Tabs value={selectedTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 p-1 bg-gray-100 rounded-t-xl">
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
  );
};
