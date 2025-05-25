
import React, { useState } from 'react';
import { LandingHero } from '@/components/LandingHero';
import { ChatInterface } from '@/components/ChatInterface';

const Index = () => {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen gradient-warm">
      {!showChat ? (
        <LandingHero onStartChat={() => setShowChat(true)} />
      ) : (
        <ChatInterface onBackToLanding={() => setShowChat(false)} />
      )}
    </div>
  );
};

export default Index;
