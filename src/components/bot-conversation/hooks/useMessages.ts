
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, BotSession, Message } from '../types';

// Helper to map raw Supabase message to our Message type
function mapRawToMessage(raw: any): Message {
  return {
    id: String(raw.id),
    message_content: String(raw.message_content),
    created_at: String(raw.created_at),
    message_type: String(raw.message_type),
  };
}

export const useMessages = (
  selectedBot: Bot | null,
  selectedSession: BotSession | null
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!selectedSession || !selectedBot) return;
    setLoadingMessages(true);

    const fetchMessages = async () => {
      // EXPLICITLY type the response as any[] to avoid TS deep type recursion
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, message_content, created_at, message_type")
        .eq("bot_id", selectedBot.id)
        .eq("session_token", selectedSession.session_token)
        .order("created_at", { ascending: true })
        .limit(100);

      const dataArray = data as any[] | null; // THIS breaks deep inference

      if (error) {
        console.error("[BotConversationControl] Erreur récupération messages session :", error);
        setMessages([]);
      } else if (Array.isArray(dataArray)) {
        setMessages(dataArray.map(mapRawToMessage));
      } else {
        setMessages([]);
      }
      setLoadingMessages(false);
    };

    fetchMessages();
  }, [selectedSession, selectedBot]);

  return { messages, loadingMessages };
};
