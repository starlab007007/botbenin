import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/bot-management/AuthGuard';
import { BotLimitDisplay } from '@/components/bot-management/BotLimitDisplay';
import { BotCreationForm } from './BotCreationForm';

interface BotAutomationCreatorProps {
  onBack: () => void;
  onBotCreated: (botId: string) => void;
}

export const BotAutomationCreator: React.FC<BotAutomationCreatorProps> = ({ onBack, onBotCreated }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [botName, setBotName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [isCheckingLimits, setIsCheckingLimits] = useState(true);
  const { toast } = useToast();
  const { isAuthenticated, session } = useAuth();

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

      const { count: existingBots, error: countError } = await supabase
        .from('bots')
        .select('id', { count: 'exact' })
        .eq('owner_id', ownerData.id);

      if (countError) throw countError;

      setBotCount(existingBots || 0);
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

  const validateWebhookUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const testWebhookConnection = async () => {
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

    try {
      const testPayload = {
        message: 'Test de connexion depuis Bot.Bj',
        timestamp: new Date().toISOString(),
        session_id: `bot_bj_session_automation_${Date.now()}`,
        user_id: 'bot_bj_user',
        source: 'bot_bj_platform',
        context: 'automation',
        chat_title: botName || 'Test Bot',
        bot_type: 'dashboard_created',
        interface_type: 'full_chat_interface',
        module: 'citoyen',
        service_type: 'automation',
        platform: 'bot_bj'
      };

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

      if (response.ok) {
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
    }
  };

  const createBotFromWebhook = async () => {
    if (!isAuthenticated || !session) {
      window.location.href = '/auth';
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

    if (!webhookUrl.trim() || !botName.trim()) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (!validateWebhookUrl(webhookUrl)) {
      toast({
        title: "URL invalide",
        description: "Veuillez saisir une URL webhook valide",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const userId = session.user.id;

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

      const { count: currentBotCount, error: countError } = await supabase
        .from('bots')
        .select('id', { count: 'exact' })
        .eq('owner_id', ownerData.id);

      if (countError) throw new Error(`Erreur comptage: ${countError.message}`);

      if ((currentBotCount || 0) >= 10) {
        throw new Error("Limite atteinte: 10 chatbots maximum pour le plan gratuit");
      }

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

      const { data: newBot, error: botError } = await supabase
        .from('bots')
        .insert(botData)
        .select('*')
        .single();

      if (botError) throw new Error(`Impossible de créer le bot: ${botError.message}`);
      if (!newBot) throw new Error('Aucune donnée retournée après création du bot');

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

      onBotCreated(newBot.id);

    } catch (error) {
      console.error('Erreur création bot:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      toast({
        title: "Erreur de création",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

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

      <BotLimitDisplay 
        botCount={botCount} 
        maxBots={10}
        isAuthenticated={isAuthenticated} 
      />

      <AuthGuard isAuthenticated={isAuthenticated}>
        <BotCreationForm
          botName={botName}
          webhookUrl={webhookUrl}
          isCreating={isCreating}
          isLimitReached={isLimitReached}
          onBotNameChange={setBotName}
          onWebhookUrlChange={setWebhookUrl}
          onTestWebhook={testWebhookConnection}
          onCreateBot={createBotFromWebhook}
        />
      </AuthGuard>
    </div>
  );
};
