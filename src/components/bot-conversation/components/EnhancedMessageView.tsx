
import React from "react";
import { SessionMessagesView } from "./SessionMessagesView";
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

// L’affichage du flux de messages ne propose plus qu’un onglet “Chat en Direct”.
export const EnhancedMessageView: React.FC<EnhancedMessageViewProps> = ({
  selectedBot,
  selectedSession
}) => {
  return (
    <div className="w-1/2 h-full flex flex-col">
      <Tabs value="chat" className="h-full flex flex-col">
        <div className="flex-shrink-0">
          <TabsList className="w-full mb-2">
            <TabsTrigger value="chat" className="text-xs">
              💬 Chat en Direct
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
        </div>
      </Tabs>
    </div>
  );
};
