
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
}

export const useBotMessages = (
  selectedBot: Bot | null,
  selectedSession: BotSession | null
) => {
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!selectedSession || !selectedBot) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);

    const fetchMessages = async () => {
      try {
        console.log(`[useBotMessages] Recherche messages pour session: ${selectedSession.session_token} (type: ${selectedSession.source_type})`);

        // Stratégie 1: Rechercher par session_token dans chat_messages
        let { data: messagesByToken, error: tokenError } = await supabase
          .from("chat_messages")
          .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
          .eq("bot_id", selectedBot.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (tokenError) {
          console.error("[useBotMessages] Erreur requête messages :", tokenError);
          setMessages([]);
          setLoadingMessages(false);
          return;
        }

        // Filtrer les messages qui correspondent à notre session
        let sessionMessages: BotMessage[] = [];

        if (messagesByToken && messagesByToken.length > 0) {
          // Pour les sessions anonymes, on ne peut pas faire de lien direct
          // On va prendre tous les messages récents du bot
          if (selectedSession.source_type === 'anonymous') {
            // Prendre les messages dans la fenêtre de temps de la session
            const sessionStart = new Date(selectedSession.session_token.includes('_') ? 
              selectedSession.session_token.split('_')[1] : Date.now() - 3600000); // 1h par défaut
            
            sessionMessages = messagesByToken.filter(msg => {
              const msgTime = new Date(msg.created_at);
              return msgTime >= sessionStart;
            }).slice(0, 20); // Limiter à 20 messages récents
          } else {
            // Pour les sessions authentifiées, chercher par bot_user_id si disponible
            if (selectedSession.id) {
              // Récupérer le bot_user_id de enhanced_chat_sessions
              const { data: sessionData } = await supabase
                .from("enhanced_chat_sessions")
                .select("bot_user_id")
                .eq("id", selectedSession.id)
                .single();

              if (sessionData?.bot_user_id) {
                sessionMessages = messagesByToken.filter(msg => 
                  msg.bot_user_id === sessionData.bot_user_id
                );
              }
            }
          }
        }

        console.log(`[useBotMessages] ${sessionMessages.length} messages trouvés pour la session`);
        setMessages(sessionMessages || []);

      } catch (error) {
        console.error("[useBotMessages] Erreur lors de la récupération des messages :", error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedSession, selectedBot]);

  return { messages, loadingMessages };
};
