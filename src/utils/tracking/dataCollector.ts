
import { supabase } from '@/integrations/supabase/client';

/**
 * Collect visitor data progressively
 */
export const collectVisitorData = async (
  sessionToken: string,
  dataType: string,
  dataValue: string,
  collectionMethod: string = 'chat',
  confidenceScore: number = 1.0
) => {
  try {
    // Get session ID from token
    const { data: sessionData, error: sessionError } = await supabase
      .from('anonymous_visitor_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !sessionData) {
      console.error('[dataCollector] Session not found for token:', sessionToken);
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
    console.error('[dataCollector] Error collecting data:', error);
    return null;
  }
};
