import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Polls WAHA session status every `intervalMs` while `enabled` is true.
 * Returns `connected` when the WAHA session reaches WORKING/AUTHENTICATED/READY.
 *
 * Used by both QR-code and pair-code connection flows so we have a single
 * source of truth for "is the user successfully linked?".
 */
export function useWahaPairingStatus(
  sessionName: string | null | undefined,
  enabled: boolean,
  intervalMs = 3000,
) {
  const [connected, setConnected] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  useEffect(() => {
    setConnected(false);
    setLastStatus(null);
    if (!enabled || !sessionName) return;

    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      try {
        const { data, error } = await supabase.functions.invoke('waha-dashboard-proxy', {
          body: { path: `/api/sessions/${sessionName}`, method: 'GET' },
        });
        if (!error && data) {
          const s = (data as any).status;
          setLastStatus(s ?? null);
          if (s === 'WORKING' || s === 'AUTHENTICATED' || s === 'READY') {
            setConnected(true);
            stopped = true;
          }
        }
      } catch {
        /* swallow — keep polling */
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [sessionName, enabled, intervalMs]);

  return { connected, lastStatus };
}
