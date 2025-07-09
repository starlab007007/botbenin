
import React from 'react';
import { StandardizedChatHeader } from './StandardizedChatHeader';
import { StandardizedChatMessages } from './StandardizedChatMessages';
import { StandardizedChatInput } from './StandardizedChatInput';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
  agentInfo?: {
    name: string;
    role: string;
    rating: number;
  };
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'busy' | 'offline';
  rating: number;
  responseTime: string;
  languages: string[];
  specialties: string[];
  webhookUrl?: string;
  chatContext?: string;
}

interface StandardizedChatInterfaceProps {
  selectedAgent: Agent | null;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  isTyping: boolean;
  waitTime: number;
  onSendMessage: () => void;
  onGoBack: () => void;
  showBackButton?: boolean;
}

export const StandardizedChatInterface: React.FC<StandardizedChatInterfaceProps> = ({
  selectedAgent,
  messages,
  newMessage,
  setNewMessage,
  isTyping,
  waitTime,
  onSendMessage,
  onGoBack,
  showBackButton = true
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={`flex ${isMobile ? 'h-screen w-screen fixed inset-0 z-50' : 'h-screen'} bg-gray-50 overflow-hidden`}>
      <div className="flex-1 flex flex-col w-full">
        <StandardizedChatHeader 
          botName={selectedAgent?.name || 'Assistant IA'}
          botRole={selectedAgent?.role || 'Assistant Intelligent'}
          isOnline={selectedAgent?.status === 'online'}
          waitTime={waitTime}
          onGoBack={onGoBack}
          showBackButton={showBackButton}
        />
        
        <StandardizedChatMessages 
          messages={messages}
          isTyping={isTyping}
        />
        
        <StandardizedChatInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={onSendMessage}
          isTyping={isTyping}
          botId={selectedAgent?.id}
          userContext={selectedAgent?.chatContext as any || 'general'}
        />
      </div>
    </div>
  );
};
