
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface BotLimitDisplayProps {
  botCount: number;
  maxBots: number;
  isAuthenticated: boolean;
}

export const BotLimitDisplay: React.FC<BotLimitDisplayProps> = ({ 
  botCount, 
  maxBots, 
  isAuthenticated 
}) => {
  if (!isAuthenticated) return null;

  const isLimitReached = botCount >= maxBots;

  return (
    <>
      {/* Usage Display */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">
                Plan Gratuit - Utilisation des chatbots
              </p>
              <p className="text-blue-700 text-sm">
                {botCount} / {maxBots} chatbots créés
              </p>
            </div>
            <div className="text-right">
              <div className="w-32 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.min((botCount / maxBots) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limit Reached Warning */}
      {isLimitReached && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">
                  Limite de création atteinte
                </p>
                <p className="text-red-700 text-sm mt-1">
                  Vous avez atteint la limite de {maxBots} chatbots pour votre plan gratuit. 
                  Supprimez un chatbot existant ou passez à un plan supérieur pour créer de nouveaux bots.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
