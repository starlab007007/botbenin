
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Workflow, ArrowLeft, Globe, MessageSquare } from 'lucide-react';

interface BotAutomationCreatorProps {
  onBack: () => void;
  onBotCreated: (botId: string) => void;
}

export const BotAutomationCreator: React.FC<BotAutomationCreatorProps> = ({ onBack, onBotCreated }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const validateWebhookUrl = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const extractBotNameFromUrl = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      const pathSegments = parsedUrl.pathname.split('/').filter(segment => segment);
      return pathSegments[pathSegments.length - 1] || 'Bot Automatisé';
    } catch {
      return 'Bot Automatisé';
    }
  };

  const createBotFromWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "URL manquante",
        description: "Veuillez saisir l'URL du webhook",
        variant: "destructive",
      });
      return;
    }

    if (!validateWebhookUrl(webhookUrl)) {
      toast({
        title: "URL invalide",
        description: "Veuillez saisir une URL webhook valide (http:// ou https://)",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer ou créer le bot_owner
      let { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        const { data: newOwner } = await supabase
          .from('bot_owners')
          .insert({ user_id: user.id })
          .select('id')
          .single();
        ownerData = newOwner;
      }

      if (!ownerData) {
        throw new Error('Impossible de créer le propriétaire du bot');
      }

      // Générer automatiquement les détails du bot
      const botName = extractBotNameFromUrl(webhookUrl);
      const botData = {
        owner_id: ownerData.id,
        name: `${botName} - Automatisation`,
        description: `Bot automatisé créé via webhook - ${new Date().toLocaleDateString('fr-FR')}`,
        webhook_url: webhookUrl,
        api_key: '', // Vide car on utilise le webhook
        chat_title: `Assistant ${botName}`,
        chat_context: 'automation',
        share_enabled: true,
        is_active: true
      };

      const { data: newBot, error } = await supabase
        .from('bots')
        .insert(botData)
        .select('*')
        .single();

      if (error) throw error;

      // Générer l'URL publique
      const publicUrl = `${window.location.origin}/bot/${newBot.id}`;
      await supabase
        .from('bots')
        .update({ public_chat_url: publicUrl })
        .eq('id', newBot.id);

      toast({
        title: "Bot créé avec succès !",
        description: `Le bot ${botName} est maintenant opérationnel`,
      });

      onBotCreated(newBot.id);

    } catch (error) {
      console.error('Erreur lors de la création du bot:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le bot automatisé",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const testWebhook = async () => {
    if (!validateWebhookUrl(webhookUrl)) {
      toast({
        title: "URL invalide",
        description: "Veuillez saisir une URL webhook valide",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Test de connexion',
          timestamp: new Date().toISOString(),
          source: 'bot_bj_automation_test'
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        toast({
          title: "Webhook testé avec succès !",
          description: "La connexion avec n8n fonctionne correctement",
        });
      } else {
        toast({
          title: "Test partiellement réussi",
          description: `Réponse reçue (${response.status}), vous pouvez continuer`,
        });
      }
    } catch (error) {
      toast({
        title: "Test du webhook",
        description: "Impossible de tester la connexion, mais vous pouvez continuer",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nouveau Bot Automatisé</h2>
          <p className="text-gray-600">Créez un chatbot via webhook n8n</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <span>Configuration Webhook</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              URL du Webhook n8n
            </label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://votre-instance.n8n.io/webhook/votre-webhook"
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              L'URL webhook de votre workflow n8n qui traitera les messages du bot
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={testWebhook}
              variant="outline"
              disabled={!webhookUrl.trim() || isCreating}
              className="flex-1"
            >
              <Globe className="w-4 h-4 mr-2" />
              Tester la connexion
            </Button>
            <Button
              onClick={createBotFromWebhook}
              disabled={!webhookUrl.trim() || isCreating}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              Créer le Bot
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Comment ça fonctionne :</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Le bot sera créé automatiquement avec votre URL webhook</li>
              <li>• Il aura la même interface que le menu chat existant</li>
              <li>• Les messages seront envoyés directement à votre workflow n8n</li>
              <li>• Le bot sera immédiatement opérationnel après création</li>
              <li>• Une URL publique sera générée pour partager le bot</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
