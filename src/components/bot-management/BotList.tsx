
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Plus } from 'lucide-react';
import { BotCard } from '../BotCard';

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

interface BotListProps {
  bots: Bot[];
  botStats: Record<string, BotStats>;
  isAuthenticated: boolean;
  isLimitReached: boolean;
  onCreateBot: () => void;
  onTest: (bot: Bot) => void;
  onAnalytics: (botId: string, botName: string) => void;
  onDelete: (botId: string) => void;
  onToggleStatus: (bot: Bot) => void;
  onToggleLiveChat: (bot: Bot) => void;
  onCopy: (text: string, description: string) => void;
  onShareWhatsApp: (bot: Bot) => void;
  onQRClick: (url: string, botName: string) => void;
}

export const BotList: React.FC<BotListProps> = ({
  bots,
  botStats,
  isAuthenticated,
  isLimitReached,
  onCreateBot,
  onTest,
  onAnalytics,
  onDelete,
  onToggleStatus,
  onToggleLiveChat,
  onCopy,
  onShareWhatsApp,
  onQRClick
}) => {
  if (!isAuthenticated) {
    return null;
  }

  if (bots.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Aucun chatbot créé
        </h3>
        <p className="text-gray-600 mb-4">
          Créez votre premier chatbot avec tracking avancé des visiteurs
        </p>
        <Button 
          onClick={onCreateBot}
          disabled={isLimitReached}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Créer mon premier chatbot
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bots.map((bot) => {
        const stats = botStats[bot.id] || { totalMessages: 0, totalUsers: 0, activeToday: 0 };
        return (
          <BotCard
            key={bot.id}
            bot={bot}
            stats={stats}
            onTest={onTest}
            onAnalytics={onAnalytics}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            onToggleLiveChat={onToggleLiveChat}
            onCopy={onCopy}
            onShareWhatsApp={onShareWhatsApp}
            onQRClick={onQRClick}
          />
        );
      })}
    </div>
  );
};
