
import { supabase } from '@/integrations/supabase/client';

// Types pour les nouvelles fonctionnalités
export interface BotOwnerHistoryMessage {
  message_id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  message_timestamp: string;
  user_name: string;
  user_email: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  metadata: any;
  bot_name: string;
  owner_id: string;
}

export interface BotOwnerStats {
  bot_id: string;
  bot_name: string;
  total_messages: number;
  total_users: number;
  total_sessions: number;
  messages_24h: number;
  active_users_24h: number;
  avg_messages_per_session: number;
  last_activity: string;
  creation_date: string;
  is_active: boolean;
}

export interface BotOwnerConversation {
  bot_id: string;
  bot_name: string;
  owner_id: string;
  session_id: string;
  bot_user_id: string;
  user_name: string;
  user_email: string;
  message_count: number;
  conversation_start: string;
  last_message_at: string;
  last_user_message: string;
  last_bot_message: string;
  user_first_seen: string;
  user_last_active: string;
  is_active_today: boolean;
}

export interface OwnerGlobalStats {
  total_bots: number;
  active_bots: number;
  total_messages: number;
  total_users: number;
  messages_today: number;
  active_users_today: number;
  total_conversations: number;
  most_active_bot_id: string;
  most_active_bot_name: string;
}

/**
 * Gestionnaire de données dédié aux propriétaires de bots
 * Utilise les nouvelles fonctions SQL sécurisées
 */
export class BotOwnerDataManager {
  
  /**
   * Récupère l'historique complet d'un bot avec validation de propriété
   */
  static async getBotHistory(
    botId: string, 
    sessionToken?: string, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<BotOwnerHistoryMessage[]> {
    try {
      const { data, error } = await supabase.rpc('get_bot_owner_history', {
        p_bot_id: botId,
        p_session_token: sessionToken || null,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        console.error('[BotOwnerDataManager] Erreur récupération historique:', error);
        throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[BotOwnerDataManager] Erreur getBotHistory:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques détaillées d'un bot spécifique
   */
  static async getBotStats(botId: string): Promise<BotOwnerStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_bot_owner_stats', {
        p_bot_id: botId
      });

      if (error) {
        console.error('[BotOwnerDataManager] Erreur statistiques bot:', error);
        throw new Error(`Erreur lors de la récupération des statistiques: ${error.message}`);
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('[BotOwnerDataManager] Erreur getBotStats:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les conversations d'un propriétaire
   */
  static async getOwnerConversations(
    limit: number = 50,
    offset: number = 0,
    botId?: string
  ): Promise<BotOwnerConversation[]> {
    try {
      const { data, error } = await supabase.rpc('get_owner_all_conversations', {
        p_limit: limit,
        p_offset: offset,
        p_bot_id: botId || null
      });

      if (error) {
        console.error('[BotOwnerDataManager] Erreur conversations:', error);
        throw new Error(`Erreur lors de la récupération des conversations: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[BotOwnerDataManager] Erreur getOwnerConversations:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques globales d'un propriétaire
   */
  static async getOwnerGlobalStats(): Promise<OwnerGlobalStats | null> {
    try {
      const { data, error } = await supabase.rpc('get_owner_global_stats');

      if (error) {
        console.error('[BotOwnerDataManager] Erreur stats globales:', error);
        throw new Error(`Erreur lors de la récupération des statistiques globales: ${error.message}`);
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('[BotOwnerDataManager] Erreur getOwnerGlobalStats:', error);
      throw error;
    }
  }

  /**
   * Récupère les messages d'une session spécifique
   */
  static async getSessionMessages(
    botId: string, 
    sessionId: string
  ): Promise<BotOwnerHistoryMessage[]> {
    try {
      return await this.getBotHistory(botId, sessionId, 1000, 0);
    } catch (error) {
      console.error('[BotOwnerDataManager] Erreur getSessionMessages:', error);
      throw error;
    }
  }

  /**
   * Valide que l'utilisateur est propriétaire d'un bot
   */
  static async validateBotOwnership(botId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('bots')
        .select(`
          id,
          bot_owners!inner (
            user_id
          )
        `)
        .eq('id', botId)
        .eq('bot_owners.user_id', user.id)
        .single();

      return !error && data !== null;
    } catch (error) {
      console.error('[BotOwnerDataManager] Erreur validation propriété:', error);
      return false;
    }
  }

  /**
   * Récupère les bots d'un propriétaire avec leurs statistiques basiques
   */
  static async getOwnerBotsWithStats(): Promise<Array<{
    id: string;
    name: string;
    is_active: boolean;
    total_messages: number;
    total_users: number;
    last_activity: string;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('detailed_bot_stats')
        .select(`
          bot_id,
          bot_name,
          is_active,
          total_messages,
          total_unique_users,
          last_message_at
        `)
        .eq('owner_id', (
          await supabase
            .from('bot_owners')
            .select('id')
            .eq('user_id', user.id)
            .single()
        ).data?.id)
        .order('total_messages', { ascending: false });

      if (error) {
        console.error('[BotOwnerDataManager] Erreur bots avec stats:', error);
        return [];
      }

      return (data || []).map(bot => ({
        id: bot.bot_id,
        name: bot.bot_name || 'Bot sans nom',
        is_active: bot.is_active || false,
        total_messages: bot.total_messages || 0,
        total_users: bot.total_unique_users || 0,
        last_activity: bot.last_message_at || new Date().toISOString()
      }));
    } catch (error) {
      console.error('[BotOwnerDataManager] Erreur getOwnerBotsWithStats:', error);
      return [];
    }
  }

  /**
   * Fonction de débogage pour tester les nouvelles fonctionnalités
   */
  static async debugBotAccess(botId: string): Promise<{
    isOwner: boolean;
    botExists: boolean;
    historyCount: number;
    stats: BotOwnerStats | null;
    error?: string;
  }> {
    try {
      const isOwner = await this.validateBotOwnership(botId);
      
      const { data: botData } = await supabase
        .from('bots')
        .select('id, name')
        .eq('id', botId)
        .single();
      
      const botExists = botData !== null;
      
      let historyCount = 0;
      let stats = null;
      
      if (isOwner) {
        const history = await this.getBotHistory(botId, undefined, 10, 0);
        historyCount = history.length;
        stats = await this.getBotStats(botId);
      }

      return {
        isOwner,
        botExists,
        historyCount,
        stats,
      };
    } catch (error: any) {
      return {
        isOwner: false,
        botExists: false,
        historyCount: 0,
        stats: null,
        error: error.message
      };
    }
  }
}
