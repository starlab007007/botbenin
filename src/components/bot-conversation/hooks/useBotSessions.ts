
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot } from '../types';

interface BotSession {
  id: string;
  session_token: string;
  last_activity: string;
  started_at: string;
  is_active: boolean;
  entry_point: string;
  user_agent: string | null;
  ip_address: string | null;
  bot_user_id: string | null;
  total_messages?: number;
  source_type: 'anonymous' | 'authenticated';
}

export const useBotSessions = (selectedBot: Bot | null) => {
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (!selectedBot) return;
    setLoadingSessions(true);

    const fetchAllSessions = async () => {
      try {
        // Récupérer les sessions anonymes (publiques)
        const { data: anonymousSessions, error: anonError } = await supabase
          .from("anonymous_visitor_sessions")
          .select(`
            id,
            session_token,
            started_at,
            last_activity,
            is_active,
            entry_point,
            ip_address
          `)
          .eq("bot_id", selectedBot.id)
          .order("last_activity", { ascending: false })
          .limit(50);

        if (anonError) {
          console.error("[useBotSessions] Erreur sessions anonymes :", anonError);
        }

        // Récupérer les sessions authentifiées via enhanced_chat_sessions
        const { data: enhancedSessions, error: enhError } = await supabase
          .from("enhanced_chat_sessions")
          .select(`
            id,
            session_token,
            started_at,
            last_activity,
            is_active,
            entry_point,
            user_agent,
            ip_address,
            bot_user_id,
            total_messages
          `)
          .eq("bot_id", selectedBot.id)
          .order("last_activity", { ascending: false })
          .limit(50);

        if (enhError) {
          console.error("[useBotSessions] Erreur sessions enhanced :", enhError);
        }

        // Combiner et normaliser toutes les sessions
        const allSessions: BotSession[] = [];

        // Ajouter les sessions anonymes
        if (anonymousSessions) {
          anonymousSessions.forEach(session => {
            allSessions.push({
              id: session.id,
              session_token: session.session_token,
              last_activity: session.last_activity || session.started_at,
              started_at: session.started_at,
              is_active: session.is_active || false,
              entry_point: session.entry_point || 'direct',
              user_agent: null,
              ip_address: session.ip_address ? session.ip_address.toString() : null,
              bot_user_id: null,
              total_messages: 0,
              source_type: 'anonymous'
            });
          });
        }

        // Ajouter les sessions authentifiées
        if (enhancedSessions) {
          enhancedSessions.forEach(session => {
            allSessions.push({
              id: session.id,
              session_token: session.session_token,
              last_activity: session.last_activity || session.started_at,
              started_at: session.started_at,
              is_active: session.is_active || false,
              entry_point: session.entry_point || 'chat',
              user_agent: session.user_agent,
              ip_address: session.ip_address ? session.ip_address.toString() : null,
              bot_user_id: session.bot_user_id,
              total_messages: session.total_messages || 0,
              source_type: 'authenticated'
            });
          });
        }

        // Trier par dernière activité
        allSessions.sort((a, b) => 
          new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
        );

        console.log(`[useBotSessions] ${allSessions.length} sessions trouvées pour le bot ${selectedBot.name}`);
        setSessions(allSessions);

      } catch (error) {
        console.error("[useBotSessions] Erreur générale :", error);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchAllSessions();
  }, [selectedBot]);

  return { sessions, loadingSessions };
};
