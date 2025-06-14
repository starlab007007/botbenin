
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBotUserId = (botId: string | null, sessionToken: string | null) => {
  const [botUserId, setBotUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndEnsureBotUser = async () => {
      if (!botId || !sessionToken) {
        console.log('[useBotUserId] Missing botId or sessionToken, clearing botUserId');
        setBotUserId(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      console.log(`[useBotUserId] Ensuring bot_user exists for bot ${botId} and session ${sessionToken}`);
      
      try {
        const { data, error: rpcError } = await supabase.rpc('create_bot_user_if_not_exists', {
          p_bot_id: botId,
          p_session_id: sessionToken
        });

        if (rpcError) {
          console.error('[useBotUserId] Error calling create_bot_user_if_not_exists RPC:', rpcError);
          setError(rpcError.message);
          setBotUserId(null);
        } else if (data) {
          console.log(`[useBotUserId] Ensured bot_user_id exists: ${data}`);
          setBotUserId(data);
        } else {
          console.log('[useBotUserId] No data returned from RPC');
          setError('Failed to get or create bot user.');
          setBotUserId(null);
        }
      } catch (e: any) {
        console.error('[useBotUserId] Exception in fetchAndEnsureBotUser:', e);
        setError(e.message);
        setBotUserId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAndEnsureBotUser();
  }, [botId, sessionToken]);

  return { botUserId, loadingBotUserId: loading, errorBotUserId: error };
};
