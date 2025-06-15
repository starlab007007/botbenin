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

  useEffect(() => {
    if (selectedSession && selectedBot) {
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedSession, selectedBot, refetch]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await sendManualMessage(replyText, () => {
        setReplyText("");
        setTimeout(() => refetch(), 500);
      });
    } catch (error) {
      console.error('Error sending manual message:', error);
    }
  };

  if (!selectedSession) {
    return <SessionEmptyState />;
  }

  return (
    <Card className="flex flex-col px-3 py-4 items-stretch overflow-auto h-full">
      <SessionHeader 
        selectedBot={selectedBot}
        selectedSession={selectedSession}
        loading={loading}
        refetch={refetch}
      />
      <CardContent className="flex-1 overflow-y-auto space-y-3 p-3 min-h-0">
        <SessionLoadingOrError loading={loading} error={error} refetch={refetch} />
        {!loading && !error && (
          <MessagesScroller messages={messages} />
        )}
      </CardContent>
      <div className="border-t p-3 flex-shrink-0">
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
