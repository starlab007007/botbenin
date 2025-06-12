
import React from 'react';
import { LiveChatSystem } from '@/components/support/LiveChatSystem';

export const ChatPage: React.FC = () => {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <LiveChatSystem />
    </div>
  );
};
