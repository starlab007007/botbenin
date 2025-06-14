
import { BotSession } from './types';

// SESSION NORMALIZER
export function normalizeSession(s: any): BotSession {
  return {
    id: s.id,
    session_token: s.session_token,
    last_activity: s.last_activity,
    started_at: s.started_at,
    is_active: s.is_active,
    entry_point: s.entry_point,
    user_agent: typeof s.user_agent === "string" ? s.user_agent : null,
    ip_address:
      typeof s.ip_address === "string"
        ? s.ip_address
        : s.ip_address === null || s.ip_address === undefined
          ? null
          : String(s.ip_address),
    bot_user_id: typeof s.bot_user_id === "string" ? s.bot_user_id : null
  };
}

// Simple filter function to avoid deep type inference
export function filterSessions(sessions: BotSession[], query: string): BotSession[] {
  if (!Array.isArray(sessions) || !sessions.length) return [];
  if (!query) return sessions;
  
  const lowerQuery = query.toLowerCase();
  
  return sessions.filter(s => {
    const sessionToken = s.session_token?.toLowerCase() || '';
    const userAgent = s.user_agent?.toLowerCase() || '';
    const ipAddress = s.ip_address || '';
    
    return sessionToken.includes(lowerQuery) ||
           userAgent.includes(lowerQuery) ||
           ipAddress.includes(query);
  });
}

// Helper pour formater l'affichage utilisateur/session (anon/auth)
export const getSessionUserLabel = (session: BotSession) => {
  if (!session.bot_user_id) return "Visiteur anonyme";
  return "Utilisateur connecté";
};
