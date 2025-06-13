
// Utility for automatic visitor authentication on public links

interface VisitorAuth {
  visitorId: string;
  sessionToken: string;
  isAuthenticated: boolean;
  createdAt: Date;
  expiresAt: Date;
}

// Generate a unique visitor ID
export const generateVisitorId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const browserFingerprint = getBrowserFingerprint();
  return `visitor_${timestamp}_${random}_${browserFingerprint}`;
};

// Generate browser fingerprint for uniqueness
const getBrowserFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('visitor-auth', 2, 2);
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL()
  };
  
  return btoa(JSON.stringify(fingerprint)).slice(0, 16);
};

// Generate session token
export const generateSessionToken = (): string => {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 15);
};

// Create or retrieve visitor authentication
export const createVisitorAuth = (botId: string): VisitorAuth => {
  const storageKey = `visitor_auth_${botId}`;
  const existingAuth = localStorage.getItem(storageKey);
  
  // Check if existing auth is valid and not expired
  if (existingAuth) {
    try {
      const parsed: VisitorAuth = JSON.parse(existingAuth);
      const now = new Date();
      const expiresAt = new Date(parsed.expiresAt);
      
      if (expiresAt > now) {
        console.log('Using existing visitor auth:', parsed.visitorId);
        return parsed;
      } else {
        console.log('Visitor auth expired, creating new one');
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('Invalid stored visitor auth, creating new one');
      localStorage.removeItem(storageKey);
    }
  }
  
  // Create new visitor authentication
  const visitorId = generateVisitorId();
  const sessionToken = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
  
  const visitorAuth: VisitorAuth = {
    visitorId,
    sessionToken,
    isAuthenticated: true,
    createdAt: now,
    expiresAt
  };
  
  // Store in localStorage
  localStorage.setItem(storageKey, JSON.stringify(visitorAuth));
  
  console.log('Created new visitor auth:', visitorId);
  return visitorAuth;
};

// Get current visitor authentication
export const getVisitorAuth = (botId: string): VisitorAuth | null => {
  const storageKey = `visitor_auth_${botId}`;
  const storedAuth = localStorage.getItem(storageKey);
  
  if (!storedAuth) return null;
  
  try {
    const parsed: VisitorAuth = JSON.parse(storedAuth);
    const now = new Date();
    const expiresAt = new Date(parsed.expiresAt);
    
    if (expiresAt > now) {
      return parsed;
    } else {
      localStorage.removeItem(storageKey);
      return null;
    }
  } catch (error) {
    localStorage.removeItem(storageKey);
    return null;
  }
};

// Clear visitor authentication
export const clearVisitorAuth = (botId: string): void => {
  const storageKey = `visitor_auth_${botId}`;
  localStorage.removeItem(storageKey);
};

// Check if visitor is authenticated
export const isVisitorAuthenticated = (botId: string): boolean => {
  const auth = getVisitorAuth(botId);
  return auth !== null && auth.isAuthenticated;
};

// Get visitor session data for API calls
export const getVisitorSessionData = (botId: string) => {
  const auth = getVisitorAuth(botId);
  if (!auth) return null;
  
  return {
    visitor_id: auth.visitorId,
    session_token: auth.sessionToken,
    is_visitor: true,
    authenticated: true,
    created_at: auth.createdAt.toISOString(),
    expires_at: auth.expiresAt.toISOString()
  };
};
