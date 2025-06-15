
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

// Élargit la colonne de chat à ~70% de l’espace horizontal, centrée.
export const EnhancedMessageView: React.FC<EnhancedMessageViewProps> = ({
  selectedBot,
  selectedSession
}) => {
  return (
    <div className="w-[66%] min-w-[420px] h-full flex flex-col mx-auto">
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

