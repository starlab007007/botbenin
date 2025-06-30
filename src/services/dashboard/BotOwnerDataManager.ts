
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

      // Vérifier que data est un tableau et le typer correctement
      if (!Array.isArray(data)) {
        console.warn('[BotOwnerDataManager] Données reçues ne sont pas un tableau:', data);
        return [];
      }

      return data.map((row: any) => ({
        message_id: row.message_id,
        message_content: row.message_content || '',
        message_type: row.message_type as 'user' | 'bot',
        message_timestamp: row.message_timestamp,
        user_name: row.user_name || 'Utilisateur Anonyme',
        user_email: row.user_email || '',
        session_id: row.session_id || '',
        ip_address: row.ip_address || '',
        user_agent: row.user_agent || '',
        metadata: row.metadata || {},
        bot_name: row.bot_name || '',
        owner_id: row.owner_id || ''
      }));
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

      // Vérifier que data est un tableau et contient des données
      if (!Array.isArray(data) || data.length === 0) {
        console.warn('[BotOwnerDataManager] Aucune statistique trouvée pour le bot:', botId);
        return null;
      }

      const statsRow = data[0] as any;
      return {
        bot_id: statsRow.bot_id,
        bot_name: statsRow.bot_name || '',
        total_messages: Number(statsRow.total_messages) || 0,
        total_users: Number(statsRow.total_users) || 0,
        total_sessions: Number(statsRow.total_sessions) || 0,
        messages_24h: Number(statsRow.messages_24h) || 0,
        active_users_24h: Number(statsRow.active_users_24h) || 0,
        avg_messages_per_session: Number(statsRow.avg_messages_per_session) || 0,
        last_activity: statsRow.last_activity || new Date().toISOString(),
        creation_date: statsRow.creation_date || new Date().toISOString(),
        is_active: Boolean(statsRow.is_active)
      };
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

      // Vérifier que data est un tableau
      if (!Array.isArray(data)) {
        console.warn('[BotOwnerDataManager] Données conversations ne sont pas un tableau:', data);
        return [];
      }

      return data.map((row: any) => ({
        bot_id: row.bot_id || '',
        bot_name: row.bot_name || '',
        owner_id: row.owner_id || '',
        session_id: row.session_id || '',
        bot_user_id: row.bot_user_id || '',
        user_name: row.user_name || 'Utilisateur Anonyme',
        user_email: row.user_email || '',
        message_count: Number(row.message_count) || 0,
        conversation_start: row.conversation_start || new Date().toISOString(),
        last_message_at: row.last_message_at || new Date().toISOString(),
        last_user_message: row.last_user_message || '',
        last_bot_message: row.last_bot_message || '',
        user_first_seen: row.user_first_seen || new Date().toISOString(),
        user_last_active: row.user_last_active || new Date().toISOString(),
        is_active_today: Boolean(row.is_active_today)
      }));
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

      // Vérifier que data est un tableau et contient des données
      if (!Array.isArray(data) || data.length === 0) {
        console.warn('[BotOwnerDataManager] Aucune statistique globale trouvée');
        return null;
      }

      const statsRow = data[0] as any;
      return {
        total_bots: Number(statsRow.total_bots) || 0,
        active_bots: Number(statsRow.active_bots) || 0,
        total_messages: Number(statsRow.total_messages) || 0,
        total_users: Number(statsRow.total_users) || 0,
        messages_today: Number(statsRow.messages_today) || 0,
        active_users_today: Number(statsRow.active_users_today) || 0,
        total_conversations: Number(statsRow.total_conversations) || 0,
        most_active_bot_id: statsRow.most_active_bot_id || '',
        most_active_bot_name: statsRow.most_active_bot_name || ''
      };
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

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return [];

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
        .eq('owner_id', ownerData.id)
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
