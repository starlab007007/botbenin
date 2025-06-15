
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3, Bot, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BotSummary {
  bot_id: string;
  bot_name: string;
  is_active: boolean;
  total_unique_users: number;
  total_messages: number;
  messages_24h: number;
  last_message_at: string;
}

interface BotsSummaryListProps {
  botsSummary: BotSummary[];
  onViewBotAnalytics: (botId: string, botName: string) => void;
}

export const BotsSummaryList: React.FC<BotsSummaryListProps> = ({
  botsSummary,
  onViewBotAnalytics
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <BarChart3 className="w-5 h-5 text-purple-600" />
        <span>Résumé des chatbots</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {botsSummary.length === 0 ? (
        <div className="text-center py-8">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucun chatbot trouvé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {botsSummary.map((bot) => (
            <div key={bot.bot_id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  bot.is_active ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>
                <div>
                  <div className="font-medium text-gray-900">{bot.bot_name}</div>
                  <div className="text-sm text-gray-600">
                    {bot.total_unique_users} utilisateurs • {bot.total_messages} messages
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                <div className="text-left sm:text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {bot.messages_24h} msgs aujourd'hui
                  </div>
                  <div className="text-xs text-gray-500">
                    Dernière activité: {bot.last_message_at 
                      ? new Date(bot.last_message_at).toLocaleDateString('fr-FR')
                      : 'Jamais'
                    }
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewBotAnalytics(bot.bot_id, bot.bot_name)}
                  className="flex-shrink-0"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Analytics
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);
