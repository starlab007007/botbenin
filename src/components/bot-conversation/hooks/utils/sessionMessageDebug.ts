
import type { BotSession } from "../useBotMessages";

/**
 * Mapping de debug: pour chaque message "recent", indique s'il correspond à la session donnée
 * - par 'bot_user_id'
 * - par match sur la metadata 'session_token' ou 'sessionToken'
 */
export function mapSessionToMessages(session: BotSession, messages: Array<any>) {
  if (!session || !messages || !Array.isArray(messages)) return [];
  const sessionToken = session.session_token;
  const botUserId = session.bot_user_id;

  return messages.map(msg => {
    let matches = [];
    if (botUserId && msg.bot_user_id && msg.bot_user_id === botUserId) {
      matches.push("by_bot_user_id");
    }
    if (msg.metadata && typeof msg.metadata === "object") {
      if (msg.metadata.session_token === sessionToken) matches.push("by_metadata_session_token");
      if (msg.metadata.sessionToken === sessionToken) matches.push("by_metadata_sessionToken");
    }
    return {
      id: msg.id,
      created_at: msg.created_at,
      bot_user_id: msg.bot_user_id,
      snippet: msg.message_content?.slice(0, 35),
      matches
    };
  });
}
