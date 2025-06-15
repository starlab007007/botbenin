
import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BotManagement } from '@/components/BotManagement';
import { MessagesOverview } from '@/components/MessagesOverview';
import { 
  Bot,
  MessageCircle
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
        <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-t-xl">
          <TabsTrigger value="bots" className="flex items-center space-x-2">
            <Bot className="w-4 h-4" />
            <span>Chatbots</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4" />
            <span>Messages</span>
          </TabsTrigger>
        </TabsList>
        <div className="p-6">
          <TabsContent value="bots" className="mt-0">
            <BotManagement />
          </TabsContent>
          <TabsContent value="messages" className="mt-0">
            <MessagesOverview />
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
};
