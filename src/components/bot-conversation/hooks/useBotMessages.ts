
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

  useEffect(() => {
    if (!selectedSession || !selectedBot) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);

    const fetchMessages = async () => {
      try {
        console.log(`[useBotMessages] Recherche messages pour session: ${selectedSession.session_token} (type: ${selectedSession.source_type})`);

        let sessionMessages: BotMessage[] = [];

        if (selectedSession.source_type === 'authenticated' && selectedSession.bot_user_id) {
          // Pour les sessions authentifiées, chercher par bot_user_id
          const { data: messagesByUser, error: userError } = await supabase
            .from("chat_messages")
            .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
            .eq("bot_id", selectedBot.id)
            .eq("bot_user_id", selectedSession.bot_user_id)
            .order("created_at", { ascending: true });

          if (userError) {
            console.error("[useBotMessages] Erreur requête messages par user :", userError);
          } else {
            sessionMessages = messagesByUser || [];
            console.log(`[useBotMessages] Messages trouvés par bot_user_id: ${sessionMessages.length}`);
          }
        } 
        
        // Si pas de messages trouvés avec bot_user_id ou session anonyme, essayer d'autres approches
        if (sessionMessages.length === 0) {
          console.log(`[useBotMessages] Aucun message trouvé avec bot_user_id, essai avec session_token dans metadata`);
          
          // Essayer de chercher par session_token dans les métadonnées
          const { data: messagesByToken, error: tokenError } = await supabase
            .from("chat_messages")
            .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent, metadata")
            .eq("bot_id", selectedBot.id)
            .order("created_at", { ascending: false })
            .limit(100);

          if (tokenError) {
            console.error("[useBotMessages] Erreur requête messages par token :", tokenError);
          } else if (messagesByToken) {
            // Filtrer les messages qui correspondent au session_token
            const filteredMessages = messagesByToken.filter(msg => {
              if (msg.metadata && typeof msg.metadata === 'object') {
                const metadata = msg.metadata as any;
                return metadata.session_token === selectedSession.session_token ||
                       metadata.sessionToken === selectedSession.session_token;
              }
              return false;
            });
            
            sessionMessages = filteredMessages;
            console.log(`[useBotMessages] Messages trouvés par session_token: ${sessionMessages.length}`);
          }
        }

        // Si toujours pas de messages, essayer une approche plus large pour les sessions récentes
        if (sessionMessages.length === 0) {
          console.log(`[useBotMessages] Aucun message trouvé, récupération des messages récents du bot`);
          
          const { data: recentMessages, error: recentError } = await supabase
            .from("chat_messages")
            .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
            .eq("bot_id", selectedBot.id)
            .order("created_at", { ascending: false })
            .limit(20);

          if (recentError) {
            console.error("[useBotMessages] Erreur requête messages récents :", recentError);
          } else {
            sessionMessages = recentMessages || [];
            console.log(`[useBotMessages] Messages récents récupérés: ${sessionMessages.length}`);
          }
        }

        console.log(`[useBotMessages] Total final de messages: ${sessionMessages.length}`);
        setMessages(sessionMessages);

      } catch (error) {
        console.error("[useBotMessages] Erreur lors de la récupération des messages :", error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedSession, selectedBot]);

  return { messages, loadingMessages, setMessages };
};
