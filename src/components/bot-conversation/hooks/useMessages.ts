
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

/**
 * FIX: Avoid deep type recursion error by fully disabling type inference from Supabase response.
 * Never let TypeScript attempt to infer types from the SDK: always cast all fetch results as `any`.
 */
export const useMessages = (
  selectedBot: Bot | null,
  selectedSession: BotSession | null
): {
  messages: Message[];
  loadingMessages: boolean;
} => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!selectedSession || !selectedBot) return;
    setLoadingMessages(true);

    const fetchMessages = async () => {
      // CAST THE RESULT PROMISE TO ANY FIRST!
      // This stops TypeScript from ever recursing through SDK types.

      // @ts-expect-error - forcibly disable type inference on this line
      const result: any = await supabase
        .from("chat_messages")
        .select("id, message_content, created_at, message_type")
        .eq("bot_id", selectedBot.id)
        .eq("session_token", selectedSession.session_token)
        .order("created_at", { ascending: true })
        .limit(100);

      // De-structure only after casting to any
      const data = result.data ?? [];
      const error = result.error;

      if (error) {
        console.error("[BotConversationControl] Erreur récupération messages session :", error);
        setMessages([]);
      } else if (Array.isArray(data)) {
        setMessages(data.map(mapRawToMessage));
      } else {
        setMessages([]);
      }
      setLoadingMessages(false);
    };

    fetchMessages();
  }, [selectedSession, selectedBot]);

  return { messages, loadingMessages };
};
