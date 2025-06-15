
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopPerformingBotCardProps {
  topBotId: string;
  topBotName: string;
  onViewBotAnalytics: (botId: string, botName: string) => void;
}

export const TopPerformingBotCard: React.FC<TopPerformingBotCardProps> = ({
  topBotId,
  topBotName,
  onViewBotAnalytics
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <span>Bot le plus performant</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {topBotName ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              {topBotName}
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewBotAnalytics(topBotId, topBotName)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Voir
            </Button>
          </div>
          <p className="text-gray-600 text-sm">
            Ce bot génère le plus de conversations et d'engagement.
          </p>
        </div>
      ) : (
        <p className="text-gray-600">Aucun bot actif</p>
      )}
    </CardContent>
  </Card>
);
