
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Power, PowerOff, BarChart3, MessageCircle, Copy, Trash2,
  ExternalLink, QrCode,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

interface BotStats {
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

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
  created_at: string;
  updated_at: string;
}

interface BotCardProps {
  bot: Bot;
  stats: BotStats;
  onTest: (bot: Bot) => void;
  onAnalytics: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (bot: Bot) => void;
  onCopy: (text: string, description: string) => void;
  onShareWhatsApp: (bot: Bot) => void;
  onQRClick: (url: string, name: string) => void;
}

export const BotCard: React.FC<BotCardProps> = ({
  bot, stats, onTest, onAnalytics, onDelete, onToggleStatus,
  onCopy, onShareWhatsApp, onQRClick
}) => (
  <Card className="p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bot.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
          <Bot className={`w-5 h-5 ${bot.is_active ? 'text-green-600' : 'text-gray-400'}`} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{bot.name}</h3>
          <Badge variant={bot.is_active ? "default" : "secondary"}>
            {bot.is_active ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
      </div>
      <Button
        onClick={() => onToggleStatus(bot)}
        variant="ghost"
        size="sm"
        className="p-2"
      >
        {bot.is_active
          ? <PowerOff className="w-4 h-4 text-red-500" />
          : <Power className="w-4 h-4 text-green-500" />
        }
      </Button>
    </div>

    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
      {bot.description || 'Aucune description'}
    </p>

    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
      <div className="text-xs text-gray-500 mb-1">Chat: {bot.chat_title}</div>
    </div>

    {bot.share_enabled && bot.public_chat_url && (
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
          <span className="text-xs font-medium text-blue-700">Lien public</span>
          <div className="flex space-x-1">
            <Button
              onClick={() => onShareWhatsApp(bot)}
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6 bg-green-500 hover:bg-green-600 text-white rounded"
              title="Partager sur WhatsApp avec message personnalisé"
            >
              <FaWhatsapp className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => onQRClick(bot.public_chat_url, bot.name)}
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6 bg-purple-500 hover:bg-purple-600 text-white rounded"
              title="Générer QR Code"
            >
              <QrCode className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => onCopy(bot.public_chat_url, 'Lien public')}
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => window.open(bot.public_chat_url, '_blank')}
              variant="ghost"
              size="sm"
              className="p-1 h-6 w-6"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-blue-600 truncate">
          {bot.public_chat_url}
        </div>
      </div>
    )}

    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="text-center">
        <div className="text-lg font-bold text-blue-600">{stats.totalMessages}</div>
        <div className="text-xs text-gray-500">Messages</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-green-600">{stats.totalUsers}</div>
        <div className="text-xs text-gray-500">Utilisateurs</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-bold text-purple-600">{stats.activeToday}</div>
        <div className="text-xs text-gray-500">Actifs</div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 mb-4">
      <Button
        onClick={() => onTest(bot)}
        variant="outline"
        size="sm"
        className="text-green-600 border-green-200 hover:bg-green-50"
      >
        <MessageCircle className="w-4 h-4 mr-1" />
        Chat
      </Button>
      <Button
        onClick={() => onAnalytics(bot.id, bot.name)}
        variant="outline"
        size="sm"
        className="text-blue-600 border-blue-200 hover:bg-blue-50"
      >
        <BarChart3 className="w-4 h-4 mr-1" />
        Analytics
      </Button>
    </div>

    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <div className="flex space-x-2">
        <Button
          onClick={() => onDelete(bot.id)}
          variant="ghost"
          size="sm"
          className="p-2 text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="text-xs text-gray-500">
        Créé le {new Date(bot.created_at).toLocaleDateString('fr-FR')}
      </div>
    </div>
  </Card>
);
