
import React from 'react';
import { ChatInterface } from '@/components/ChatInterface';

export const ChatPage: React.FC = () => {
  return (
    <div className="h-screen">
      <ChatInterface onBackToLanding={() => window.history.back()} />
    </div>
  );
};
