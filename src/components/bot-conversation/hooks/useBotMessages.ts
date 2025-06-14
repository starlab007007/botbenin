
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot } from '../types';

interface BotMessage {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string;
  bot_user_id?: string;
  ip_address?: string;
  user_agent?: string;
}

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

export const useBotMessages = (
  selectedBot: Bot | null,
  selectedSession: BotSession | null
) => {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (!selectedSession || !selectedBot) {
      setMessages([]);
      setDebugInfo(null);
      return;
    }

    setLoadingMessages(true);

    const fetchMessages = async () => {
      try {
        console.log(`[useBotMessages] === RECHERCHE MESSAGES AMÉLIORÉE ===`);
        console.log(`Session token: ${selectedSession.session_token}`);
        console.log(`Bot ID: ${selectedBot.id}`);
        console.log(`Session type: ${selectedSession.source_type}`);

        let sessionMessages: BotMessage[] = [];
        const searchResults: any = {
          strategy1_bot_user_search: null,
          strategy2_token_metadata_search: null,
          strategy3_recent_messages: null,
          strategy4_all_bot_messages: null,
          final_result: []
        };

        // Stratégie 1: Recherche par bot_user_id si disponible
        if (selectedSession.bot_user_id) {
          console.log(`[Stratégie 1] Recherche par bot_user_id: ${selectedSession.bot_user_id}`);
          
          const { data: messagesByUser, error: userError } = await supabase
            .from("chat_messages")
            .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
            .eq("bot_id", selectedBot.id)
            .eq("bot_user_id", selectedSession.bot_user_id)
            .order("created_at", { ascending: true });

          searchResults.strategy1_bot_user_search = {
            data: messagesByUser,
            error: userError,
            count: messagesByUser?.length || 0
          };

          if (userError) {
            console.error("[Stratégie 1] Erreur:", userError);
          } else if (messagesByUser && messagesByUser.length > 0) {
            sessionMessages = messagesByUser;
            console.log(`[Stratégie 1] ✅ ${sessionMessages.length} messages trouvés`);
          }
        }

        // Stratégie 2 AMÉLIORÉE: Recherche par session_token dans les métadonnées OU par bot_user_id associé au token
        if (sessionMessages.length === 0) {
          console.log(`[Stratégie 2] Recherche améliorée par session_token`);
          
          // D'abord, chercher un bot_user avec ce session_id
          const { data: botUser, error: botUserError } = await supabase
            .from("bot_users")
            .select("id")
            .eq("bot_id", selectedBot.id)
            .eq("session_id", selectedSession.session_token)
            .maybeSingle();

          if (botUser && !botUserError) {
            console.log(`[Stratégie 2a] Bot user trouvé pour le token: ${botUser.id}`);
            
            // Rechercher les messages par ce bot_user_id
            const { data: messagesByBotUser, error: msgError } = await supabase
              .from("chat_messages")
              .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
              .eq("bot_id", selectedBot.id)
              .eq("bot_user_id", botUser.id)
              .order("created_at", { ascending: true });

            if (messagesByBotUser && !msgError && messagesByBotUser.length > 0) {
              sessionMessages = messagesByBotUser;
              console.log(`[Stratégie 2a] ✅ ${sessionMessages.length} messages trouvés par bot_user_id`);
            }
          }

          // Si toujours pas de messages, rechercher dans les métadonnées
          if (sessionMessages.length === 0) {
            console.log(`[Stratégie 2b] Recherche dans les métadonnées`);
            
            const { data: allMessages, error: metaError } = await supabase
              .from("chat_messages")
              .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent, metadata")
              .eq("bot_id", selectedBot.id)
              .order("created_at", { ascending: false })
              .limit(500);

            searchResults.strategy2_token_metadata_search = {
              data: allMessages,
              error: metaError,
              count: allMessages?.length || 0,
              searched_token: selectedSession.session_token
            };

            if (metaError) {
              console.error("[Stratégie 2b] Erreur:", metaError);
            } else if (allMessages) {
              console.log(`[Stratégie 2b] ${allMessages.length} messages à filtrer`);
              
              const filteredMessages = allMessages.filter(msg => {
                if (msg.metadata && typeof msg.metadata === 'object') {
                  const metadata = msg.metadata as any;
                  const hasSessionToken = metadata.session_token === selectedSession.session_token ||
                                        metadata.sessionToken === selectedSession.session_token;
                  return hasSessionToken;
                }
                return false;
              });
              
              if (filteredMessages.length > 0) {
                sessionMessages = filteredMessages.reverse();
                console.log(`[Stratégie 2b] ✅ ${sessionMessages.length} messages trouvés dans métadonnées`);
              }
            }
          }
        }

        // Stratégie 3: Messages récents du bot (pour debug)
        console.log(`[Stratégie 3] Recherche messages récents du bot`);
        const { data: recentMessages, error: recentError } = await supabase
          .from("chat_messages")
          .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
          .eq("bot_id", selectedBot.id)
          .order("created_at", { ascending: false })
          .limit(10);

        searchResults.strategy3_recent_messages = {
          data: recentMessages,
          error: recentError,
          count: recentMessages?.length || 0
        };

        // Stratégie 4: TOUS les messages du bot (pour debug complet)
        console.log(`[Stratégie 4] Comptage total des messages du bot`);
        const { data: allBotMessages, error: allError, count } = await supabase
          .from("chat_messages")
          .select("id", { count: 'exact' })
          .eq("bot_id", selectedBot.id);

        searchResults.strategy4_all_bot_messages = {
          total_count: count,
          error: allError
        };

        searchResults.final_result = sessionMessages;

        console.log(`[useBotMessages] 🏁 RÉSULTAT FINAL: ${sessionMessages.length} messages`);
        console.log(`[useBotMessages] Détails de recherche:`, searchResults);

        setMessages(sessionMessages);
        setDebugInfo(searchResults);

      } catch (error) {
        console.error("[useBotMessages] Erreur générale:", error);
        setMessages([]);
        setDebugInfo({ error: error });
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Écouter les changements en temps réel pour ce bot
    const channel = supabase
      .channel('chat_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `bot_id=eq.${selectedBot.id}`
        },
        (payload) => {
          console.log('[useBotMessages] Changement détecté:', payload);
          fetchMessages(); // Refetch messages when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSession, selectedBot]);

  return { messages, loadingMessages, setMessages, debugInfo };
};
