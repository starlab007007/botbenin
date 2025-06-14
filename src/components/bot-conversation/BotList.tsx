
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle, Loader } from "lucide-react";
import { Bot } from './types';

interface BotListProps {
  bots: Bot[];
  loadingBots: boolean;
  selectedBot: Bot | null;
  onBotSelect: (bot: Bot) => void;
}

export const BotList: React.FC<BotListProps> = ({
  bots,
  loadingBots,
  selectedBot,
  onBotSelect,
}) => {
  return (
    <Card className="w-1/5 min-w-[180px] max-w-xs flex flex-col gap-2 px-2 py-4 overflow-auto">
      <div className="font-semibold mb-2 text-lg flex items-center">
        <Users className="w-4 h-4 mr-1 text-primary" />
        Vos bots
      </div>
      {loadingBots ? (
        <Loader className="animate-spin mx-auto my-8" />
      ) : (
        bots.map(bot => (
          <Button
            key={bot.id}
            size="sm"
            variant={selectedBot?.id === bot.id ? "default" : "outline"}
            onClick={() => onBotSelect(bot)}
            className="flex w-full justify-between items-center mb-1"
          >
            <span className="truncate">{bot.name}</span>
            {bot.is_active && <CheckCircle className="w-4 h-4 ml-1 text-green-500" />}
          </Button>
        ))
      )}
    </Card>
  );
};
