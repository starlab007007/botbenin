
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingHero } from '@/components/LandingHero';
import { ChatInterface } from '@/components/ChatInterface';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const [showChat, setShowChat] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Rediriger vers l'app si l'utilisateur est connecté
  useEffect(() => {
    if (isAuthenticated && !showChat) {
      const timer = setTimeout(() => {
        navigate('/app/home');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, navigate, showChat]);

  const handleStartChat = () => {
    if (isAuthenticated) {
      navigate('/app/chat');
    } else {
      setShowChat(true);
    }
  };

  const handleBackToLanding = () => {
    setShowChat(false);
  };

  return (
    <div className="min-h-screen gradient-warm">
      <div className="w-full max-w-[1440px] mx-auto">
        {!showChat ? (
          <LandingHero onStartChat={handleStartChat} />
        ) : (
          <div className="px-4 sm:px-6 lg:px-8">
            <ChatInterface onBackToLanding={handleBackToLanding} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
