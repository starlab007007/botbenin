
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Bot, 
  Settings, 
  Trash2, 
  Eye, 
  Edit3,
  Power,
  PowerOff,
  BarChart3,
  Users,
  MessageSquare,
  Share2,
  Copy,
  ExternalLink,
  Play,
  MessageCircle,
  QrCode,
  Monitor
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { cleanPublicUrl } from './botManagementUtils';

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
  display_in_live_chat?: boolean;
  created_at: string;
  updated_at: string;
}

interface BotStats {
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

interface BotCardProps {
  bot: Bot;
  stats: BotStats;
  onTest: (bot: Bot) => void;
  onAnalytics: (botId: string, botName: string) => void;
  onDelete: (botId: string) => void;
  onToggleStatus: (bot: Bot) => void;
  onToggleLiveChat?: (bot: Bot) => void;
  onCopy: (text: string, description: string) => void;
  onShareWhatsApp: (bot: Bot) => void;
  onQRClick: (url: string, botName: string) => void;
}

export const BotCard: React.FC<BotCardProps> = ({
  bot,
  stats,
  onTest,
  onAnalytics,
  onDelete,
  onToggleStatus,
  onToggleLiveChat,
  onCopy,
  onShareWhatsApp,
  onQRClick
}) => {
  const cleanedUrl = cleanPublicUrl(bot.public_chat_url);

  return (
    <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900">{bot.name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{bot.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${bot.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-500">{bot.is_active ? 'Actif' : 'Inactif'}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistiques */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-50 p-2 rounded">
            <div className="text-sm font-semibold text-blue-700">{stats.totalMessages}</div>
            <div className="text-xs text-blue-600">Messages</div>
          </div>
          <div className="bg-green-50 p-2 rounded">
            <div className="text-sm font-semibold text-green-700">{stats.totalUsers}</div>
            <div className="text-xs text-green-600">Utilisateurs</div>
          </div>
          <div className="bg-orange-50 p-2 rounded">
            <div className="text-sm font-semibold text-orange-700">{stats.activeToday}</div>
            <div className="text-xs text-orange-600">Actifs</div>
          </div>
        </div>

        {/* Toggle Chat Live */}
        {onToggleLiveChat && (
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Chat Live</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-purple-600">
                {bot.display_in_live_chat ? 'Affiché' : 'Masqué'}
              </span>
              <Switch
                checked={bot.display_in_live_chat || false}
                onCheckedChange={() => onToggleLiveChat(bot)}
              />
            </div>
          </div>
        )}

        {/* Actions principales */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onTest(bot)}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            disabled={!bot.is_active}
          >
            <Play className="w-4 h-4 mr-1" />
            Tester
          </Button>
          <Button
            onClick={() => onAnalytics(bot.id, bot.name)}
            variant="outline"
            size="sm"
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Analytics
          </Button>
        </div>

        {/* Actions de partage */}
        <div className="grid grid-cols-3 gap-1">
          <Button
            onClick={() => onCopy(cleanedUrl, `Lien public de ${bot.name}`)}
            variant="outline"
            size="sm"
            className="text-gray-600 border-gray-200 hover:bg-gray-50"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => onShareWhatsApp(bot)}
            variant="outline"
            size="sm"
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <FaWhatsapp className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => onQRClick(cleanedUrl, bot.name)}
            variant="outline"
            size="sm"
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <QrCode className="w-3 h-3" />
          </Button>
        </div>

        {/* Actions de gestion */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-1">
            <Button
              onClick={() => onToggleStatus(bot)}
              variant="outline"
              size="sm"
              className={bot.is_active ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50"}
            >
              {bot.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
            </Button>
            <Button
              onClick={() => onDelete(bot.id)}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <Badge variant={bot.is_active ? "default" : "secondary"} className="text-xs">
            {bot.chat_context}
          </Badge>
        </div>

        {/* Lien public */}
        <div className="text-xs text-gray-500 truncate bg-gray-50 p-2 rounded">
          {cleanedUrl}
        </div>
      </CardContent>
    </Card>
  );
};
