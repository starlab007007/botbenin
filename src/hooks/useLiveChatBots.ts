
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

      const formattedBots: LiveChatBot[] = (botsData || []).map((botData: any) => ({
        id: botData.id,
        name: botData.name,
        description: botData.description,
        webhook_url: botData.webhook_url,
        chat_title: botData.chat_title,
        chat_context: botData.chat_context,
        is_active: botData.is_active,
        public_chat_url: botData.public_chat_url,
        owner_name: botData.bot_owners?.users?.full_name || 'Propriétaire'
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
