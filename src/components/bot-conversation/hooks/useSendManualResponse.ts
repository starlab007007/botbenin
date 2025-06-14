
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export const useSendManualResponse = (botId: string | null, sessionToken: string | null) => {
  const sendManualResponse = useCallback(async (messageContent: string) => {
    if (!botId || !sessionToken) {
      throw new Error('Bot ID and session token are required');
    }
    console.log(`Sending manual response for bot ${botId}, session ${sessionToken}`);

    try {
      const { data, error } = await supabase.rpc('send_manual_bot_response', {
        p_bot_id: botId,
        p_session_token: sessionToken,
        p_message_content: messageContent
      });

      if (error) {
        console.error('Error sending manual response:', error);
        throw new Error(error.message);
      }

      console.log('Manual response sent successfully', data);
      return data;
    } catch (err) {
      console.error('Error in sendManualResponse:', err);
      throw err;
    }
  }, [botId, sessionToken]);

  return { sendManualResponse };
};
