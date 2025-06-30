
import React from 'react';
import { StandardizedChatInterface } from '@/components/chat/StandardizedChatInterface';

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

interface ChatInterfaceProps {
  selectedAgent: Agent | null;
  messages: Message[];
  newMessage: string;
  setNewMessage: (message: string) => void;
  isTyping: boolean;
  waitTime: number;
  onSendMessage: () => void;
  onGoBack: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  selectedAgent,
  messages,
  newMessage,
  setNewMessage,
  isTyping,
  waitTime,
  onSendMessage,
  onGoBack
}) => {
  return (
    <StandardizedChatInterface
      selectedAgent={selectedAgent}
      messages={messages}
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      isTyping={isTyping}
      waitTime={waitTime}
      onSendMessage={onSendMessage}
      onGoBack={onGoBack}
      showBackButton={true}
    />
  );
};
