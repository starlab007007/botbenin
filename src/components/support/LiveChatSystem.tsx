
import React from 'react';
import { useLiveChatBots } from '@/hooks/useLiveChatBots';
import { useChatLogic } from '@/hooks/useChatLogic';
import { ChatSelectionView } from './chat/ChatSelectionView';
import { ChatInterface } from './chat/ChatInterface';

export const LiveChatSystem: React.FC = () => {
  // Utilisation du hook pour récupérer les bots publics (accessible à tous)
  console.log('[LiveChatSystem] === INITIALISATION POUR ACCÈS PUBLIC ===');
  const { 
    bots: liveChatBots, 
    loading: botsLoading, 
    error: botsError, 
    refreshBots 
  } = useLiveChatBots();

  console.log('[LiveChatSystem] Hook result pour accès public:', {
    botsCount: liveChatBots?.length || 0,
    isLoading: botsLoading,
    hasError: !!botsError,
    error: botsError
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

  // Interface de sélection des bots publics
  if (!isConnected) {
    console.log('[LiveChatSystem] AFFICHAGE: Interface de sélection pour accès public');
    console.log('[LiveChatSystem] État des bots publics:', {
      count: liveChatBots?.length || 0,
      loading: botsLoading,
      error: botsError
    });

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
