
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BotSession {
  id: string;
  session_token: string;
  source_type: 'anonymous' | 'authenticated';
  bot_user_id?: string | null;
}

export const useManualMessageSender = (botId: string | null, session: BotSession | null) => {
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const sendManualMessage = async (messageContent: string, onSuccess?: () => void) => {
    if (!botId || !session || !messageContent.trim()) {
      return;
    }

    setSending(true);
    console.log(`[useManualMessageSender] Sending manual message for bot ${botId}, session ${session.session_token}`);

    try {
      // D'abord s'assurer qu'un bot_user existe pour cette session
      let botUserId = session.bot_user_id;

      if (!botUserId) {
        console.log(`[useManualMessageSender] No bot_user_id in session, finding or creating one`);
        
        // Chercher un bot_user existant
        const { data: botUserData, error: botUserError } = await supabase
          .from('bot_users')
          .select('id')
          .eq('bot_id', botId)
          .eq('session_id', session.session_token)
          .maybeSingle();

        if (botUserData?.id) {
          botUserId = botUserData.id;
          console.log(`[useManualMessageSender] Found existing bot_user: ${botUserId}`);
        } else {
          // Créer un nouveau bot_user
          const { data: newBotUser, error: createError } = await supabase
            .from('bot_users')
            .insert({
              bot_id: botId,
              session_id: session.session_token,
              user_name: `Anonymous User ${session.session_token.slice(-8)}`,
              is_authenticated: false
            })
            .select('id')
            .single();

          if (createError) {
            console.error('[useManualMessageSender] Error creating bot_user:', createError);
            throw createError;
          }

          if (newBotUser?.id) {
            botUserId = newBotUser.id;
            console.log(`[useManualMessageSender] Created new bot_user: ${botUserId}`);
          }
        }
      }

      if (!botUserId) {
        throw new Error('Impossible de créer ou trouver un bot_user pour cette session');
      }

      // Maintenant envoyer le message via la fonction RPC
      const { data, error } = await supabase.rpc('send_manual_bot_response', {
        p_bot_id: botId,
        p_session_token: session.session_token,
        p_message_content: messageContent.trim()
      });

      if (error) {
        console.error('[useManualMessageSender] Error:', error);
        throw error;
      }

      console.log('[useManualMessageSender] Message sent successfully:', data);
      
      toast({
        title: "Message envoyé",
        description: "Votre réponse a été envoyée avec succès.",
      });

      if (onSuccess) {
        onSuccess();
      }

      return data;
    } catch (error: any) {
      console.error('[useManualMessageSender] Exception:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer la réponse. Veuillez réessayer.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSending(false);
    }
  };

  return { sendManualMessage, sending };
};
