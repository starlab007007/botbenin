
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/ChatInterface';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, ArrowLeft, Eye, Share, ExternalLink, Copy } from 'lucide-react';

interface AutomationBotChatProps {
  botId: string;
  onBack: () => void;
}

interface BotData {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  chat_title: string;
  chat_context: string;
  public_chat_url: string;
  is_active: boolean;
}

export const AutomationBotChat: React.FC<AutomationBotChatProps> = ({ botId, onBack }) => {
  const [bot, setBot] = useState<BotData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBot();
  }, [botId]);

  const fetchBot = async () => {
    try {
      const { data: botData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .single();

      if (error) throw error;

      setBot(botData);
    } catch (error) {
      console.error('Erreur lors du chargement du bot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le bot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copié !",
        description: `${label} copié dans le presse-papiers`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier dans le presse-papiers",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Bot non trouvé</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-2 text-center text-sm">
          Mode Test Automatisation - {bot.name}
          <Button
            onClick={() => setShowChat(false)}
            variant="ghost"
            size="sm"
            className="ml-4 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour
          </Button>
        </div>
        <div className="h-[calc(100vh-3rem)]">
          <ChatInterface
            onBackToLanding={() => setShowChat(false)}
            webhookUrl={bot.webhook_url}
            chatTitle={bot.chat_title}
            chatContext={bot.chat_context}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bot Automatisé</h2>
          <p className="text-gray-600">Interface et contrôles du bot</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations du Bot */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <span>Informations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">{bot.name}</h3>
              <p className="text-sm text-gray-600">{bot.description}</p>
            </div>

            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Titre du chat:</span>
                <p className="text-gray-600">{bot.chat_title}</p>
              </div>
              <div className="text-sm">
                <span className="font-medium">Contexte:</span>
                <p className="text-gray-600">{bot.chat_context}</p>
              </div>
              <div className="text-sm">
                <span className="font-medium">Statut:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  bot.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {bot.is_active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Webhook URL:</span>
              <div className="p-2 bg-gray-50 rounded text-xs break-all">
                {bot.webhook_url}
              </div>
            </div>

            {bot.public_chat_url && (
              <div className="space-y-2">
                <span className="text-sm font-medium">URL Publique:</span>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-2 bg-blue-50 rounded text-xs break-all">
                    {bot.public_chat_url}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(bot.public_chat_url, 'URL publique')}
                    variant="ghost"
                    size="sm"
                    className="p-2"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions et Interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Actions et Interface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowChat(true)}
                className="h-24 flex-col space-y-2 bg-blue-600 hover:bg-blue-700"
              >
                <Eye className="w-6 h-6" />
                <span>Tester le Bot</span>
                <span className="text-xs opacity-75">Interface complète</span>
              </Button>

              {bot.public_chat_url && (
                <Button
                  onClick={() => window.open(bot.public_chat_url, '_blank')}
                  variant="outline"
                  className="h-24 flex-col space-y-2"
                >
                  <ExternalLink className="w-6 h-6" />
                  <span>Ouvrir Public</span>
                  <span className="text-xs opacity-75">Nouvelle fenêtre</span>
                </Button>
              )}

              <Button
                onClick={() => copyToClipboard(bot.public_chat_url, 'URL publique')}
                variant="outline"
                className="h-24 flex-col space-y-2"
                disabled={!bot.public_chat_url}
              >
                <Share className="w-6 h-6" />
                <span>Partager</span>
                <span className="text-xs opacity-75">Copier le lien</span>
              </Button>

              <Button
                onClick={() => copyToClipboard(bot.webhook_url, 'URL webhook')}
                variant="outline"
                className="h-24 flex-col space-y-2"
              >
                <Bot className="w-6 h-6" />
                <span>Webhook</span>
                <span className="text-xs opacity-75">Copier l'URL</span>
              </Button>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Bot Opérationnel !</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Le bot est connecté à votre workflow n8n</li>
                <li>• L'interface de chat fonctionne comme le menu principal</li>
                <li>• Les messages sont automatiquement traités par votre webhook</li>
                <li>• Le bot peut être partagé via l'URL publique</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
