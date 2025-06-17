
import { supabase } from '@/integrations/supabase/client';

/**
 * Track visitor events
 */
export const trackVisitorEvent = async (
  sessionToken: string,
  eventType: string,
  eventData: any = {},
  pageUrl?: string,
  elementId?: string,
  elementClass?: string
) => {
  try {
    // Get session ID from token
    const { data: sessionData, error: sessionError } = await supabase
      .from('anonymous_visitor_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !sessionData) {
      console.error('[eventTracker] Session not found for token:', sessionToken);
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
    console.error('[eventTracker] Error tracking event:', error);
    return null;
  }
};
