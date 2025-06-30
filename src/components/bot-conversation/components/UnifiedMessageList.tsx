
import React from "react";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { MessagesList } from "./MessagesList";
import { ReplyForm } from "./ReplyForm";
import { CreateTestMessagesModal } from "./CreateTestMessagesModal";
import { MessageListHeader } from "./MessageListHeader";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const isMobile = useIsMobile();

  const handleCreateTestMessages = () => {
    setShowCreateModal(true);
  };

  const handleMessagesCreated = () => {
    if (onMessagesUpdate) {
      onMessagesUpdate(messages);
    }
  };

  if (!selectedSession) {
    return (
      <Card className={`${isMobile ? 'w-full min-h-screen' : 'w-1/2'} flex flex-col ${isMobile ? 'px-[2.5%] py-4' : 'px-3 py-4'} items-stretch overflow-auto`}>
        <div className="flex flex-1 items-center justify-center text-gray-400 text-lg h-full">
          <ChevronRight className="w-6 h-6 mr-1" /> Sélectionnez une session
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={`${isMobile ? 'w-full min-h-screen' : 'w-1/2'} flex flex-col ${isMobile ? 'px-[2.5%] py-4' : 'px-3 py-4'} items-stretch overflow-auto`}>
        <MessageListHeader 
          selectedSession={selectedSession}
        />

        {/* Liste des messages */}
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'max-h-[50vh]' : 'max-h-[35vh]'} space-y-2 mb-4`}>
          <MessagesList
            messages={messages}
            loadingMessages={loadingMessages}
            selectedSession={selectedSession}
            onDebugSession={() => {}}
            onCreateTestMessages={handleCreateTestMessages}
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

      <CreateTestMessagesModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        selectedBot={selectedBot}
        selectedSession={selectedSession}
        onMessagesCreated={handleMessagesCreated}
      />
    </>
  );
};
