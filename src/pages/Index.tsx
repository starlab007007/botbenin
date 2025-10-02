
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingHero } from '@/components/LandingHero';
import { ChatInterface } from '@/components/ChatInterface';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [showChat, setShowChat] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Rediriger vers l'app si l'utilisateur est connecté
  useEffect(() => {
    // Vérifier à la fois isAuthenticated ET user pour s'assurer que l'état est stable
    if (isAuthenticated && user && !showChat) {
      console.log('[Index] User authenticated:', user.email, '- Preparing redirect to /prospect-preparation');
      console.log('[Index] Auth state:', { isAuthenticated, hasUser: !!user, userId: user.id });
      
      // Délai suffisant pour permettre la propagation complète de la session
      const redirectTimer = setTimeout(() => {
        console.log('[Index] Executing redirect now...');
        navigate('/prospect-preparation', { replace: true });
      }, 500);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isAuthenticated, user, navigate, showChat]);

  const handleStartChat = () => {
    if (isAuthenticated) {
      navigate('/chat');
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
          <div>
            <LandingHero onStartChat={handleStartChat} />
          </div>
        ) : (
          <div className={isMobile ? 'px-[2.5%]' : 'px-4 sm:px-6 lg:px-8'}>
            <ChatInterface onBackToLanding={handleBackToLanding} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
