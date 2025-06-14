
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
          }
        } else {
          // Pour les sessions anonymes, utiliser une approche temporelle
          // Récupérer tous les messages récents du bot et filtrer par proximité temporelle
          const sessionTime = new Date(selectedSession.session_token.includes('_') ? 
            parseInt(selectedSession.session_token.split('_')[1]) * 1000 : 
            Date.now() - 3600000);

          const startTime = new Date(sessionTime.getTime() - 30 * 60 * 1000); // 30 min avant
          const endTime = new Date(sessionTime.getTime() + 2 * 60 * 60 * 1000); // 2h après

          const { data: messagesByTime, error: timeError } = await supabase
            .from("chat_messages")
            .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
            .eq("bot_id", selectedBot.id)
            .gte("created_at", startTime.toISOString())
            .lte("created_at", endTime.toISOString())
            .order("created_at", { ascending: true });

          if (timeError) {
            console.error("[useBotMessages] Erreur requête messages par temps :", timeError);
          } else {
            // Filtrer pour garder les messages les plus pertinents (limiter à 20)
            sessionMessages = (messagesByTime || []).slice(0, 20);
          }
        }

        console.log(`[useBotMessages] ${sessionMessages.length} messages trouvés pour la session`);
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
