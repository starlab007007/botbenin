
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
  display_in_live_chat?: boolean;
}

export const useLiveChatBots = () => {
  const [bots, setBots] = useState<LiveChatBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveChatBots = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[useLiveChatBots] === RÉCUPÉRATION BOTS PUBLICS POUR TOUS LES UTILISATEURS ===');
      console.log('[useLiveChatBots] Aucune authentification requise - accès public total');

      // Requête pour TOUS les bots publics - sans authentification requise
      const { data: publicBots, error: publicBotsError } = await supabase
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
          share_enabled,
          created_at
        `)
        .eq('is_active', true)
        .eq('share_enabled', true)
        .order('created_at', { ascending: false });

      console.log('[useLiveChatBots] Résultat requête Supabase:', {
        success: !publicBotsError,
        botsCount: publicBots?.length || 0,
        error: publicBotsError
      });

      if (publicBotsError) {
        console.error('[useLiveChatBots] Erreur Supabase:', publicBotsError);
        throw publicBotsError;
      }

      // Tous les bots actifs et partagés sont considérés comme publics
      const formattedBots: LiveChatBot[] = (publicBots || []).map((bot: any) => {
        console.log('[useLiveChatBots] Formatage bot public:', {
          id: bot.id,
          name: bot.name,
          isActive: bot.is_active,
          shareEnabled: bot.share_enabled,
          displayInLiveChat: bot.display_in_live_chat
        });
        
        return {
          id: bot.id,
          name: bot.name || 'Bot Sans Nom',
          description: bot.description || 'Assistant IA intelligent disponible 24/7 pour vous aider avec vos questions',
          webhook_url: bot.webhook_url || '',
          chat_title: bot.chat_title || bot.name || 'Assistant IA',
          chat_context: bot.chat_context || 'general',
          is_active: true,
          public_chat_url: bot.public_chat_url || `https://bot.bj/chat/${bot.id}`,
          owner_name: 'Bot.Bj Team',
          display_in_live_chat: bot.display_in_live_chat !== false // Par défaut true
        };
      });

      console.log('[useLiveChatBots] === RÉSULTAT FINAL ===');
      console.log('[useLiveChatBots] Bots publics trouvés:', formattedBots.length);
      console.log('[useLiveChatBots] Détails des bots:', formattedBots.map(b => ({
        id: b.id,
        name: b.name,
        hasWebhook: !!b.webhook_url,
        context: b.chat_context,
        displayInLiveChat: b.display_in_live_chat
      })));

      setBots(formattedBots);
      
      if (formattedBots.length === 0) {
        console.warn('[useLiveChatBots] AUCUN BOT PUBLIC TROUVÉ !');
        setError('Aucun assistant IA public n\'est actuellement disponible.');
      } else {
        console.log('[useLiveChatBots] SUCCESS: Bots publics chargés pour tous les utilisateurs !');
      }

    } catch (err: any) {
      console.error('[useLiveChatBots] === ERREUR CRITIQUE ===');
      console.error('[useLiveChatBots] Type:', err?.constructor?.name);
      console.error('[useLiveChatBots] Message:', err?.message);
      console.error('[useLiveChatBots] Stack:', err?.stack);
      
      setError('Impossible de charger les assistants IA publics. Veuillez réessayer.');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = () => {
    console.log('[useLiveChatBots] === ACTUALISATION MANUELLE ===');
    fetchLiveChatBots();
  };

  useEffect(() => {
    console.log('[useLiveChatBots] === INITIALISATION HOOK ===');
    fetchLiveChatBots();
  }, []);

  return {
    bots,
    loading,
    error,
    refreshBots
  };
};
