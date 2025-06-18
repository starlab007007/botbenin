
import React from 'react';
import { OwnerDashboard } from '@/components/OwnerDashboard';
import { ConversationManager } from '@/components/ConversationManager';
import { ShortenedLinksManager } from '@/components/ShortenedLinksManager';
import { CompleteBotAnalytics } from '@/components/CompleteBotAnalytics';
import { Button } from '@/components/ui/button';
import { AuthGuard } from './AuthGuard';
import { BotList } from './BotList';

interface Bot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  api_key: string;
  is_active: boolean;
  chat_title: string;
  chat_context: string;
  share_enabled: boolean;
  public_chat_url: string;
  display_in_live_chat: boolean;
  created_at: string;
  updated_at: string;
}

interface BotStats {
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

interface BotManagementContentProps {
  currentView: string;
  bots: Bot[];
  botStats: Record<string, BotStats>;
  isAuthenticated: boolean;
  selectedBotForAnalytics: { id: string; name: string } | null;
  selectedBotForSharing: { id: string; name: string } | null;
  onViewAnalytics: (botId: string, botName: string) => void;
  onBackToList: () => void;
  onBackToDashboard: () => void;
  onTest: (bot: Bot) => void;
  onDelete: (botId: string) => void;
  onToggleStatus: (bot: Bot) => void;
  onToggleLiveChat: (bot: Bot) => void;
  onCopy: (text: string, description: string) => void;
  onShareWhatsApp: (bot: Bot) => void;
  onQRClick: (url: string, botName: string) => void;
  onCreateBot: () => void;
}

export const BotManagementContent: React.FC<BotManagementContentProps> = ({
  currentView,
  bots,
  botStats,
  isAuthenticated,
  selectedBotForAnalytics,
  selectedBotForSharing,
  onViewAnalytics,
  onBackToList,
  onBackToDashboard,
  onTest,
  onDelete,
  onToggleStatus,
  onToggleLiveChat,
  onCopy,
  onShareWhatsApp,
  onQRClick,
  onCreateBot
}) => {
  const isLimitReached = bots.length >= 10;

  if (currentView === 'analytics' && selectedBotForAnalytics) {
    return (
      <CompleteBotAnalytics
        botId={selectedBotForAnalytics.id}
        botName={selectedBotForAnalytics.name}
        onBack={onBackToDashboard}
      />
    );
  }

  if (currentView === 'share' && selectedBotForSharing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={onBackToList}
            >
              ← Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partage et Tracking</h1>
              <p className="text-gray-600">{selectedBotForSharing.name}</p>
            </div>
          </div>
        </div>
        
        <ShortenedLinksManager
          botId={selectedBotForSharing.id}
          botName={selectedBotForSharing.name}
          onViewAnalytics={onViewAnalytics}
        />
      </div>
    );
  }

  if (currentView === 'conversations') {
    return (
      <ConversationManager
        onBack={onBackToDashboard}
      />
    );
  }

  if (currentView === 'dashboard') {
    return (
      <OwnerDashboard onViewBotAnalytics={onViewAnalytics} />
    );
  }

  // Default to list view
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mes Chatbots</h2>
        <p className="text-gray-600 mb-6">Créez et gérez vos chatbots avec tracking avancé</p>
      </div>

      <AuthGuard isAuthenticated={isAuthenticated}>
        <BotList
          bots={bots}
          botStats={botStats}
          isAuthenticated={isAuthenticated}
          isLimitReached={isLimitReached}
          onCreateBot={onCreateBot}
          onTest={onTest}
          onAnalytics={onViewAnalytics}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
          onToggleLiveChat={onToggleLiveChat}
          onCopy={onCopy}
          onShareWhatsApp={onShareWhatsApp}
          onQRClick={onQRClick}
        />
      </AuthGuard>
    </>
  );
};
