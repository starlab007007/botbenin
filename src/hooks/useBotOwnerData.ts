
import { useState, useEffect, useCallback } from 'react';
import { 
  BotOwnerDataManager, 
  BotOwnerHistoryMessage, 
  BotOwnerStats, 
  BotOwnerConversation, 
  OwnerGlobalStats 
} from '@/services/dashboard/BotOwnerDataManager';
import { useToast } from '@/hooks/use-toast';

interface UseBotOwnerDataProps {
  botId?: string;
  autoLoad?: boolean;
}

export const useBotOwnerData = ({ botId, autoLoad = true }: UseBotOwnerDataProps = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // État pour l'historique des messages
  const [botHistory, setBotHistory] = useState<BotOwnerHistoryMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // État pour les statistiques du bot
  const [botStats, setBotStats] = useState<BotOwnerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // État pour les conversations
  const [conversations, setConversations] = useState<BotOwnerConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  // État pour les statistiques globales
  const [globalStats, setGlobalStats] = useState<OwnerGlobalStats | null>(null);
  const [globalStatsLoading, setGlobalStatsLoading] = useState(false);

  // Fonction pour charger l'historique d'un bot
  const loadBotHistory = useCallback(async (
    targetBotId?: string, 
    sessionToken?: string, 
    limit?: number, 
    offset?: number
  ) => {
    const botIdToUse = targetBotId || botId;
    if (!botIdToUse) {
      setError('ID du bot requis');
      return [];
    }

    setHistoryLoading(true);
    setError(null);

    try {
      const history = await BotOwnerDataManager.getBotHistory(
        botIdToUse, 
        sessionToken, 
        limit, 
        offset
      );
      setBotHistory(history);
      return history;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement de l\'historique';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [botId, toast]);

  // Fonction pour charger les statistiques d'un bot
  const loadBotStats = useCallback(async (targetBotId?: string) => {
    const botIdToUse = targetBotId || botId;
    if (!botIdToUse) {
      setError('ID du bot requis');
      return null;
    }

    setStatsLoading(true);
    setError(null);

    try {
      const stats = await BotOwnerDataManager.getBotStats(botIdToUse);
      setBotStats(stats);
      return stats;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des statistiques';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setStatsLoading(false);
    }
  }, [botId, toast]);

  // Fonction pour charger les conversations
  const loadConversations = useCallback(async (
    limit?: number, 
    offset?: number, 
    targetBotId?: string
  ) => {
    setConversationsLoading(true);
    setError(null);

    try {
      const conversations = await BotOwnerDataManager.getOwnerConversations(
        limit, 
        offset, 
        targetBotId || botId
      );
      setConversations(conversations);
      return conversations;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des conversations';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      return [];
    } finally {
      setConversationsLoading(false);
    }
  }, [botId, toast]);

  // Fonction pour charger les statistiques globales
  const loadGlobalStats = useCallback(async () => {
    setGlobalStatsLoading(true);
    setError(null);

    try {
      const stats = await BotOwnerDataManager.getOwnerGlobalStats();
      setGlobalStats(stats);
      return stats;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des statistiques globales';
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setGlobalStatsLoading(false);
    }
  }, [toast]);

  // Fonction pour recharger toutes les données
  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        botId ? loadBotHistory() : Promise.resolve(),
        botId ? loadBotStats() : Promise.resolve(),
        loadConversations(),
        loadGlobalStats()
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [botId, loadBotHistory, loadBotStats, loadConversations, loadGlobalStats]);

  // Fonction pour valider la propriété d'un bot
  const validateOwnership = useCallback(async (targetBotId?: string) => {
    const botIdToUse = targetBotId || botId;
    if (!botIdToUse) return false;

    try {
      return await BotOwnerDataManager.validateBotOwnership(botIdToUse);
    } catch (err) {
      console.error('Erreur validation propriété:', err);
      return false;
    }
  }, [botId]);

  // Fonction de débogage
  const debugBotAccess = useCallback(async (targetBotId?: string) => {
    const botIdToUse = targetBotId || botId;
    if (!botIdToUse) return null;

    try {
      return await BotOwnerDataManager.debugBotAccess(botIdToUse);
    } catch (err) {
      console.error('Erreur debug:', err);
      return null;
    }
  }, [botId]);

  // Chargement automatique au montage
  useEffect(() => {
    if (autoLoad) {
      reloadAll();
    }
  }, [autoLoad, reloadAll]);

  return {
    // État
    isLoading,
    error,
    
    // Données
    botHistory,
    botStats,
    conversations,
    globalStats,
    
    // États de chargement spécifiques
    historyLoading,
    statsLoading,
    conversationsLoading,
    globalStatsLoading,
    
    // Fonctions de chargement
    loadBotHistory,
    loadBotStats,
    loadConversations,
    loadGlobalStats,
    reloadAll,
    
    // Fonctions utilitaires
    validateOwnership,
    debugBotAccess,
    
    // Fonction de nettoyage
    clearError: () => setError(null)
  };
};
