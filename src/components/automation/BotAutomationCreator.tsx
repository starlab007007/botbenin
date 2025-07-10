import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SystemRepairService } from '@/services/systemRepairService';
import { Bot, Workflow, ArrowLeft, Globe, MessageSquare, Lock, AlertCircle, Wrench, RefreshCw } from 'lucide-react';

interface BotAutomationCreatorProps {
  onBack: () => void;
  onBotCreated: (botId: string) => void;
}

export const BotAutomationCreator: React.FC<BotAutomationCreatorProps> = ({ onBack, onBotCreated }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [botName, setBotName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [maxBots, setMaxBots] = useState(10);
  const [isCheckingLimits, setIsCheckingLimits] = useState(true);
  const [creationAttempts, setCreationAttempts] = useState(0);
  const { toast } = useToast();
  const { user, isAuthenticated, session } = useAuth();

  useEffect(() => {
    if (isAuthenticated && session) {
      checkBotLimits();
    } else {
      setIsCheckingLimits(false);
    }
  }, [isAuthenticated, session]);

  const checkBotLimits = async () => {
    try {
      setIsCheckingLimits(true);
      const userId = session?.user?.id;
      if (!userId) return;

      // Tentative de réparation préventive si nécessaire
      if (creationAttempts >= 1) {
        await SystemRepairService.repairUserSystem(userId);
      }

      // Récupérer ou créer le bot_owner
      let { data: ownerData, error: ownerSelectError } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', userId)
        .maybeSingle();

      if (!ownerData) {
        const { data: newOwner, error: ownerCreateError } = await supabase
          .from('bot_owners')
          .insert({ 
            user_id: userId,
            subscription_plan: 'free',
            max_bots: 10
          })
          .select('id, max_bots')
          .single();

        if (ownerCreateError) throw ownerCreateError;
        ownerData = newOwner;
      }

      if (!ownerData) throw new Error('Impossible de récupérer les données du propriétaire');

      // Compter les bots existants
      const { count: existingBots, error: countError } = await supabase
        .from('bots')
        .select('id', { count: 'exact' })
        .eq('owner_id', ownerData.id);

      if (countError) throw countError;

      setBotCount(existingBots || 0);
      setMaxBots(10);
    } catch (error) {
      console.error('Erreur lors de la vérification des limites:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier vos limites de création de bots",
        variant: "destructive",
      });
    } finally {
      setIsCheckingLimits(false);
    }
  };

  const handleAutoRepair = async () => {
    setIsRepairing(true);
    try {
      const success = await SystemRepairService.performCompleteRepair();
      if (success) {
        setCreationAttempts(0);
        await checkBotLimits(); // Re-vérifier les limites après réparation
      }
    } catch (error) {
      console.error('Erreur lors de la réparation automatique:', error);
    } finally {
      setIsRepairing(false);
    }
  };

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
    if (!isAuthenticated || !session) {
      toast({
        title: "Authentification requise",
        description: "Vous devez être connecté pour créer un chatbot",
        variant: "destructive",
      });
      return;
    }

    if (botCount >= 10) {
      toast({
        title: "Limite atteinte",
        description: "Vous avez atteint la limite de 10 chatbots pour votre plan gratuit",
        variant: "destructive",
      });
      return;
    }

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

    setIsCreating(true);
    setCreationAttempts(prev => prev + 1);

    try {
      const userId = session.user.id;

      // Réparation automatique si c'est la 2ème tentative ou plus
      if (creationAttempts >= 1) {
        console.log('[BotCreator] Tentative de réparation automatique...');
        await SystemRepairService.repairUserSystem(userId);
      }

      // Récupérer le bot_owner
      let { data: ownerData, error: ownerSelectError } = await supabase
        .from('bot_owners')
        .select('id, max_bots')
        .eq('user_id', userId)
        .maybeSingle();

      if (!ownerData) {
        const { data: newOwner, error: ownerCreateError } = await supabase
          .from('bot_owners')
          .insert({ 
            user_id: userId,
            subscription_plan: 'free',
            max_bots: 10
          })
          .select('id, max_bots')
          .single();

        if (ownerCreateError) throw new Error(`Impossible de créer le propriétaire: ${ownerCreateError.message}`);
        ownerData = newOwner;
      }

      if (!ownerData) throw new Error('Impossible de récupérer les données du propriétaire');

      // Vérifier à nouveau les limites avant création
      const { count: currentBotCount, error: countError } = await supabase
        .from('bots')
        .select('id', { count: 'exact' })
        .eq('owner_id', ownerData.id);

      if (countError) throw new Error(`Erreur comptage: ${countError.message}`);

      if ((currentBotCount || 0) >= 10) {
        throw new Error("Limite atteinte: 10 chatbots maximum pour le plan gratuit");
      }

      // Configuration du bot
      const botData = {
        owner_id: ownerData.id,
        name: botName.trim(),
        description: `Chatbot automatisé avec connectivité N8N personnalisée - Créé le ${new Date().toLocaleDateString('fr-FR')}`,
        webhook_url: webhookUrl.trim(),
        api_key: '',
        chat_title: `${botName} Assistant`,
        chat_context: 'automation',
        share_enabled: true,
        is_active: true
      };

      // Créer le bot
      const { data: newBot, error: botError } = await supabase
        .from('bots')
        .insert(botData)
        .select('*')
        .single();

      if (botError) throw new Error(`Impossible de créer le bot: ${botError.message}`);
      if (!newBot) throw new Error('Aucune donnée retournée après création du bot');

      // Générer l'URL publique
      const publicUrl = `${window.location.origin}/chat?bot=${newBot.id}&context=${newBot.chat_context}&title=${encodeURIComponent(newBot.chat_title)}`;
      
      const { error: updateError } = await supabase
        .from('bots')
        .update({ public_chat_url: publicUrl })
        .eq('id', newBot.id);

      if (updateError) {
        console.warn('Erreur mise à jour URL publique:', updateError);
      }

      toast({
        title: "Chatbot créé avec succès !",
        description: `Le chatbot "${botName}" a été créé avec votre webhook personnalisé`,
      });

      // Tester la connexion webhook
      testWebhookConnection(webhookUrl, newBot.id, newBot.chat_title).catch(console.warn);

      // Réinitialiser le compteur de tentatives après succès
      setCreationAttempts(0);
      onBotCreated(newBot.id);

    } catch (error) {
      console.error('Erreur création bot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de création",
        description: errorMessage,
        variant: "destructive",
      });

      // Proposer la réparation automatique après 2 tentatives échouées
      if (creationAttempts >= 2) {
        setTimeout(() => {
          toast({
            title: "Réparation automatique disponible",
            description: "Cliquez sur le bouton 'Réparation Auto' pour corriger les problèmes système",
          });
        }, 2000);
      }
    } finally {
      setIsCreating(false);
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
          description: "La connexion avec votre webhook personnalisé fonctionne correctement",
        });
      } else {
        toast({
          title: "⚠️ Test partiellement réussi",
          description: `Réponse reçue (${response.status}), connexion établie avec votre webhook`,
        });
      }
    } catch (error) {
      console.error('Erreur test webhook:', error);
      toast({
        title: "Test du webhook",
        description: "Test effectué, le bot est configuré avec votre webhook",
        variant: "destructive",
      });
    } finally {
      console.log('=== FIN TEST WEBHOOK ===');
    }
  };

  // Si l'utilisateur n'est pas authentifié
  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nouveau Chatbot</h2>
            <p className="text-gray-600">Créez un chatbot automatisé avec votre webhook N8N personnalisé</p>
          </div>
        </div>

        <Card className="max-w-2xl border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-amber-800">
              <Lock className="w-5 h-5" />
              <span>Authentification requise</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">
                  Vous devez être connecté pour créer un chatbot
                </p>
                <p className="text-amber-700 text-sm mt-1">
                  Connectez-vous pour accéder à votre tableau de bord et créer jusqu'à 10 chatbots gratuitement.
                </p>
              </div>
            </div>
            <div className="pt-4">
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Se connecter / S'inscrire
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si on est en train de vérifier les limites
  if (isCheckingLimits) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nouveau Chatbot</h2>
            <p className="text-gray-600">Vérification de vos limites...</p>
          </div>
        </div>

        <Card className="max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Vérification de vos limites de création...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLimitReached = botCount >= 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nouveau Chatbot</h2>
          <p className="text-gray-600">Créez un chatbot automatisé avec votre webhook N8N personnalisé</p>
        </div>
      </div>

      {/* Affichage des limites */}
      <Card className="max-w-2xl border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-800 font-medium">
                Plan Gratuit - Utilisation des bots
              </p>
              <p className="text-blue-700 text-sm">
                {botCount} / 10 chatbots créés
              </p>
              {creationAttempts > 0 && (
                <p className="text-blue-600 text-xs mt-1">
                  {creationAttempts} tentative(s) de création
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="w-16 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${Math.min((botCount / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bouton de réparation automatique */}
      {creationAttempts >= 1 && (
        <Card className="max-w-2xl border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-yellow-800">Problème de création détecté</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Utilisez la réparation automatique pour corriger les problèmes système
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAutoRepair}
                disabled={isRepairing}
                variant="outline"
                className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
              >
                {isRepairing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2" />
                ) : (
                  <Wrench className="w-4 h-4 mr-2" />
                )}
                Réparation Auto
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message de limite atteinte */}
      {isLimitReached && (
        <Card className="max-w-2xl border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">
                  Limite de création atteinte
                </p>
                <p className="text-red-700 text-sm mt-1">
                  Vous avez atteint la limite de 10 chatbots pour votre plan gratuit. 
                  Supprimez un chatbot existant ou passez à un plan supérieur pour créer de nouveaux bots.
                </p>
              </div>
            </div>
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
              onChange={(e) => setWebhookUrl(e.target.value)}
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
              onClick={() => testWebhookConnection(webhookUrl, 'test', botName || 'Test Bot')}
              variant="outline"
              disabled={!webhookUrl.trim() || isCreating || isLimitReached}
              className="flex-1"
            >
              <Globe className="w-4 h-4 mr-2" />
              Tester la connexion
            </Button>
            <Button
              onClick={createBotFromWebhook}
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
              <li>• Réparation automatique en cas de problème</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
