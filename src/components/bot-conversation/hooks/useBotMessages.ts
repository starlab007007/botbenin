
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
        console.log(`[useBotMessages] Début recherche messages pour session: ${selectedSession.session_token}`);
        console.log(`[useBotMessages] Type de session: ${selectedSession.source_type}`);
        console.log(`[useBotMessages] Bot ID: ${selectedBot.id}`);

        let sessionMessages: BotMessage[] = [];

        // Stratégie 1: Recherche par bot_user_id si disponible
        if (selectedSession.bot_user_id) {
          console.log(`[useBotMessages] Tentative 1: Recherche par bot_user_id: ${selectedSession.bot_user_id}`);
          
          const { data: messagesByUser, error: userError } = await supabase
            .from("chat_messages")
            .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
            .eq("bot_id", selectedBot.id)
            .eq("bot_user_id", selectedSession.bot_user_id)
            .order("created_at", { ascending: true });

          if (userError) {
            console.error("[useBotMessages] Erreur requête par bot_user_id :", userError);
          } else if (messagesByUser && messagesByUser.length > 0) {
            sessionMessages = messagesByUser;
            console.log(`[useBotMessages] ✅ Messages trouvés par bot_user_id: ${sessionMessages.length}`);
          } else {
            console.log(`[useBotMessages] ❌ Aucun message trouvé par bot_user_id`);
          }
        }

        // Stratégie 2: Recherche par session_token dans les métadonnées
        if (sessionMessages.length === 0) {
          console.log(`[useBotMessages] Tentative 2: Recherche par session_token dans metadata`);
          
          const { data: allMessages, error: metaError } = await supabase
            .from("chat_messages")
            .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent, metadata")
            .eq("bot_id", selectedBot.id)
            .order("created_at", { ascending: false })
            .limit(200);

          if (metaError) {
            console.error("[useBotMessages] Erreur requête par metadata :", metaError);
          } else if (allMessages) {
            console.log(`[useBotMessages] Messages récupérés pour filtrage: ${allMessages.length}`);
            
            // Filtrer par session_token
            const filteredMessages = allMessages.filter(msg => {
              if (msg.metadata && typeof msg.metadata === 'object') {
                const metadata = msg.metadata as any;
                const hasSessionToken = metadata.session_token === selectedSession.session_token ||
                                      metadata.sessionToken === selectedSession.session_token;
                
                if (hasSessionToken) {
                  console.log(`[useBotMessages] Message correspondant trouvé:`, msg.id);
                }
                
                return hasSessionToken;
              }
              return false;
            });
            
            if (filteredMessages.length > 0) {
              sessionMessages = filteredMessages.reverse(); // Remettre dans l'ordre chronologique
              console.log(`[useBotMessages] ✅ Messages trouvés par session_token: ${sessionMessages.length}`);
            } else {
              console.log(`[useBotMessages] ❌ Aucun message trouvé par session_token`);
            }
          }
        }

        // Stratégie 3: Recherche large pour les sessions récentes (fallback)
        if (sessionMessages.length === 0) {
          console.log(`[useBotMessages] Tentative 3: Recherche de tous les messages récents du bot`);
          
          const { data: recentMessages, error: recentError } = await supabase
            .from("chat_messages")
            .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent")
            .eq("bot_id", selectedBot.id)
            .order("created_at", { ascending: false })
            .limit(50);

          if (recentError) {
            console.error("[useBotMessages] Erreur requête messages récents :", recentError);
          } else if (recentMessages) {
            sessionMessages = recentMessages.reverse();
            console.log(`[useBotMessages] ⚠️ Affichage des messages récents (fallback): ${sessionMessages.length}`);
          }
        }

        // Stratégie 4: Créer un bot_user si aucun message n'existe
        if (sessionMessages.length === 0 && selectedSession.source_type === 'anonymous') {
          console.log(`[useBotMessages] Tentative 4: Création d'un bot_user pour session anonyme`);
          
          try {
            const { data: newBotUser, error: createError } = await supabase
              .from("bot_users")
              .insert({
                bot_id: selectedBot.id,
                session_id: selectedSession.session_token,
                user_name: `Visiteur ${selectedSession.session_token.slice(-8)}`,
                is_authenticated: false
              })
              .select()
              .single();

            if (createError) {
              console.error("[useBotMessages] Erreur création bot_user :", createError);
            } else {
              console.log(`[useBotMessages] ✅ Bot_user créé: ${newBotUser.id}`);
            }
          } catch (error) {
            console.log("[useBotMessages] Bot_user existe probablement déjà");
          }
        }

        console.log(`[useBotMessages] 🏁 RÉSULTAT FINAL: ${sessionMessages.length} messages`);
        setMessages(sessionMessages);

      } catch (error) {
        console.error("[useBotMessages] Erreur générale :", error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedSession, selectedBot]);

  return { messages, loadingMessages, setMessages };
};
