
import React, { useEffect } from 'react';
import { useLiveChatBots } from '@/hooks/useLiveChatBots';
import { useChatLogic } from '@/hooks/useChatLogic';
import { ChatSelectionView } from './chat/ChatSelectionView';
import { ChatInterface } from './chat/ChatInterface';
import { useAuth } from '@/contexts/AuthContext';

export const LiveChatSystem: React.FC = () => {
  const { enableGuestMode, isGuest, isAuthenticated } = useAuth();

  // S'assurer que le mode invité est activé pour les utilisateurs non connectés
  useEffect(() => {
    if (!isAuthenticated && !isGuest) {
      console.log('[LiveChatSystem] Activation automatique du mode invité');
      enableGuestMode();
    }
  }, [isAuthenticated, isGuest, enableGuestMode]);

  // Utilisation du hook pour récupérer les bots publics (accessible à tous)
  console.log('[LiveChatSystem] === INITIALISATION POUR ACCÈS PUBLIC TOTAL ===');
  console.log('[LiveChatSystem] Accessible aux utilisateurs connectés ET non connectés');
  
  const { 
    bots: liveChatBots, 
    loading: botsLoading, 
    error: botsError, 
    refreshBots 
  } = useLiveChatBots();

  console.log('[LiveChatSystem] État des bots publics:', {
    botsCount: liveChatBots?.length || 0,
    isLoading: botsLoading,
    hasError: !!botsError,
    error: botsError,
    authStatus: isAuthenticated ? 'authentifié' : isGuest ? 'invité' : 'non initialisé'
  });

  const {
    isConnected,
    selectedAgent,
    messages,
    newMessage,
    setNewMessage,
    isTyping,
    waitTime,
    startChat,
    sendMessage,
    goBackToSelection
  } = useChatLogic();

  // Interface de sélection des bots publics - accessible à tous
  if (!isConnected) {
    console.log('[LiveChatSystem] AFFICHAGE: Interface de sélection publique');
    console.log('[LiveChatSystem] Tous les bots publics visibles pour tous les utilisateurs');

    return (
      <ChatSelectionView
        liveChatBots={liveChatBots}
        botsLoading={botsLoading}
        botsError={botsError}
        onStartChat={startChat}
        onRefreshBots={refreshBots}
      />
    );
  }

  // Interface de chat intégrée dans la même page
  console.log('[LiveChatSystem] AFFICHAGE: Interface de chat pour bot sélectionné');
  return (
    <ChatInterface
      selectedAgent={selectedAgent}
      messages={messages}
      newMessage={newMessage}
      setNewMessage={setNewMessage}
      isTyping={isTyping}
      waitTime={waitTime}
      onSendMessage={sendMessage}
      onGoBack={goBackToSelection}
    />
  );
};
