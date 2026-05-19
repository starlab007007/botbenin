import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Throttled activity tracking to avoid hammering the DB on every navigation
export const useActivityTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const lastLogged = useRef<{ path: string; at: number }>({ path: '', at: 0 });

  const logActivity = async (action: string, details?: any) => {
    if (!user) return;
    try {
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action,
        ip_address: 'client-side',
        user_agent: navigator.userAgent,
        details: details || {},
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (lastLogged.current.path === location.pathname && now - lastLogged.current.at < 30_000) return;
    lastLogged.current = { path: location.pathname, at: now };
    const schedule = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 500));
    schedule(() => logActivity('page_view', { path: location.pathname }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user?.id]);

  return { logActivity };
};
