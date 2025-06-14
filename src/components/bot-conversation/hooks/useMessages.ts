
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, BotSession, Message } from '../types';

export const useMessages = (selectedBot: Bot | null, selectedSession: BotSession | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!selectedSession) return;
    setLoadingMessages(true);

    const fetchMessages = async () => {
      // Only select columns as string, not with a type parameter
      const { data: msgData, error } = await supabase
        .from("chat_messages")
        .select("id, message_content, created_at, message_type")
        .eq("bot_id", selectedBot?.id || "")
        .eq("session_token", selectedSession.session_token)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("[BotConversationControl] Erreur récupération messages session :", error);
        setMessages([]);
      } else {
        setMessages((msgData as Message[]) || []);
      }
      setLoadingMessages(false);
    };

    fetchMessages();
  }, [selectedSession, selectedBot]);

  return { messages, loadingMessages };
};
