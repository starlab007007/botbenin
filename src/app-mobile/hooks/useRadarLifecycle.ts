import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Manages the auto-pause / resume lifecycle of the Radar.
 *
 * The Radar performs a one-shot scan, then waits `autoPauseMs` before
 * pausing the visual sweep. The user can manually resume to relaunch
 * a fresh scan. Tab visibility also pauses to save bandwidth.
 */
export function useRadarLifecycle({
  autoPauseMs,
  onResume,
  scanKey,
}: {
  autoPauseMs: number | null; // null = never
  onResume: () => void; // called when user taps "Relancer"
  scanKey: number; // bump this when a new scan starts/finishes
}) {
  const [paused, setPaused] = useState(false);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);

  const clearAll = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  // Start / reset the auto-pause countdown after each (re)scan.
  useEffect(() => {
    clearAll();
    setPaused(false);
    if (!autoPauseMs) { setCountdownMs(null); return; }
    deadlineRef.current = Date.now() + autoPauseMs;
    setCountdownMs(autoPauseMs);
    intervalRef.current = setInterval(() => {
      if (!deadlineRef.current) return;
      const ms = Math.max(0, deadlineRef.current - Date.now());
      setCountdownMs(ms);
      if (ms <= 0) {
        clearAll();
        setPaused(true);
      }
    }, 500);
    timerRef.current = setTimeout(() => {
      clearAll();
      setPaused(true);
      setCountdownMs(0);
    }, autoPauseMs);
    return clearAll;
  }, [autoPauseMs, scanKey]);

  // Pause when the tab/page is hidden (battery + data).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        clearAll();
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    onResume();
  }, [onResume]);

  const pauseNow = useCallback(() => {
    clearAll();
    setPaused(true);
  }, []);

  return { paused, countdownMs, resume, pauseNow };
}
