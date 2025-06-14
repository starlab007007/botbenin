
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBotUserId = (botId: string | null, sessionToken: string | null) => {
  const [botUserId, setBotUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBotUserId = async () => {
      if (!botId || !sessionToken) {
        setBotUserId(null);
        return;
      }
      setLoading(true);
      setError(null);
      
      console.log(`Fetching bot_user_id for bot ${botId} and session ${sessionToken}`);
      try {
        const { data, error } = await supabase
          .from('bot_users')
          .select('id')
          .eq('bot_id', botId)
          .eq('session_id', sessionToken)
          .single();

        if (error) {
          console.error('Error fetching bot_user_id:', error);
          setError(error.message);
          setBotUserId(null);
        } else if (data) {
          console.log('Fetched bot_user_id:', data.id);
          setBotUserId(data.id);
        } else {
          setBotUserId(null);
        }
      } catch (e: any) {
        setError(e.message);
        setBotUserId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBotUserId();
  }, [botId, sessionToken]);

  return { botUserId, loadingBotUserId: loading, errorBotUserId: error };
};
