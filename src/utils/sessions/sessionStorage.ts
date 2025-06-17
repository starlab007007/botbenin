
/**
 * Secure session storage operations
 */
export const getCurrentVisitorSession = (): string | null => {
  try {
    const token = sessionStorage.getItem('visitor_session_token');
    
    if (token && typeof token === 'string' && token.startsWith('anon_') && token.length > 10) {
      console.log(`[sessionStorage] Retrieved valid session token: ${token.slice(0, 20)}...`);
      return token;
    }
    
    // Clean up invalid tokens
    if (token) {
      console.warn(`[sessionStorage] Removing invalid token: ${token}`);
      sessionStorage.removeItem('visitor_session_token');
    }
    
    return null;
  } catch (error) {
    console.error('[sessionStorage] Error getting session token:', error);
    return null;
  }
};

/**
 * Store session token securely
 */
export const storeVisitorSession = (token: string): void => {
  try {
    if (token && typeof token === 'string' && token.startsWith('anon_')) {
      sessionStorage.setItem('visitor_session_token', token);
      console.log(`[sessionStorage] Session token stored: ${token.slice(0, 20)}...`);
    } else {
      console.warn('[sessionStorage] Invalid token format, not storing:', token);
    }
  } catch (error) {
    console.error('[sessionStorage] Error storing session token:', error);
  }
};

/**
 * Clear session token
 */
export const clearVisitorSession = (): void => {
  try {
    sessionStorage.removeItem('visitor_session_token');
    console.log('[sessionStorage] Session token cleared');
  } catch (error) {
    console.error('[sessionStorage] Error clearing session token:', error);
  }
};
