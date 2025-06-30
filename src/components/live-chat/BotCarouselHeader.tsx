
import React from 'react';
import { Zap } from 'lucide-react';

interface BotCarouselHeaderProps {
  botCount: number;
}

export const BotCarouselHeader: React.FC<BotCarouselHeaderProps> = ({ botCount }) => {
  return (
    <div className="text-center mb-6">
      <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
        <Zap className="w-4 h-4" />
        <span className="font-medium">
          {botCount} assistant{botCount > 1 ? 's' : ''} IA public{botCount > 1 ? 's' : ''} disponible{botCount > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};
