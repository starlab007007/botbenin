
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

      console.log('[useLiveChatBots] Fetching secure live chat bots...');

      // Limitation du taux de requêtes
      if (!SecurityManager.checkRateLimit('fetch_live_bots', {
        windowMs: 60000, // 1 minute
        maxRequests: 30
      })) {
        setError('Trop de requêtes, veuillez patienter');
        return;
      }

      // Récupération sécurisée des bots
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
        await SecurityManager.auditSuspiciousActivity({
          action: 'live_bots_fetch_error',
          additionalData: { error: botsError.message }
        });
        throw new Error('Erreur lors de la récupération des bots');
      }

      console.log('[useLiveChatBots] Raw data retrieved:', botsData?.length || 0);

      // Validation et filtrage sécurisé des bots
      const validBots = (botsData || []).filter(botData => {
        // Validation de l'ID du bot
        const idValidation = SecurityManager.validateAndSanitizeInput(botData.id, 'uuid');
        if (!idValidation.isValid) {
          console.warn(`[useLiveChatBots] Bot with invalid ID ignored:`, botData.id);
          return false;
        }

        // Validation du webhook
        const hasValidWebhook = botData.webhook_url && 
          SecurityManager.validateWebhookUrl(botData.webhook_url);
        
        if (!hasValidWebhook) {
          console.warn(`[useLiveChatBots] Bot ${botData.name} ignored: invalid webhook`);
          return false;
        }

        // Validation des autres champs
        const nameValidation = SecurityManager.validateAndSanitizeInput(botData.name, 'string');
        if (!nameValidation.isValid) {
          console.warn(`[useLiveChatBots] Bot with invalid name ignored`);
          return false;
        }

        return botData.display_in_live_chat === true && botData.is_active === true;
      });

      // Formatage sécurisé des données
      const formattedBots: LiveChatBot[] = validBots.map((botData: any) => {
        const nameValidation = SecurityManager.validateAndSanitizeInput(botData.name, 'string');
        const descValidation = SecurityManager.validateAndSanitizeInput(
          botData.description || 'Assistant IA intelligent', 
          'string'
        );
        const titleValidation = SecurityManager.validateAndSanitizeInput(
          botData.chat_title || botData.name, 
          'string'
        );

        return {
          id: botData.id,
          name: nameValidation.sanitized || 'Bot',
          description: descValidation.sanitized || 'Assistant IA intelligent',
          webhook_url: botData.webhook_url, // Déjà validé
          chat_title: titleValidation.sanitized || nameValidation.sanitized || 'Bot',
          chat_context: botData.chat_context || 'assistance',
          is_active: botData.is_active,
          public_chat_url: botData.public_chat_url,
          owner_name: botData.bot_owners?.users?.full_name || 'Propriétaire'
        };
      });

      console.log('[useLiveChatBots] Valid formatted bots:', formattedBots.length);

      setBots(formattedBots);
      
      if (formattedBots.length === 0) {
        console.warn('[useLiveChatBots] No valid bots found for live chat');
        setError('Aucun chatbot sécurisé disponible pour le chat en direct');
      }

      // Audit de sécurité pour le succès
      await SecurityManager.auditSuspiciousActivity({
        action: 'live_bots_fetched_successfully',
        additionalData: { count: formattedBots.length }
      });

    } catch (err: any) {
      console.error('[useLiveChatBots] Secure fetch error:', err);
      
      await SecurityManager.auditSuspiciousActivity({
        action: 'live_bots_fetch_failed',
        additionalData: { error: err.message }
      });

      setError('Impossible de charger les bots sécurisés');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = () => {
    console.log('[useLiveChatBots] Secure refresh requested...');
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
