
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useSessionMessages } from "../hooks/useSessionMessages";
import { useManualMessageSender } from "../hooks/useManualMessageSender";
import { SessionHeader } from "./SessionHeader";
import { MessagesScroller } from "./MessagesScroller";
import { MessageReplyForm } from "./MessageReplyForm";
import { SessionEmptyState } from "./SessionEmptyState";
import { SessionLoadingOrError } from "./SessionLoadingOrError";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
  last_activity: string;
  entry_point: string;
  total_messages?: number;
}

interface SessionMessagesViewProps {
  selectedBot: any;
  selectedSession: BotSession | null;
}

// Correction : On évite l'ajout optimiste, et on attend le refetch pour l'afficher.
export const SessionMessagesView: React.FC<SessionMessagesViewProps> = ({
  selectedBot,
  selectedSession
}) => {
  const { messages, loading, error, refetch } = useSessionMessages(
    selectedBot?.id || null,
    selectedSession?.session_token || null
  );
  const { sendManualMessage, sending } = useManualMessageSender(
    selectedBot?.id || null,
    selectedSession
  );
  const [replyText, setReplyText] = useState("");

  // Allège la fréquence d'interval pour une interface plus fluide
  useEffect(() => {
    if (selectedSession && selectedBot) {
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedSession, selectedBot, refetch]);

  // Correction : suppression affichage optimiste, on attend le refetch pour voir le message
  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    try {
      console.log("[SessionMessagesView] Envoi d'un message admin avec session_token=", selectedSession?.session_token);
      await sendManualMessage(replyText);
      setReplyText("");
      setTimeout(() => refetch(), 300); // On déclenche le refetch rapidement après envoi
    } catch (error) {
      console.error('Error sending manual message:', error);
    }
  };

  if (!selectedSession) {
    return <SessionEmptyState />;
  }

  // OPTIMISATION AFFICHAGE – réduction de padding, fond plus clair, supprime ombre si espace faible
  return (
    <Card className="flex flex-col items-stretch overflow-auto h-full bg-gray-50 border-blue-100 rounded-xl" style={{ boxShadow: "0 1.5px 6px 1px #ced6f380" }}>
      <SessionHeader 
        selectedBot={selectedBot}
        selectedSession={selectedSession}
        loading={loading}
        refetch={refetch}
      />
      <CardContent className="flex-1 overflow-y-auto space-y-2 px-1 py-0 min-h-0">
        <MessagesScroller messages={messages} />
        <SessionLoadingOrError loading={loading} error={error} refetch={refetch} />
      </CardContent>
      <div className="border-t p-2 flex-shrink-0 bg-white rounded-b-xl">
        <MessageReplyForm
          replyText={replyText}
          setReplyText={setReplyText}
          sending={sending}
          onSend={handleSendReply}
          selectedBot={selectedBot}
        />
      </div>
    </Card>
  );
};
