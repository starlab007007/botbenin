
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChatInterface } from '@/components/ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestBot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  api_key: string;
  chat_title: string;
  chat_context: string;
  is_active: boolean;
  owner_id: string;
}

export const BotTestPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const botId = searchParams.get('bot');
  const [bot, setBot] = useState<TestBot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (botId) {
      fetchBot();
    } else {
      setError('ID de bot manquant');
      setIsLoading(false);
    }
  }, [botId]);

  const fetchBot = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Vous devez être connecté pour tester ce bot');
        return;
      }

      // Récupérer le bot_owner de l'utilisateur
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        setError('Profil de propriétaire de bot introuvable');
        return;
      }

      const { data: botData, error } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .eq('owner_id', ownerData.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Ce bot n\'existe pas ou ne vous appartient pas.');
        } else {
          throw error;
        }
        return;
      }

      if (!botData.is_active) {
        setError('Ce bot est actuellement désactivé.');
        return;
      }

      setBot(botData);
      
    } catch (error) {
      console.error('Erreur lors du chargement du bot:', error);
      setError('Impossible de charger ce bot. Veuillez réessayer plus tard.');
      toast({
        title: "Erreur",
        description: "Impossible de charger le bot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToManagement = () => {
    navigate('/bots');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du bot...</p>
        </div>
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Bot non disponible
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'Ce bot n\'est pas accessible.'}
          </p>
          <Button onClick={handleBackToManagement} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à la gestion
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-2 text-center text-sm">
        Mode Test - {bot.name}
        <Button
          onClick={handleBackToManagement}
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
          onBackToLanding={handleBackToManagement}
          webhookUrl={bot.webhook_url}
          chatTitle={bot.chat_title}
          chatContext={bot.chat_context}
        />
      </div>
    </div>
  );
};
