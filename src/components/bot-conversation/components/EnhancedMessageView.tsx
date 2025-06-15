
import React, { useState } from "react";
import { SessionMessagesView } from "./SessionMessagesView";
import { UnifiedMessageList } from "./UnifiedMessageList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
  last_activity: string;
  entry_point: string;
  total_messages?: number;
}

interface EnhancedMessageViewProps {
  selectedBot: any;
  selectedSession: BotSession | null;
}

export const EnhancedMessageView: React.FC<EnhancedMessageViewProps> = ({
  selectedBot,
  selectedSession
}) => {
  const [activeTab, setActiveTab] = useState("messages");

  return (
    <div className="w-1/2">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-2 mb-2">
          <TabsTrigger value="messages" className="text-xs">
            Messages Chat
          </TabsTrigger>
          <TabsTrigger value="debug" className="text-xs">
            Debug / Admin
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="messages" className="h-full mt-0">
          <SessionMessagesView 
            selectedBot={selectedBot}
            selectedSession={selectedSession}
          />
        </TabsContent>
        
        <TabsContent value="debug" className="h-full mt-0">
          <UnifiedMessageList
            selectedSession={selectedSession}
            messages={[]} // Sera géré par le composant interne
            loadingMessages={false}
            selectedBot={selectedBot}
            onMessagesUpdate={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
