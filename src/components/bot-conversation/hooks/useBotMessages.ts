import { useState, useEffect } from "react";
import { Bot } from '../types';
import { messagesByBotUserId, messagesBySessionTokenMetadata, messagesByRecent } from "./messageSearchStrategies";
import { findBotUserIdFromSession } from "./sessionHelpers";
import { supabase } from "@/integrations/supabase/client";
import { mapSessionToMessages } from "./utils/sessionMessageDebug";

export interface BotMessage {
  id: string;
  message_content: string;
  created_at: string;
  message_type: string;
  bot_user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
}

export interface BotSession {
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

    // debug context JSON
    const searchResults: any = {
      strategy1_bot_user_search: null,
      strategy2_token_metadata_search: null,
      strategy3_recent_messages: null,
      sessionMessageMapping: null,
      console_traces: [],
      final_result: [],
      recent_messages_dump: []
    };

    const fetchMessages = async () => {
      try {
        let sessionMessages: BotMessage[] = [];
        let byUser: BotMessage[] = [];
        let byToken: BotMessage[] = [];
        let consoleTraces: string[] = [];

        // Strategy 1 : direct avec bot_user_id
        if (selectedSession.bot_user_id) {
          byUser = await messagesByBotUserId(selectedBot.id, selectedSession.bot_user_id);
          searchResults.strategy1_bot_user_search = {
            usedBotUserId: selectedSession.bot_user_id,
            count: byUser.length,
          };
          consoleTraces.push(`[direct] messagesByBotUserId with '${selectedSession.bot_user_id}': ${byUser.length} messages`);
          if (byUser.length > 0) sessionMessages = byUser;
        }

        // Strategy 2 : bot_user_id inféré par session_token
        if (sessionMessages.length === 0) {
          const inferredBotUserId = await findBotUserIdFromSession(selectedBot.id, selectedSession.session_token);
          if (inferredBotUserId) {
            byUser = await messagesByBotUserId(selectedBot.id, inferredBotUserId);
            searchResults.strategy1_bot_user_search = {
              usedBotUserId: inferredBotUserId,
              count: byUser.length,
              inferred: true,
            };
            consoleTraces.push(`[inferred] messagesByBotUserId with inferred '${inferredBotUserId}': ${byUser.length} messages`);
            if (byUser.length > 0) sessionMessages = byUser;
          } else {
            consoleTraces.push(`[inferred] No bot_user_id found from session_token: ${selectedSession.session_token}`);
          }
        }

        // Strategy 3 : fallback scan metadata
        if (sessionMessages.length === 0) {
          byToken = await messagesBySessionTokenMetadata(selectedBot.id, selectedSession.session_token);
          searchResults.strategy2_token_metadata_search = {
            searchedToken: selectedSession.session_token,
            count: byToken.length
          };
          consoleTraces.push(`[metadata] messagesBySessionTokenMetadata for '${selectedSession.session_token}': ${byToken.length} messages`);
          if (byToken.length > 0) sessionMessages = byToken;
        }

        // Strategy 4 : dump all recent for debug + mapping insight
        const { data: recent, error } = await supabase
          .from("chat_messages")
          .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent, metadata")
          .eq("bot_id", selectedBot.id)
          .order("created_at", { ascending: false })
          .limit(20);

        searchResults.strategy3_recent_messages = {
          count: recent?.length || 0
        };
        searchResults.recent_messages_dump = recent || [];

        // mapping diagnostic for dev : voir, pour chaque message, ce qui est lié à la session
        searchResults.sessionMessageMapping = mapSessionToMessages(
          selectedSession,
          recent || []
        );

        searchResults.console_traces = consoleTraces;
        searchResults.final_result = sessionMessages;

        setMessages(sessionMessages);
        setDebugInfo(searchResults);

        // Petits logs pour débug
        // eslint-disable-next-line no-console
        if (consoleTraces.length)
          console.log("-- useBotMessages DEBUG --", { session: selectedSession, consoleTraces, mapping: searchResults.sessionMessageMapping });

      } catch (error) {
        setMessages([]);
        setDebugInfo({ error: error });
        // eslint-disable-next-line no-console
        console.error("Error in useBotMessages:", error);
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
