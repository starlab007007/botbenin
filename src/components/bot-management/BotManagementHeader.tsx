
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BotManagerNav } from '../BotManagerNav';

type ViewType = 'dashboard' | 'list' | 'create' | 'analytics' | 'share' | 'conversations';

interface BotManagementHeaderProps {
  currentView: ViewType;
  botCount: number;
  maxBots: number;
  isAuthenticated: boolean;
  onChangeView: (view: ViewType) => void;
  onCreateBot: () => void;
}

export const BotManagementHeader: React.FC<BotManagementHeaderProps> = ({
  currentView,
  botCount,
  maxBots,
  isAuthenticated,
  onChangeView,
  onCreateBot
}) => {
  const isLimitReached = botCount >= maxBots;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <BotManagerNav currentView={currentView} onChangeView={onChangeView} />
      <Button 
        onClick={onCreateBot}
        disabled={!isAuthenticated || isLimitReached}
        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4 mr-2" />
        {!isAuthenticated ? 'Connexion requise' : isLimitReached ? 'Limite atteinte' : 'Nouveau Chatbot'}
      </Button>
    </div>
  );
};
