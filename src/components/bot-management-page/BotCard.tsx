
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Share2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { StandardBotConfig } from '@/services/botConfigService';

interface BotCardProps {
  bot: StandardBotConfig;
  isValid: boolean;
  onEdit: (botId: string) => void;
  onDelete: (botId: string) => void;
  onManage: (bot: StandardBotConfig) => void;
  onCopyLink: (bot: StandardBotConfig) => void;
}

export const BotCard: React.FC<BotCardProps> = ({
  bot,
  isValid,
  onEdit,
  onDelete,
  onManage,
  onCopyLink
}) => {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{bot.name}</CardTitle>
            <p className="text-sm text-gray-600 line-clamp-2">
              {bot.description}
            </p>
          </div>
          <div className="flex space-x-1 ml-2">
            {isValid ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {bot.is_active ? (
              <div className="w-3 h-3 bg-green-400 rounded-full" />
            ) : (
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline">
            {bot.chat_context}
          </Badge>
          {bot.share_enabled && (
            <Badge variant="outline" className="text-green-600">
              Public
            </Badge>
          )}
          {!isValid && (
            <Badge variant="outline" className="text-red-600">
              Configuration invalide
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <Button
            onClick={() => onEdit(bot.id)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          
          <div className="flex space-x-2">
            {bot.share_enabled && isValid && (
              <Button
                onClick={() => onCopyLink(bot)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Copier lien
              </Button>
            )}
            
            <Button
              onClick={() => onManage(bot)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Gérer
            </Button>
          </div>
          
          <Button
            onClick={() => onDelete(bot.id)}
            variant="outline"
            size="sm"
            className="w-full text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
