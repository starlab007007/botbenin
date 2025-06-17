
import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a unique browser fingerprint
 */
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

/**
 * Get WebGL fingerprint
 */
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

/**
 * Get font fingerprint
 */
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

/**
 * Create or get visitor fingerprint from database
 */
export const createOrGetVisitorFingerprint = async (fingerprintHash: string) => {
  try {
    console.log('[fingerprint] Creating or getting visitor fingerprint', { fingerprintHash });
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
      console.error('[fingerprint] Error creating/getting fingerprint:', error);
      return { error: error.message || error.details || "Unknown error" };
    }
    
    return data;
  } catch (error: any) {
    console.error('[fingerprint] Exception creating fingerprint:', error);
    return { error: error?.message || JSON.stringify(error) };
  }
};
