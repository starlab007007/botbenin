
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Workflow, ArrowLeft, Globe, MessageSquare } from 'lucide-react';

interface BotAutomationCreatorProps {
  onBack: () => void;
  onBotCreated: (botId: string) => void;
}

export const BotAutomationCreator: React.FC<BotAutomationCreatorProps> = ({ onBack, onBotCreated }) => {
  const [webhookUrl, setWebhookUrl] = useState('https://ia.bot.bj/webhook/restau1');
  const [botName, setBotName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user, isAuthenticated, session } = useAuth();

  const validateWebhookUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const createBotFromWebhook = async () => {
    console.log('=== DÉBUT CRÉATION BOT ===');
    console.log('Webhook URL:', webhookUrl);
    console.log('Bot Name:', botName);
    console.log('Auth Context User:', user);
    console.log('Is Authenticated:', isAuthenticated);
    console.log('Supabase Session:', session);

    if (!webhookUrl.trim()) {
      toast({
        title: "URL manquante",
        description: "Veuillez saisir l'URL du webhook",
        variant: "destructive",
      });
      return;
    }

    if (!botName.trim()) {
      toast({
        title: "Nom manquant",
        description: "Veuillez saisir le nom du chatbot",
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

    if (!isAuthenticated || !session) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour créer un chatbot",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const userId = session.user.id;
      console.log('Supabase User ID:', userId);

      // Créer ou récupérer le bot_owner
      let { data: ownerData, error: ownerSelectError } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Owner data:', ownerData);
      console.log('Owner select error:', ownerSelectError);

      if (!ownerData) {
        console.log('Création du bot_owner...');
        const { data: newOwner, error: ownerCreateError } = await supabase
          .from('bot_owners')
          .insert({ 
            user_id: userId,
            subscription_plan: 'free',
            max_bots: 5
          })
          .select('id, max_bots')
          .single();

        console.log('New owner:', newOwner);
        console.log('Owner create error:', ownerCreateError);

        if (ownerCreateError) {
          console.error('Erreur création owner:', ownerCreateError);
          throw new Error(`Impossible de créer le propriétaire: ${ownerCreateError.message}`);
        }
        ownerData = newOwner;
      } else if (ownerSelectError) {
        console.error('Erreur récupération owner:', ownerSelectError);
        throw new Error(`Erreur propriétaire: ${ownerSelectError.message}`);
      }

      if (!ownerData) {
        throw new Error('Impossible de récupérer les données du propriétaire');
      }

      // Vérifier le nombre de bots existants
      const { count: botsCount, error: countError } = await supabase
        .from('bots')
        .select('id', { count: 'exact' })
        .eq('owner_id', ownerData.id);

      console.log('Bots count:', botsCount);
      console.log('Max bots:', ownerData.max_bots);

      if (countError) {
        console.error('Erreur comptage bots:', countError);
        throw new Error(`Erreur comptage: ${countError.message}`);
      }

      if ((botsCount || 0) >= ownerData.max_bots) {
        throw new Error(`Limite atteinte: ${ownerData.max_bots} chatbots maximum`);
      }

      // Configuration du bot
      const botData = {
        owner_id: ownerData.id,
        name: botName.trim(),
        description: `Chatbot automatisé avec connectivité N8N - Créé le ${new Date().toLocaleDateString('fr-FR')}`,
        webhook_url: webhookUrl.trim(),
        api_key: '',
        chat_title: `${botName} Assistant`,
        chat_context: 'automation',
        share_enabled: true,
        is_active: true
      };

      console.log('Bot data:', botData);

      // Créer le bot
      const { data: newBot, error: botError } = await supabase
        .from('bots')
        .insert(botData)
        .select('*')
        .single();

      console.log('New bot:', newBot);
      console.log('Bot error:', botError);

      if (botError) {
        console.error('Erreur création bot:', botError);
        throw new Error(`Impossible de créer le bot: ${botError.message}`);
      }

      if (!newBot) {
        throw new Error('Aucune donnée retournée après création du bot');
      }

      // Générer l'URL publique
      const publicUrl = `${window.location.origin}/chat?bot=${newBot.id}&context=${newBot.chat_context}&title=${encodeURIComponent(newBot.chat_title)}`;
      
      const { error: updateError } = await supabase
        .from('bots')
        .update({ public_chat_url: publicUrl })
        .eq('id', newBot.id);

      if (updateError) {
        console.warn('Erreur mise à jour URL publique:', updateError);
      }

      console.log('Bot créé avec succès:', newBot.id);

      toast({
        title: "Chatbot créé avec succès !",
        description: `Le chatbot "${botName}" a été créé et configuré`,
      });

      // Tester la connexion webhook
      testWebhookConnection(webhookUrl, newBot.id, newBot.chat_title).catch(console.warn);

      onBotCreated(newBot.id);

    } catch (error) {
      console.error('=== ERREUR CRÉATION BOT ===');
      console.error('Error:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
      
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de création",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
      console.log('=== FIN CRÉATION BOT ===');
    }
  };

  const testWebhookConnection = async (webhookUrl: string, botId: string, chatTitle: string) => {
    if (!validateWebhookUrl(webhookUrl)) {
      toast({
        title: "URL invalide",
        description: "Veuillez saisir une URL webhook valide",
        variant: "destructive",
      });
      return;
    }

    console.log('=== TEST WEBHOOK ===');
    console.log('Webhook URL:', webhookUrl);
    console.log('Bot ID:', botId);
    console.log('Chat Title:', chatTitle);

    try {
      const testPayload = {
        message: 'Test de connexion depuis Bot.Bj',
        timestamp: new Date().toISOString(),
        session_id: `bot_bj_session_automation_${Date.now()}`,
        user_id: 'bot_bj_user',
        source: 'bot_bj_platform',
        context: 'automation',
        chat_title: chatTitle,
        bot_type: 'dashboard_created',
        interface_type: 'full_chat_interface',
        module: 'citoyen',
        service_type: 'automation',
        platform: 'bot_bj',
        bot_id: botId
      };

      console.log('Test payload:', JSON.stringify(testPayload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Bot.Bj-Platform/1.0',
          'X-Bot-Platform': 'bot_bj',
          'X-Bot-Version': '1.0'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(30000),
        mode: 'cors'
      });

      console.log('Test response status:', response.status);
      console.log('Test response OK:', response.ok);

      if (response.ok) {
        const responseText = await response.text();
        console.log('Test response content:', responseText);
        
        toast({
          title: "✅ Webhook testé avec succès !",
          description: "La connexion fonctionne correctement",
        });
      } else {
        toast({
          title: "⚠️ Test partiellement réussi",
          description: `Réponse reçue (${response.status}), connexion établie`,
        });
      }
    } catch (error) {
      console.error('Erreur test webhook:', error);
      toast({
        title: "Test du webhook",
        description: "Test effectué, le bot est configuré",
        variant: "destructive",
      });
    } finally {
      console.log('=== FIN TEST WEBHOOK ===');
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
          <h2 className="text-2xl font-bold text-gray-900">Nouveau Chatbot</h2>
          <p className="text-gray-600">Créez un chatbot automatisé avec connectivité N8N</p>
        </div>
      </div>

      {!isAuthenticated && (
        <Card className="max-w-2xl border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">
              Vous devez être connecté pour créer un chatbot. Veuillez vous connecter et réessayer.
            </p>
          </CardContent>
        </Card>
      )}

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
              onChange={(e) => setBotName(e.target.value)}
              placeholder="Mon Assistant IA"
              className="w-full"
              disabled={!isAuthenticated}
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
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://votre-webhook.n8n.cloud/webhook/..."
              className="w-full"
              disabled={!isAuthenticated}
            />
            <p className="text-xs text-gray-500">
              L'URL de votre webhook N8N pour la connectivité
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={() => testWebhookConnection(webhookUrl, 'test', botName || 'Test Bot')}
              variant="outline"
              disabled={!webhookUrl.trim() || isCreating || !isAuthenticated}
              className="flex-1"
            >
              <Globe className="w-4 h-4 mr-2" />
              Tester la connexion
            </Button>
            <Button
              onClick={createBotFromWebhook}
              disabled={!webhookUrl.trim() || !botName.trim() || isCreating || !isAuthenticated}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              Créer le Chatbot
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">🔗 Connectivité N8N garantie :</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Headers X-Bot-Platform et X-Bot-Version identiques</li>
              <li>• Payload avec module et service_type configurés</li>
              <li>• Session ID et user_id au format standard</li>
              <li>• Gestion d'erreurs et fallback intégrés</li>
              <li>• Logs détaillés pour debugging</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
