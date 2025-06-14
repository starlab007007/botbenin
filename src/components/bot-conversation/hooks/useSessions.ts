
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, BotSession } from '../types';
import { normalizeSession } from '../utils';

export const useSessions = (selectedBot: Bot | null) => {
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (!selectedBot) return;
    setLoadingSessions(true);

    const fetchSessions = async () => {
      const { data: sessData, error } = await supabase
        .from("enhanced_chat_sessions")
        .select("id, session_token, last_activity, started_at, is_active, entry_point, user_agent, ip_address, bot_user_id")
        .eq("bot_id", selectedBot.id)
        .in("entry_point", ["shortened_link", "public_url"])
        .order("last_activity", { ascending: false })
        .limit(100);

      if (error) {
        console.error("[BotConversationControl] Erreur récupération sessions publiques :", error);
        setSessions([]);
      } else {
        const sessionsRaw: any[] = sessData ?? [];
        const normalized = sessionsRaw.map(normalizeSession) as BotSession[];
        setSessions(normalized);
      }
      setLoadingSessions(false);
    };

    fetchSessions();
  }, [selectedBot]);

  return { sessions, loadingSessions };
};
