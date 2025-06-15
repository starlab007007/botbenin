import { supabase } from '@/integrations/supabase/client';

// Générer un fingerprint unique du navigateur
export const generateBrowserFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 2, 2);
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvas.toDataURL(),
    webgl: getWebGLFingerprint(),
    fonts: getFontFingerprint()
  };
  
  return btoa(JSON.stringify(fingerprint)).slice(0, 32);
};

const getWebGLFingerprint = (): string => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    
    // Fix: Cast to WebGLRenderingContext to access WebGL methods
    const webglContext = gl as WebGLRenderingContext;
    const renderer = webglContext.getParameter(webglContext.RENDERER);
    const vendor = webglContext.getParameter(webglContext.VENDOR);
    return `${vendor}-${renderer}`;
  } catch {
    return 'webgl-error';
  }
};

const getFontFingerprint = (): string => {
  const fonts = ['Arial', 'Helvetica', 'Times', 'Courier', 'Verdana', 'Georgia', 'Palatino'];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'no-fonts';
  
  return fonts.map(font => {
    ctx.font = `12px ${font}`;
    const width = ctx.measureText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').width;
    return `${font}:${width}`;
  }).join(',');
};

// Créer ou récupérer un fingerprint de visiteur
export const createOrGetVisitorFingerprint = async (fingerprintHash: string) => {
  try {
    console.log('[visitorTracking] Appel createOrGetVisitorFingerprint', { fingerprintHash });
    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack
    };
    const screenInfo = {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: screen.orientation?.type
    };
    const { data, error } = await supabase.rpc('create_or_get_visitor_fingerprint', {
      p_fingerprint_hash: fingerprintHash,
      p_browser_info: browserInfo,
      p_screen_info: screenInfo,
      p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      p_language: navigator.language,
      p_platform: navigator.platform,
      p_user_agent: navigator.userAgent
    });
    if (error) {
      console.error('[visitorTracking] Erreur createOrGetVisitorFingerprint:', error);
      return { error: error.message || error.details || "Unknown error" };
    }
    return data;
  } catch (error: any) {
    console.error('Erreur (catch) lors de la création du fingerprint:', error);
    return { error: error?.message || JSON.stringify(error) };
  }
};

// Créer une session de visiteur anonyme avec token unifié
export const createAnonymousVisitorSession = async (
  fingerprintId: string,
  botId: string,
  entryPoint: string = 'direct',
  referrerUrl?: string,
  utmParams?: { source?: string; medium?: string; campaign?: string }
): Promise<string | { error: string }> => {
  try {
    console.log(`[visitorTracking] Creating anonymous session for bot ${botId}, entry: ${entryPoint}`, {
      fingerprintId,
      referrerUrl,
      utmParams
    });
    const { data, error } = await supabase.rpc('create_anonymous_visitor_session', {
      p_fingerprint_id: fingerprintId,
      p_bot_id: botId,
      p_entry_point: entryPoint,
      p_referrer_url: referrerUrl || document.referrer,
      p_utm_source: utmParams?.source,
      p_utm_medium: utmParams?.medium,
      p_utm_campaign: utmParams?.campaign,
      p_ip_address: null // Sera géré côté serveur si nécessaire
    });
    if (error) {
      console.error('[visitorTracking] Erreur createAnonymousVisitorSession:', error);
      return { error: error.message || error.details || "Unknown error" };
    }
    console.log(`[visitorTracking] Session created with token: ${data}`);
    return data;
  } catch (error: any) {
    console.error('Erreur (catch) lors de la création de la session:', error);
    return { error: error?.message || JSON.stringify(error) };
  }
};

