
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

      console.log('[useLiveChatBots] === DIAGNOSTIC COMPLET DES BOTS PUBLICS ===');

      // ÉTAPE 1: Récupérer TOUS les bots d'abord pour diagnostic
      const { data: allBots, error: allBotsError } = await supabase
        .from('bots')
        .select('*');

      console.log('[useLiveChatBots] TOUS LES BOTS dans la DB:', allBots?.length || 0);
      console.log('[useLiveChatBots] Détails complets:', allBots);

      if (allBotsError) {
        console.error('[useLiveChatBots] Erreur lors de la récupération de tous les bots:', allBotsError);
      }

      // ÉTAPE 2: Récupérer les bots actifs seulement
      const { data: activeBots, error: activeBotsError } = await supabase
        .from('bots')
        .select('*')
        .eq('is_active', true);

      console.log('[useLiveChatBots] BOTS ACTIFS:', activeBots?.length || 0);
      console.log('[useLiveChatBots] Bots actifs détails:', activeBots);

      if (activeBotsError) {
        console.error('[useLiveChatBots] Erreur bots actifs:', activeBotsError);
      }

      // ÉTAPE 3: Récupérer les bots avec display_in_live_chat = true
      const { data: liveChatBots, error: liveChatError } = await supabase
        .from('bots')
        .select('*')
        .eq('display_in_live_chat', true);

      console.log('[useLiveChatBots] BOTS AVEC display_in_live_chat=true:', liveChatBots?.length || 0);
      console.log('[useLiveChatBots] Bots live chat détails:', liveChatBots);

      if (liveChatError) {
        console.error('[useLiveChatBots] Erreur bots live chat:', liveChatError);
      }

      // ÉTAPE 4: Essayer la requête complète avec jointure simple
      const { data: botsWithOwners, error: joinError } = await supabase
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
        .order('created_at', { ascending: false });

      console.log('[useLiveChatBots] BOTS AVEC REQUÊTE SIMPLE:', botsWithOwners?.length || 0);
      console.log('[useLiveChatBots] Détails bots simples:', botsWithOwners);

      if (joinError) {
        console.error('[useLiveChatBots] Erreur requête simple:', joinError);
        throw joinError;
      }

      // ÉTAPE 5: Formatage très permissif des bots pour affichage
      const formattedBots: LiveChatBot[] = (botsWithOwners || []).map((bot: any) => {
        console.log('[useLiveChatBots] Formatage du bot:', bot.name, 'ID:', bot.id);
        
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

      console.log('[useLiveChatBots] === RÉSULTAT FINAL ===');
      console.log('[useLiveChatBots] Nombre de bots formatés:', formattedBots.length);
      console.log('[useLiveChatBots] Bots formatés:', formattedBots.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description.substring(0, 50) + '...',
        hasWebhook: !!b.webhook_url,
        context: b.chat_context
      })));

      setBots(formattedBots);
      
      if (formattedBots.length === 0) {
        console.warn('[useLiveChatBots] ATTENTION: Aucun bot trouvé !');
        setError('Aucun assistant IA n\'est actuellement disponible. Veuillez réessayer dans quelques instants.');
      } else {
        console.log('[useLiveChatBots] SUCCESS: Bots chargés avec succès !');
      }

    } catch (err: any) {
      console.error('[useLiveChatBots] === ERREUR FATALE ===');
      console.error('[useLiveChatBots] Type d\'erreur:', err?.constructor?.name);
      console.error('[useLiveChatBots] Message:', err?.message);
      console.error('[useLiveChatBots] Erreur complète:', err);
      
      setError('Impossible de charger les assistants IA. Problème de connexion à la base de données.');
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshBots = () => {
    console.log('[useLiveChatBots] === ACTUALISATION MANUELLE DEMANDÉE ===');
    fetchLiveChatBots();
  };

  useEffect(() => {
    console.log('[useLiveChatBots] === INITIALISATION DU HOOK ===');
    fetchLiveChatBots();
  }, []);

  return {
    bots,
    loading,
    error,
    refreshBots
  };
};
