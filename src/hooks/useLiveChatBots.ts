
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

      console.log('[useLiveChatBots] === RÉCUPÉRATION DES BOTS PUBLICS POUR TOUS LES UTILISATEURS ===');

      // Récupérer TOUS les bots publics sans authentification requise
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
          created_at
        `)
        .eq('is_active', true)
        .eq('display_in_live_chat', true)
        .order('created_at', { ascending: false });

      console.log('[useLiveChatBots] BOTS PUBLICS TROUVÉS:', publicBots?.length || 0);
      console.log('[useLiveChatBots] Détails des bots publics:', publicBots);

      if (publicBotsError) {
        console.error('[useLiveChatBots] Erreur lors de la récupération des bots publics:', publicBotsError);
        throw publicBotsError;
      }

      // Formatage des bots pour affichage public
      const formattedBots: LiveChatBot[] = (publicBots || []).map((bot: any) => {
        console.log('[useLiveChatBots] Formatage du bot public:', bot.name, 'ID:', bot.id);
        
        return {
          id: bot.id,
          name: bot.name || 'Bot Sans Nom',
          description: bot.description || 'Assistant IA intelligent disponible 24/7 pour vous aider avec vos questions',
          webhook_url: bot.webhook_url || '',
          chat_title: bot.chat_title || bot.name || 'Assistant IA',
          chat_context: bot.chat_context || 'general',
          is_active: true,
          public_chat_url: bot.public_chat_url || `https://ia.bot.bj/chat/${bot.id}`,
          owner_name: 'Bot.Bj Team'
        };
      });

      console.log('[useLiveChatBots] === RÉSULTAT FINAL POUR ACCÈS PUBLIC ===');
      console.log('[useLiveChatBots] Nombre de bots publics formatés:', formattedBots.length);
      console.log('[useLiveChatBots] Bots publics formatés:', formattedBots.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description.substring(0, 50) + '...',
        hasWebhook: !!b.webhook_url,
        context: b.chat_context
      })));

      setBots(formattedBots);
      
      if (formattedBots.length === 0) {
        console.warn('[useLiveChatBots] ATTENTION: Aucun bot public trouvé !');
        setError('Aucun assistant IA public n\'est actuellement disponible. Veuillez réessayer dans quelques instants.');
      } else {
        console.log('[useLiveChatBots] SUCCESS: Bots publics chargés avec succès pour tous les utilisateurs !');
      }

    } catch (err: any) {
      console.error('[useLiveChatBots] === ERREUR LORS DU CHARGEMENT DES BOTS PUBLICS ===');
      console.error('[useLiveChatBots] Type d\'erreur:', err?.constructor?.name);
      console.error('[useLiveChatBots] Message:', err?.message);
      console.error('[useLiveChatBots] Erreur complète:', err);
      
      setError('Impossible de charger les assistants IA publics. Problème de connexion à la base de données.');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = () => {
    console.log('[useLiveChatBots] === ACTUALISATION MANUELLE DES BOTS PUBLICS ===');
    fetchLiveChatBots();
  };

  useEffect(() => {
    console.log('[useLiveChatBots] === INITIALISATION DU HOOK POUR BOTS PUBLICS ===');
    fetchLiveChatBots();
  }, []);

  return {
    bots,
    loading,
    error,
    refreshBots
  };
};
