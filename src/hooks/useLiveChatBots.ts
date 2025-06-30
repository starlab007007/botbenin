
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

      console.log('[useLiveChatBots] Récupération des bots publics...');

      // Récupération SIMPLE et PERMISSIVE de tous les bots actifs
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
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (botsError) {
        console.error('[useLiveChatBots] Erreur base de données:', botsError);
        throw new Error('Erreur lors de la récupération des bots');
      }

      console.log('[useLiveChatBots] Données récupérées:', botsData?.length || 0, 'bots');

      // Formatage des bots - TRÈS PERMISSIF pour assurer l'affichage
      const formattedBots: LiveChatBot[] = (botsData || []).map((botData: any) => {
        console.log('[useLiveChatBots] Formatage du bot:', botData.name);

        return {
          id: botData.id,
          name: botData.name || 'Bot Sans Nom',
          description: botData.description || 'Assistant IA intelligent disponible 24/7 pour vous aider',
          webhook_url: botData.webhook_url || '',
          chat_title: botData.chat_title || botData.name || 'Assistant IA',
          chat_context: botData.chat_context || 'general',
          is_active: true, // Force à true pour l'affichage
          public_chat_url: botData.public_chat_url || `https://ia.bot.bj/chat/${botData.id}`,
          owner_name: botData.bot_owners?.users?.full_name || 'Bot.Bj Team'
        };
      });

      console.log('[useLiveChatBots] Bots formatés pour affichage:', formattedBots.length);
      console.log('[useLiveChatBots] Détails des bots:', formattedBots.map(b => ({ 
        name: b.name, 
        id: b.id, 
        hasWebhook: !!b.webhook_url,
        context: b.chat_context 
      })));

      setBots(formattedBots);
      
      if (formattedBots.length === 0) {
        console.warn('[useLiveChatBots] Aucun bot trouvé - vérification requise');
        setError('Aucun bot public n\'est actuellement disponible. Les propriétaires de bots peuvent activer l\'affichage public depuis leur tableau de bord.');
      }

    } catch (err: any) {
      console.error('[useLiveChatBots] Erreur fatale:', err);
      setError('Impossible de charger les assistants IA. Veuillez réessayer dans quelques instants.');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = () => {
    console.log('[useLiveChatBots] Actualisation manuelle demandée...');
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
