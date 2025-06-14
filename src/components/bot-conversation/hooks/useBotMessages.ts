
import { useState, useEffect } from "react";
import { Bot } from '../types';
import { messagesByBotUserId, messagesBySessionTokenMetadata, messagesByRecent } from "./messageSearchStrategies";
import { findBotUserIdFromSession } from "./sessionHelpers";
import { supabase } from "@/integrations/supabase/client";

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

    // new debug context
    const searchResults: any = {
      strategy1_bot_user_search: null,
      strategy2_token_metadata_search: null,
      strategy3_recent_messages: null,
      final_result: []
    };

    const fetchMessages = async () => {
      try {
        let sessionMessages: BotMessage[] = [];
        let byUser: BotMessage[] = [];
        let byToken: BotMessage[] = [];

        // Strategy 1: direct bot_user_id
        if (selectedSession.bot_user_id) {
          byUser = await messagesByBotUserId(selectedBot.id, selectedSession.bot_user_id);
          searchResults.strategy1_bot_user_search = {
            usedBotUserId: selectedSession.bot_user_id,
            count: byUser.length,
          };
          if (byUser.length > 0) {
            sessionMessages = byUser;
          }
        }

        // Strategy 2: try to lookup bot_user_id from sessionToken
        if (sessionMessages.length === 0) {
          const inferredBotUserId = await findBotUserIdFromSession(selectedBot.id, selectedSession.session_token);
          if (inferredBotUserId) {
            byUser = await messagesByBotUserId(selectedBot.id, inferredBotUserId);
            searchResults.strategy1_bot_user_search = {
              usedBotUserId: inferredBotUserId,
              count: byUser.length,
              inferred: true,
            };
            if (byUser.length > 0) {
              sessionMessages = byUser;
            }
          }
        }

        // Strategy 3: fallback to scanning metadata for session_token
        if (sessionMessages.length === 0) {
          byToken = await messagesBySessionTokenMetadata(selectedBot.id, selectedSession.session_token);
          searchResults.strategy2_token_metadata_search = {
            searchedToken: selectedSession.session_token,
            count: byToken.length
          };
          if (byToken.length > 0) {
            sessionMessages = byToken;
          }
        }

        // Strategy 4: show recent (for debugging)
        const recent = await messagesByRecent(selectedBot.id, 10);
        searchResults.strategy3_recent_messages = {
          count: recent.length
        };

        searchResults.final_result = sessionMessages;

        setMessages(sessionMessages);
        setDebugInfo(searchResults);

      } catch (error) {
        setMessages([]);
        setDebugInfo({ error: error });
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();

    // Realtime updates for this bot
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
        (_payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [selectedSession, selectedBot]);

  return { messages, loadingMessages, setMessages, debugInfo };
};
