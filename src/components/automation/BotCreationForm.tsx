
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Globe, MessageSquare } from 'lucide-react';

interface BotCreationFormProps {
  botName: string;
  webhookUrl: string;
  isCreating: boolean;
  isLimitReached: boolean;
  onBotNameChange: (value: string) => void;
  onWebhookUrlChange: (value: string) => void;
  onTestWebhook: () => void;
  onCreateBot: () => void;
}

export const BotCreationForm: React.FC<BotCreationFormProps> = ({
  botName,
  webhookUrl,
  isCreating,
  isLimitReached,
  onBotNameChange,
  onWebhookUrlChange,
  onTestWebhook,
  onCreateBot
}) => {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bot className="w-5 h-5" />
          <span>Configuration du Chatbot</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Nom du Chatbot <span className="text-red-500">*</span>
          </label>
          <Input
            value={botName}
            onChange={(e) => onBotNameChange(e.target.value)}
            placeholder="Mon Assistant IA"
            className="w-full"
            disabled={isLimitReached}
          />
          <p className="text-xs text-gray-500">
            Le nom qui apparaîtra dans votre tableau de bord
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            URL du Webhook N8N <span className="text-red-500">*</span>
          </label>
          <Input
            value={webhookUrl}
            onChange={(e) => onWebhookUrlChange(e.target.value)}
            placeholder="https://votre-webhook.n8n.cloud/webhook/..."
            className="w-full"
            disabled={isLimitReached}
          />
          <p className="text-xs text-gray-500">
            L'URL de votre webhook N8N personnalisé pour ce chatbot
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={onTestWebhook}
            variant="outline"
            disabled={!webhookUrl.trim() || isCreating || isLimitReached}
            className="flex-1"
          >
            <Globe className="w-4 h-4 mr-2" />
            Tester la connexion
          </Button>
          <Button
            onClick={onCreateBot}
            disabled={!webhookUrl.trim() || !botName.trim() || isCreating || isLimitReached}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            ) : (
              <MessageSquare className="w-4 h-4 mr-2" />
            )}
            {isLimitReached ? 'Limite atteinte' : 'Créer le Chatbot'}
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">🔗 Webhook personnalisé :</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Chaque bot utilisera son propre webhook N8N</li>
            <li>• Headers X-Bot-Platform et X-Bot-Version standardisés</li>
            <li>• Payload avec module et service_type configurés</li>
            <li>• Session ID et user_id au format Bot.Bj</li>
            <li>• Gestion d'erreurs et fallback intégrés</li>
            <li>• Logs détaillés pour debugging</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
