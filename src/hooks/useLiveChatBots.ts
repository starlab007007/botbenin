
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SecurityManager } from '@/services/security/SecurityManager';

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

      console.log('[useLiveChatBots] Fetching live chat bots...');

      // Limitation du taux de requêtes
      if (!SecurityManager.checkRateLimit('fetch_live_bots', {
        windowMs: 60000, // 1 minute
        maxRequests: 30
      })) {
        setError('Trop de requêtes, veuillez patienter');
        return;
      }

      // Récupération des bots publics
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
        console.error('[useLiveChatBots] Database error:', botsError);
        throw new Error('Erreur lors de la récupération des bots');
      }

      console.log('[useLiveChatBots] Raw data retrieved:', botsData?.length || 0, botsData);

      // Formatage des bots avec validation moins stricte
      const formattedBots: LiveChatBot[] = (botsData || []).map((botData: any) => {
        // Pour le live chat, on est plus permissif avec les webhooks
        const hasWebhook = botData.webhook_url && botData.webhook_url.trim() !== '';
        
        if (!hasWebhook) {
          console.warn(`[useLiveChatBots] Bot ${botData.name} has no webhook, but will be displayed`);
        }

        return {
          id: botData.id,
          name: botData.name || 'Bot',
          description: botData.description || 'Assistant IA intelligent',
          webhook_url: botData.webhook_url || '',
          chat_title: botData.chat_title || botData.name || 'Bot',
          chat_context: botData.chat_context || 'assistance',
          is_active: botData.is_active,
          public_chat_url: botData.public_chat_url,
          owner_name: botData.bot_owners?.users?.full_name || 'Propriétaire'
        };
      });

      console.log('[useLiveChatBots] Formatted bots:', formattedBots.length, formattedBots);

      setBots(formattedBots);
      
      if (formattedBots.length === 0) {
        console.warn('[useLiveChatBots] No bots found for live chat');
        setError('Aucun chatbot disponible pour le chat en direct');
      }

      // Audit de sécurité pour le succès
      await SecurityManager.auditSuspiciousActivity({
        action: 'live_bots_fetched_successfully',
        additionalData: { count: formattedBots.length }
      });

    } catch (err: any) {
      console.error('[useLiveChatBots] Fetch error:', err);
      
      await SecurityManager.auditSuspiciousActivity({
        action: 'live_bots_fetch_failed',
        additionalData: { error: err.message }
      });

      setError('Impossible de charger les bots');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = () => {
    console.log('[useLiveChatBots] Refresh requested...');
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