// Enregistrer un événement de tracking
export const trackVisitorEvent = async (
  sessionToken: string,
  eventType: string,
  eventData: any = {},
  pageUrl?: string,
  elementId?: string,
  elementClass?: string
) => {
  try {
    // Récupérer l'ID de session depuis le token
    const { data: sessionData, error: sessionError } = await supabase
      .from('anonymous_visitor_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !sessionData) {
      console.error('Session non trouvée pour le token:', sessionToken);
      return null;
    }

    const { data, error } = await supabase.rpc('track_visitor_event', {
      p_session_id: sessionData.id,
      p_event_type: eventType,
      p_event_data: eventData,
      p_page_url: pageUrl || window.location.href,
      p_element_id: elementId,
      p_element_class: elementClass
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors du tracking de l\'événement:', error);
    return null;
  }
};

// Collecter progressivement les données des visiteurs
export const collectVisitorData = async (
  sessionToken: string,
  dataType: string,
  dataValue: string,
  collectionMethod: string = 'chat',
  confidenceScore: number = 1.0
) => {
  try {
    // Récupérer l'ID de session depuis le token
    const { data: sessionData, error: sessionError } = await supabase
      .from('anonymous_visitor_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !sessionData) {
      console.error('Session non trouvée pour le token:', sessionToken);
      return null;
    }

    const { data, error } = await supabase.rpc('collect_visitor_data', {
      p_session_id: sessionData.id,
      p_data_type: dataType,
      p_data_value: dataValue,
      p_collection_method: collectionMethod,
      p_confidence_score: confidenceScore
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de la collecte des données:', error);
    return null;
  }
};

// Extraire les paramètres UTM de l'URL
export const extractUTMParams = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    source: urlParams.get('utm_source'),
    medium: urlParams.get('utm_medium'),
    campaign: urlParams.get('utm_campaign'),
    term: urlParams.get('utm_term'),
    content: urlParams.get('utm_content')
  };
};

// Hook pour initialiser le tracking des visiteurs avec token unifié - VERSION AMÉLIORÉE
export const initializeVisitorTracking = async (botId: string, entryPoint?: string): Promise<string | null> => {
  try {
    // Defensive: always remove obviously invalid existing tokens
    const existingToken = getCurrentVisitorSession();
    if (existingToken && typeof existingToken === "string" && existingToken.startsWith('anon_') && existingToken.length > 10) {
      return existingToken;
    }
    // Always clean up sessionStorage if we get here (infinite loop protection)
    sessionStorage.removeItem('visitor_session_token');

    const fingerprintHash = generateBrowserFingerprint();
    const fingerprintResult = await createOrGetVisitorFingerprint(fingerprintHash);

    if (typeof fingerprintResult === 'object' && fingerprintResult !== null && 'error' in fingerprintResult) {
      const errorMsg = `[visitorTracking] Failed to create/get fingerprint: ${fingerprintResult.error || 'Unknown error'}`;
      sessionStorage.removeItem('visitor_session_token');
      return errorMsg;
    }

    if (typeof fingerprintResult !== 'string' || !fingerprintResult) {
      const errorMsg = `[visitorTracking] Failed to create/get fingerprint: received invalid result: ${fingerprintResult}`;
      sessionStorage.removeItem('visitor_session_token');
      return errorMsg;
    }

    const utmParams = extractUTMParams();
    const finalEntryPoint = entryPoint || (document.referrer ? 'referral' : 'direct');

    const sessionTokenResult = await createAnonymousVisitorSession(
      fingerprintResult,
      botId,
      finalEntryPoint,
      document.referrer,
      utmParams
    );

    if (typeof sessionTokenResult === 'object' && sessionTokenResult !== null && 'error' in sessionTokenResult) {
      const errorMsg = `[visitorTracking] Failed to create session: ${sessionTokenResult.error || 'Unknown error'}`;
      sessionStorage.removeItem('visitor_session_token');
      return errorMsg;
    }
    if (typeof sessionTokenResult !== 'string' || !sessionTokenResult.startsWith('anon_')) {
      const errorMsg = `[visitorTracking] Failed to create session: received invalid token: ${sessionTokenResult}`;
      sessionStorage.removeItem('visitor_session_token');
      return errorMsg;
    }
    const token: string = sessionTokenResult;
    sessionStorage.setItem('visitor_session_token', token);

    await trackVisitorEvent(
      token,
      'session_start',
      {
        url: window.location.href,
        utm_params: utmParams,
        fingerprint_hash: fingerprintHash,
        bot_id: botId,
        entry_point: finalEntryPoint
      }
    );

    return token;

  } catch (error: any) {
    sessionStorage.removeItem('visitor_session_token');
    return 'Erreur lors de l\'initialisation du tracking: ' + (error?.message ? error.message : JSON.stringify(error));
  }
};

// Récupérer le token de session unifié - VERSION SÉCURISÉE
export const getCurrentVisitorSession = (): string | null => {
  try {
    const token = sessionStorage.getItem('visitor_session_token');
    if (token && typeof token === 'string' && token.startsWith('anon_') && token.length > 10) {
      console.log(`[visitorTracking] Retrieved valid session token: ${token}`);
      return token;
    }
    
    // Nettoyer les tokens invalides
    if (token) {
      console.warn(`[visitorTracking] Removing invalid token: ${token}`);
      sessionStorage.removeItem('visitor_session_token');
    }
    
    return null;
  } catch (error) {
    console.error('[visitorTracking] Error getting session token:', error);
    return null;
  }
};
