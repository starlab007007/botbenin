
import { supabase } from "@/integrations/supabase/client";

// Core strategies are exported as independent functions to keep code in useBotMessages simple and testable.
// All return arrays of messages, or [] if nothing found.

export async function messagesByBotUserId(botId: string, botUserId: string) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent, metadata")
    .eq("bot_id", botId)
    .eq("bot_user_id", botUserId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data;
}

function isMetadataWithSessionToken(obj: unknown): obj is { session_token?: string; sessionToken?: string } {
  // Ensure it's a non-null object, not an array, not null
  return (
    typeof obj === "object" &&
    obj !== null &&
    !Array.isArray(obj) &&
    (
      // At least session_token or sessionToken exists and is a string (optional)
      ("session_token" in obj && typeof (obj as any).session_token === "string") ||
      ("sessionToken" in obj && typeof (obj as any).sessionToken === "string")
    )
  );
}

export async function messagesBySessionTokenMetadata(botId: string, sessionToken: string) {
  // Scan latest 500 by created_at, filter by metadata.session_token or metadata.sessionToken
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent, metadata")
    .eq("bot_id", botId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error || !data) return [];
  return data
    .filter(msg => 
      isMetadataWithSessionToken(msg.metadata) && 
      (
        msg.metadata.session_token === sessionToken ||
        msg.metadata.sessionToken === sessionToken
      )
    )
    .reverse();
}

export async function messagesByRecent(botId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, message_content, created_at, message_type, bot_user_id, ip_address, user_agent, metadata")
    .eq("bot_id", botId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data;
}
