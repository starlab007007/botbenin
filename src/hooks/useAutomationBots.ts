import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AutomationBot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  chat_title: string;
  is_active: boolean;
  public_chat_url: string;
  created_at: string;
}

export interface AutomationBotOption {
  id: string;
  name: string;
  description: string;
  chat_title: string;
  public_chat_url: string;
  isActive: boolean;
}

export const useAutomationBots = () => {
  const [bots, setBots] = useState<AutomationBot[]>([]);
  const [botOptions, setBotOptions] = useState<AutomationBotOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const fetchAutomationBots = async () => {
    if (!session?.user?.id) {
      setBots([]);
      setBotOptions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Récupérer le bot owner
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!ownerData) {
        setBots([]);
        setBotOptions([]);
        return;
      }

      // Récupérer les bots automatisés actifs
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select('*')
        .eq('owner_id', ownerData.id)
        .eq('chat_context', 'automation')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (botsError) throw botsError;

      const automationBots = botsData || [];
      setBots(automationBots);

      // Transformer en options pour les sélecteurs
      const options: AutomationBotOption[] = automationBots.map(bot => ({
        id: bot.id,
        name: bot.name,
        description: bot.description,
        chat_title: bot.chat_title,
        public_chat_url: bot.public_chat_url,
        isActive: bot.is_active
      }));

      setBotOptions(options);

    } catch (err: any) {
      console.error('Erreur récupération bots automatisés:', err);
      setError(err.message);
      setBots([]);
      setBotOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomationBots();
  }, [session?.user?.id]);

  const refreshBots = () => {
    fetchAutomationBots();
  };

  return {
    bots,
    botOptions,
    loading,
    error,
    refreshBots
  };
};