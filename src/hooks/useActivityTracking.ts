import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useActivityTracking = () => {
  const location = useLocation();
  const { user } = useAuth();

  const logActivity = async (action: string, details?: any) => {
    if (!user) return;

    try {
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action,
        ip_address: 'client-side',
        user_agent: navigator.userAgent,
        details: details || {}
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Tracker la navigation
  useEffect(() => {
    if (user) {
      logActivity('page_view', { path: location.pathname });
    }
  }, [location.pathname, user?.id]);

  return { logActivity };
};
