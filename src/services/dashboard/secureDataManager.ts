
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalBots: number;
  totalMessages: number;
  totalUsers: number;
  activeToday: number;
}

interface BotSummary {
  id: string;
  name: string;
  total_messages: number;
  total_users: number;
  last_activity: string;
}

interface ConversationData {
  id: string;
  bot_id: string;
  bot_name: string;
  user_id: string;
  user_name: string;
  user_email: string;
  session_id: string;
  total_messages: number;
  last_message_at: string;
  last_message_content: string;
  session_start: string;
  is_active: boolean;
}

interface MessageData {
  id: string;
  message_content: string;
  message_type: 'user' | 'bot';
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  bot_users: {
    user_name?: string;
    user_email?: string;
    session_id?: string;
  };
  bots: {
    name: string;
  };
}

export class SecureDataManager {
  
  /**
   * Récupère les statistiques complètes du tableau de bord pour un propriétaire
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      // Récupérer l'ID du propriétaire
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        return { totalBots: 0, totalMessages: 0, totalUsers: 0, activeToday: 0 };
      }

      // Utiliser la vue detailed_bot_stats pour des statistiques complètes
      const { data: statsData } = await supabase
        .from('detailed_bot_stats')
        .select('*')
        .eq('owner_id', ownerData.id);

      if (!statsData || statsData.length === 0) {
        return { totalBots: 0, totalMessages: 0, totalUsers: 0, activeToday: 0 };
      }

      // Agréger toutes les statistiques
      const aggregatedStats = statsData.reduce((acc, bot) => ({
        totalBots: acc.totalBots + 1,
        totalMessages: acc.totalMessages + (bot.total_messages || 0),
        totalUsers: acc.totalUsers + (bot.total_unique_users || 0),
        activeToday: acc.activeToday + (bot.active_users_24h || 0)
      }), {
        totalBots: 0,
        totalMessages: 0,
        totalUsers: 0,
        activeToday: 0
      });

      console.log('[SecureDataManager] Statistiques agrégées:', aggregatedStats);
      return aggregatedStats;

    } catch (error) {
      console.error('[SecureDataManager] Erreur récupération stats:', error);
      return { totalBots: 0, totalMessages: 0, totalUsers: 0, activeToday: 0 };
    }
  }

  /**
   * Récupère tous les bots d'un propriétaire avec leurs statistiques
   */
  static async getOwnerBots(): Promise<BotSummary[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return [];

      const { data: botsData } = await supabase
        .from('detailed_bot_stats')
        .select(`
          bot_id,
          bot_name,
          total_messages,
          total_unique_users,
          last_message_at
        `)
        .eq('owner_id', ownerData.id)
        .order('total_messages', { ascending: false });

      return (botsData || []).map(bot => ({
        id: bot.bot_id,
        name: bot.bot_name || 'Bot sans nom',
        total_messages: bot.total_messages || 0,
        total_users: bot.total_unique_users || 0,
        last_activity: bot.last_message_at || new Date().toISOString()
      }));

    } catch (error) {
      console.error('[SecureDataManager] Erreur récupération bots:', error);
      return [];
    }
  }

  /**
   * Récupère toutes les conversations d'un propriétaire
   */
  static async getAllConversations(): Promise<ConversationData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return [];

      // Utiliser la vue bot_conversation_history pour avoir toutes les conversations
      const { data: conversationsData } = await supabase
        .from('bot_conversation_history')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('message_timestamp', { ascending: false });

      if (!conversationsData) return [];

      // Grouper par session pour créer les conversations
      const conversationMap = new Map<string, ConversationData>();
      
      conversationsData.forEach(row => {
        const sessionKey = `${row.bot_id}-${row.session_id}`;
        
        if (!conversationMap.has(sessionKey)) {
          conversationMap.set(sessionKey, {
            id: sessionKey,
            bot_id: row.bot_id,
            bot_name: row.bot_name || 'Bot sans nom',
            user_id: row.bot_user_id,
            user_name: row.user_name || 'Utilisateur anonyme',
            user_email: row.user_email || '',
            session_id: row.session_id,
            total_messages: 0,
            last_message_at: row.message_timestamp,
            last_message_content: row.message_content || '',
            session_start: row.session_start,
            is_active: true
          });
        }

        const conversation = conversationMap.get(sessionKey)!;
        conversation.total_messages++;
        
        // Garder le message le plus récent
        if (new Date(row.message_timestamp) > new Date(conversation.last_message_at)) {
          conversation.last_message_at = row.message_timestamp;
          conversation.last_message_content = row.message_content || '';
        }
      });

      const conversations = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      console.log(`[SecureDataManager] ${conversations.length} conversations récupérées`);
      return conversations;

    } catch (error) {
      console.error('[SecureDataManager] Erreur récupération conversations:', error);
      return [];
    }
  }

  /**
   * Récupère tous les messages d'un propriétaire avec filtrage
   */
  static async getAllMessages(botId?: string): Promise<MessageData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return [];

      // Récupérer tous les bots du propriétaire ou un bot spécifique
      let botIds: string[] = [];
      if (botId) {
        // Vérifier que ce bot appartient au propriétaire
        const { data: botCheck } = await supabase
          .from('bots')
          .select('id')
          .eq('id', botId)
          .eq('owner_id', ownerData.id)
          .single();
        
        if (botCheck) {
          botIds = [botId];
        }
      } else {
        const { data: botsData } = await supabase
          .from('bots')
          .select('id')
          .eq('owner_id', ownerData.id);
        
        botIds = (botsData || []).map(bot => bot.id);
      }

      if (botIds.length === 0) return [];

      // Récupérer tous les messages avec les informations complètes
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select(`
          *,
          bot_users (user_name, user_email, session_id),
          bots (name)
        `)
        .in('bot_id', botIds)
        .order('created_at', { ascending: false })
        .limit(5000); // Limite raisonnable pour les performances

      if (!messagesData) return [];

      const formattedMessages: MessageData[] = messagesData.map(msg => ({
        id: msg.id,
        message_content: msg.message_content || '',
        message_type: (msg.message_type === 'user' || msg.message_type === 'bot') ? msg.message_type : 'user',
        created_at: msg.created_at,
        ip_address: msg.ip_address,
        user_agent: msg.user_agent,
        bot_users: {
          user_name: msg.bot_users?.user_name,
          user_email: msg.bot_users?.user_email,
          session_id: msg.bot_users?.session_id
        },
        bots: {
          name: msg.bots?.name || 'Bot supprimé'
        }
      }));

      console.log(`[SecureDataManager] ${formattedMessages.length} messages récupérés`);
      return formattedMessages;

    } catch (error) {
      console.error('[SecureDataManager] Erreur récupération messages:', error);
      return [];
    }
  }

  /**
   * Récupère les messages d'une session spécifique
   */
  static async getSessionMessages(botId: string, sessionId: string): Promise<MessageData[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Vérifier la propriété du bot
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) return [];

      const { data: botCheck } = await supabase
        .from('bots')
        .select('id')
        .eq('id', botId)
        .eq('owner_id', ownerData.id)
        .single();

      if (!botCheck) return [];

      // Utiliser la vue bot_conversation_history pour récupérer les messages de la session
      const { data: messagesData } = await supabase
        .from('bot_conversation_history')
        .select('*')
        .eq('bot_id', botId)
        .eq('session_id', sessionId)
        .order('message_timestamp', { ascending: true });

      if (!messagesData) return [];

      const formattedMessages: MessageData[] = messagesData.map(msg => ({
        id: msg.message_id,
        message_content: msg.message_content || '',
        message_type: (msg.message_type === 'user' || msg.message_type === 'bot') ? msg.message_type : 'user',
        created_at: msg.message_timestamp,
        ip_address: msg.ip_address,
        user_agent: msg.user_agent,
        bot_users: {
          user_name: msg.user_name,
          user_email: msg.user_email,
          session_id: msg.session_id
        },
        bots: {
          name: msg.bot_name || 'Bot'
        }
      }));

      return formattedMessages;

    } catch (error) {
      console.error('[SecureDataManager] Erreur récupération messages session:', error);
      return [];
    }
  }

  /**
   * Vérifie l'intégrité des données pour un propriétaire
   */
  static async verifyDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    stats: any;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          isValid: false,
          issues: ['Utilisateur non authentifié'],
          stats: {}
        };
      }

      const issues: string[] = [];
      
      // Vérifier l'existence du bot_owner
      const { data: ownerData } = await supabase
        .from('bot_owners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!ownerData) {
        issues.push('Aucun bot_owner trouvé pour cet utilisateur');
        return { isValid: false, issues, stats: {} };
      }

      // Compter les bots
      const { data: botsData, count: botsCount } = await supabase
        .from('bots')
        .select('id', { count: 'exact' })
        .eq('owner_id', ownerData.id);

      // Compter les messages via bot_users
      let totalMessages = 0;
      let totalUsers = 0;
      
      if (botsData && botsData.length > 0) {
        const botIds = botsData.map(bot => bot.id);
        
        const { count: messagesCount } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact' })
          .in('bot_id', botIds);

        const { count: usersCount } = await supabase
          .from('bot_users')
          .select('id', { count: 'exact' })
          .in('bot_id', botIds);

        totalMessages = messagesCount || 0;
        totalUsers = usersCount || 0;
      }

      // Comparer avec les statistiques de la vue
      const statsFromView = await this.getDashboardStats();
      
      const stats = {
        direct_count: {
          bots: botsCount || 0,
          messages: totalMessages,
          users: totalUsers
        },
        view_stats: statsFromView,
        discrepancies: {
          bots: Math.abs((botsCount || 0) - statsFromView.totalBots),
          messages: Math.abs(totalMessages - statsFromView.totalMessages),
          users: Math.abs(totalUsers - statsFromView.totalUsers)
        }
      };

      // Détecter les incohérences significatives
      if (stats.discrepancies.messages > 10) {
        issues.push(`Incohérence dans le compte des messages: ${stats.discrepancies.messages} différence`);
      }
      
      if (stats.discrepancies.users > 5) {
        issues.push(`Incohérence dans le compte des utilisateurs: ${stats.discrepancies.users} différence`);
      }

      const isValid = issues.length === 0;
      
      console.log('[SecureDataManager] Vérification intégrité:', {
        isValid,
        issues,
        stats
      });

      return { isValid, issues, stats };

    } catch (error) {
      console.error('[SecureDataManager] Erreur vérification intégrité:', error);
      return {
        isValid: false,
        issues: [`Erreur lors de la vérification: ${error}`],
        stats: {}
      };
    }
  }
}
