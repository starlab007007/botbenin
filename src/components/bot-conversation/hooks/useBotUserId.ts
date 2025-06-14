
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBotUserId = (botId: string | null, sessionToken: string | null) => {
  const [botUserId, setBotUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBotUserId = async () => {
      if (!botId || !sessionToken) {
        console.log('[useBotUserId] Missing botId or sessionToken, clearing botUserId');
        setBotUserId(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      console.log(`[useBotUserId] Fetching bot_user_id for bot ${botId} and session ${sessionToken}`);
      
      try {
        const { data, error } = await supabase
          .from('bot_users')
          .select('id')
          .eq('bot_id', botId)
          .eq('session_id', sessionToken)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            console.warn('[useBotUserId] No bot_user found, this might be expected for new sessions');
            setError('No bot user found for this session');
          } else {
            console.error('[useBotUserId] Error fetching bot_user_id:', error);
            setError(error.message);
          }
          setBotUserId(null);
        } else if (data) {
          console.log(`[useBotUserId] Found bot_user_id: ${data.id}`);
          setBotUserId(data.id);
        } else {
          console.log('[useBotUserId] No data returned');
          setBotUserId(null);
        }
      } catch (e: any) {
        console.error('[useBotUserId] Exception in fetchBotUserId:', e);
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
