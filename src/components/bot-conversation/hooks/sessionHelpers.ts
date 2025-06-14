
import { supabase } from "@/integrations/supabase/client";

// Try to resolve bot_user_id by session_token for a given bot
export async function findBotUserIdFromSession(botId: string, sessionToken: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("bot_users")
    .select("id")
    .eq("bot_id", botId)
    .eq("session_id", sessionToken)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}
