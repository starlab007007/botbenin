
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

      // Récupérer tous les bots configurés pour le chat live avec les informations du propriétaire
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
        .eq('display_in_live_chat', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (botsError) {
        throw botsError;
      }

      console.log('[useLiveChatBots] Données brutes récupérées:', botsData?.length || 0);

      // Filtrer et formater les bots valides
      const validBots = (botsData || []).filter(botData => {
        const hasValidWebhook = botData.webhook_url && botData.webhook_url.trim() !== '';
        const isConfiguredForLiveChat = botData.display_in_live_chat === true;
        const isActive = botData.is_active === true;
        
        if (!hasValidWebhook) {
          console.warn(`[useLiveChatBots] Bot ${botData.name} ignoré : pas de webhook URL`);
        }
        if (!isConfiguredForLiveChat) {
          console.warn(`[useLiveChatBots] Bot ${botData.name} ignoré : pas configuré pour live chat`);
        }
        if (!isActive) {
          console.warn(`[useLiveChatBots] Bot ${botData.name} ignoré : inactif`);
        }
        
        return hasValidWebhook && isConfiguredForLiveChat && isActive;
      });

      const formattedBots: LiveChatBot[] = validBots.map((botData: any) => ({
        id: botData.id,
        name: botData.name,
        description: botData.description || 'Assistant IA intelligent',
        webhook_url: botData.webhook_url,
        chat_title: botData.chat_title || botData.name,
        chat_context: botData.chat_context || 'assistance',
        is_active: botData.is_active,
        public_chat_url: botData.public_chat_url,
        owner_name: botData.bot_owners?.users?.full_name || 'Propriétaire'
      }));

      console.log('[useLiveChatBots] Bots valides formatés:', formattedBots.length);
      console.log('[useLiveChatBots] Liste des bots:', formattedBots.map(b => ({ 
        name: b.name, 
        id: b.id, 
        hasWebhook: !!b.webhook_url,
        owner: b.owner_name 
      })));

      setBots(formattedBots);
      
      if (formattedBots.length === 0) {
        console.warn('[useLiveChatBots] Aucun bot valide trouvé pour le chat live');
        setError('Aucun chatbot configuré pour le chat en direct');
      }

    } catch (err) {
      console.error('[useLiveChatBots] Erreur:', err);
      setError('Impossible de charger les bots du chat live');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour actualiser la liste des bots
  const refreshBots = () => {
    console.log('[useLiveChatBots] Actualisation des bots...');
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
