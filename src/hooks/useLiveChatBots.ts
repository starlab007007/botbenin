
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

      console.log('[useLiveChatBots] Fetching live chat bots - simplified version...');

      // Récupération SIMPLIFIÉE des bots publics sans restriction de sécurité
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
          display_in_live_chat,
          bot_owners!inner(
            user_id,
            users(full_name)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (botsError) {
        console.error('[useLiveChatBots] Database error:', botsError);
        throw new Error('Erreur lors de la récupération des bots');
      }

      console.log('[useLiveChatBots] Raw data retrieved:', botsData?.length || 0, botsData);

      // Formatage des bots avec validation très permissive
      const formattedBots: LiveChatBot[] = (botsData || []).map((botData: any) => {
        console.log('[useLiveChatBots] Processing bot:', botData.name, {
          display_in_live_chat: botData.display_in_live_chat,
          webhook_url: !!botData.webhook_url,
          is_active: botData.is_active
        });

        return {
          id: botData.id,
          name: botData.name || 'Bot Sans Nom',
          description: botData.description || 'Assistant IA intelligent disponible 24/7',
          webhook_url: botData.webhook_url || '',
          chat_title: botData.chat_title || botData.name || 'Assistant IA',
          chat_context: botData.chat_context || 'general',
          is_active: botData.is_active,
          public_chat_url: botData.public_chat_url || `https://ia.bot.bj/chat/${botData.id}`,
          owner_name: botData.bot_owners?.users?.full_name || 'Bot.Bj'
        };
      });

      console.log('[useLiveChatBots] All formatted bots (before filtering):', formattedBots.length, formattedBots);

      // Filtrer seulement les bots vraiment actifs - TRÈS PERMISSIF
      const activeBots = formattedBots.filter(bot => bot.is_active === true);
      
      console.log('[useLiveChatBots] Active bots after filtering:', activeBots.length, activeBots);

      setBots(activeBots);
      
      if (activeBots.length === 0) {
        console.warn('[useLiveChatBots] No active bots found for live chat');
        setError('Aucun bot actif trouvé. Vérifiez que des bots sont configurés comme actifs.');
      }

    } catch (err: any) {
      console.error('[useLiveChatBots] Fetch error:', err);
      setError('Impossible de charger les bots: ' + err.message);
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = () => {
    console.log('[useLiveChatBots] Manual refresh requested...');
    fetchLiveChatBots();
  };

  useEffect(() => {
    fetchLiveChatBots();
  }, []);

  return {
    bots,
    loading,
    error,
    refreshBots
  };
};
