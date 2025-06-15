
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
