
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
  const [activeTab, setActiveTab] = useState("chat");

  return (
    <div className="w-1/2 h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex-shrink-0">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="chat" className="text-xs">
              💬 Chat en Direct
            </TabsTrigger>
            <TabsTrigger value="debug" className="text-xs">
              🔧 Debug / Admin
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 min-h-0">
          <TabsContent value="chat" className="h-full mt-0">
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
        </div>
      </Tabs>
    </div>
  );
};
