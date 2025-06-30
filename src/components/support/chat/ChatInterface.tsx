
import React from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

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
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col">
        <ChatHeader 
          selectedAgent={selectedAgent}
          waitTime={waitTime}
          onGoBack={onGoBack}
        />
        
        <ChatMessages 
          messages={messages}
          isTyping={isTyping}
        />
        
        <ChatInput
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          onSendMessage={onSendMessage}
          isTyping={isTyping}
        />
      </div>
    </div>
  );
};
