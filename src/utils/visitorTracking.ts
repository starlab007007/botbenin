
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
    
    const renderer = gl.getParameter(gl.RENDERER);
    const vendor = gl.getParameter(gl.VENDOR);
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
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de la création du fingerprint:', error);
    return null;
  }
};

// Créer une session de visiteur anonyme
export const createAnonymousVisitorSession = async (
  fingerprintId: string,
  botId: string,
  entryPoint: string = 'direct',
  referrerUrl?: string,
  utmParams?: { source?: string; medium?: string; campaign?: string }
) => {
  try {
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
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    return null;
  }
};

// Enregistrer un événement de tracking
export const trackVisitorEvent = async (
  sessionId: string,
  eventType: string,
  eventData: any = {},
  pageUrl?: string,
  elementId?: string,
  elementClass?: string
) => {
  try {
    const { data, error } = await supabase.rpc('track_visitor_event', {
      p_session_id: sessionId,
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
  sessionId: string,
  dataType: string,
  dataValue: string,
  collectionMethod: string = 'chat',
  confidenceScore: number = 1.0
) => {
  try {
    const { data, error } = await supabase.rpc('collect_visitor_data', {
      p_session_id: sessionId,
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

// Hook pour initialiser le tracking des visiteurs
export const initializeVisitorTracking = async (botId: string, entryPoint?: string) => {
  try {
    // Générer le fingerprint
    const fingerprintHash = generateBrowserFingerprint();
    
    // Créer ou récupérer le fingerprint
    const fingerprintId = await createOrGetVisitorFingerprint(fingerprintHash);
    if (!fingerprintId) return null;
    
    // Extraire les paramètres UTM
    const utmParams = extractUTMParams();
    
    // Déterminer le point d'entrée
    const finalEntryPoint = entryPoint || (document.referrer ? 'referral' : 'direct');
    
    // Créer la session de visiteur
    const sessionId = await createAnonymousVisitorSession(
      fingerprintId,
      botId,
      finalEntryPoint,
      document.referrer,
      utmParams
    );
    
    if (sessionId) {
      // Stocker l'ID de session dans le localStorage
      localStorage.setItem('visitor_session_id', sessionId);
      
      // Enregistrer l'événement de début de session
      await trackVisitorEvent(sessionId, 'session_start', {
        url: window.location.href,
        utm_params: utmParams,
        fingerprint_hash: fingerprintHash
      });
    }
    
    return sessionId;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation du tracking:', error);
    return null;
  }
};

// Récupérer l'ID de session actuel
export const getCurrentVisitorSession = (): string | null => {
  return localStorage.getItem('visitor_session_id');
};
