
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LiveChatBot {
  id: string;
  name: string;
  description: string;
  webhook_url: string;
  chat_title: string;
  chat_context: string;
  is_active: boolean;
  public_chat_url: string;
  owner_name?: string;
}

export const useLiveChatBots = () => {
  const [bots, setBots] = useState<LiveChatBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveChatBots = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useLiveChatBots] Récupération des bots pour le chat live...');

      // Récupérer les bots configurés pour le chat live
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select(`
          id,
          name,
          description,
          webhook_url,
          chat_title,
          chat_context,
          is_active,
          public_chat_url,
          bot_owners!inner(
            user_id,
            users(full_name)
          )
        `)
        .eq('display_in_live_chat', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (botsError) {
        throw botsError;
      }

      console.log('[useLiveChatBots] Bots récupérés:', botsData?.length || 0);

      const formattedBots: LiveChatBot[] = (botsData || []).map((bot: any) => ({
        id: bot.id,
        name: bot.name,
        description: bot.description,
        webhook_url: bot.webhook_url,
        chat_title: bot.chat_title,
        chat_context: bot.chat_context,
        is_active: bot.is_active,
        public_chat_url: bot.public_chat_url,
        owner_name: bot.bot_owners?.users?.full_name || 'Propriétaire'
      }));

      setBots(formattedBots);
    } catch (err) {
      console.error('[useLiveChatBots] Erreur:', err);
      setError('Impossible de charger les bots du chat live');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveChatBots();
  }, []);

  return {
    bots,
    loading,
    error,
    refreshBots: fetchLiveChatBots
  };
};
