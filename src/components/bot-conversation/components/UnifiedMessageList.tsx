
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MessageListHeader } from "./MessageListHeader";
import { DebugPanel } from "./DebugPanel";
import { MessagesList } from "./MessagesList";
import { ReplyForm } from "./ReplyForm";

interface BotMessage {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string;
  bot_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

interface UnifiedMessageListProps {
  selectedSession: BotSession | null;
  messages: BotMessage[];
  loadingMessages: boolean;
  selectedBot: any;
  onMessagesUpdate: (messages: BotMessage[]) => void;
}

export const UnifiedMessageList: React.FC<UnifiedMessageListProps> = ({
  selectedSession,
  messages,
  loadingMessages,
  selectedBot,
  onMessagesUpdate,
}) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Fonction de débogage pour voir les informations de la base de données
  const handleDebugSession = async () => {
    if (!selectedSession || !selectedBot) return;

    try {
      console.log("=== DÉBOGAGE SESSION ===");
      
      // 1. Vérifier la session dans enhanced_chat_sessions
      const { data: enhancedSession, error: enhancedError } = await supabase
        .from("enhanced_chat_sessions")
        .select("*")
        .eq("session_token", selectedSession.session_token);

      console.log("Enhanced sessions:", enhancedSession, enhancedError);

      // 2. Vérifier les bot_users liés
      const { data: botUsers, error: usersError } = await supabase
        .from("bot_users")
        .select("*")
        .eq("bot_id", selectedBot.id);

      console.log("Bot users:", botUsers, usersError);

      // 3. Vérifier tous les messages du bot
      const { data: allMessages, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("bot_id", selectedBot.id)
        .order("created_at", { ascending: false })
        .limit(20);

      console.log("Tous les messages:", allMessages, messagesError);

      setDebugInfo({
        enhancedSession,
        botUsers,
        allMessages,
        sessionToken: selectedSession.session_token,
        botId: selectedBot.id
      });

    } catch (error) {
      console.error("Erreur débogage:", error);
    }
  };

  if (!selectedSession) {
    return (
      <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
        <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
          <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une session
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-1/2 flex flex-col px-3 py-4 items-stretch overflow-auto">
      <MessageListHeader 
        selectedSession={selectedSession}
        onDebugSession={handleDebugSession}
      />

      <DebugPanel 
        debugInfo={debugInfo}
        onClose={() => setDebugInfo(null)}
      />

      {/* Liste des messages */}
      <div className="flex-1 overflow-y-auto max-h-[35vh] space-y-2 mb-4">
        <MessagesList
          messages={messages}
          loadingMessages={loadingMessages}
          selectedSession={selectedSession}
          onDebugSession={handleDebugSession}
        />
      </div>

      {/* Zone de réponse manuelle */}
      <ReplyForm
        selectedSession={selectedSession}
        selectedBot={selectedBot}
        messages={messages}
        onMessagesUpdate={onMessagesUpdate}
      />
    </Card>
  );
};
