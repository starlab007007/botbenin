
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Bot {
  id: string;
  name: string;
}

interface BotAnalyticsSectionProps {
  bots: Bot[];
  selectedBotId: string | null;
  onBotSelect: (botId: string, botName: string) => void;
}

export const BotAnalyticsSection: React.FC<BotAnalyticsSectionProps> = ({
  bots,
  selectedBotId,
  onBotSelect
}) => {
  if (bots.length === 0) return null;

  return (
    <Card className="uniform-card p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Voir les analytics d'un bot</h3>
      <div className="flex flex-wrap gap-2">
        {bots.map(bot => (
          <Button
            key={bot.id}
            variant="outline"
            className={selectedBotId === bot.id ? "border-blue-600" : ""}
            onClick={() => onBotSelect(bot.id, bot.name)}
          >
            {bot.name}
          </Button>
        ))}
      </div>
    </Card>
  );
};
