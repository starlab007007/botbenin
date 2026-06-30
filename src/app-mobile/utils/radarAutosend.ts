// Helpers shared between the Radar (RadarPanel) and the chat screen
// (WaouhChatScreen) so the autosend pipeline can be unit-tested and stays
// strictly identical to the canonical "buyer-interest" flow used by
// StatusCard (waouh-buyer-interest edge function).

export type RadarIntent = "interest" | "negotiate" | "buy";

export const RADAR_DEDUP_WINDOW_MS = 30_000;
export const RADAR_PAUSE_REASON_KEY = "waouh_radar_pause_reason";

export function radarDedupKey(article: string, intent: RadarIntent) {
  return `waouh_radar_lastsend_${article}_${intent}`;
}

/**
 * Returns whether a fresh autosend is allowed for (article, intent).
 * When fresh, marks the timestamp so subsequent attempts within the
 * RADAR_DEDUP_WINDOW_MS are blocked.
 */
export function checkAndMarkRadarSend(
  article: string,
  intent: RadarIntent,
  now: number = Date.now(),
  storage: Storage = sessionStorage,
): { fresh: boolean; lastSentAt: number; remainingMs: number } {
  const key = radarDedupKey(article, intent);
  const last = Number(storage.getItem(key) || 0);
  const elapsed = now - last;
  const fresh = elapsed >= RADAR_DEDUP_WINDOW_MS;
  if (fresh) storage.setItem(key, String(now));
  return {
    fresh,
    lastSentAt: last,
    remainingMs: fresh ? 0 : Math.max(0, RADAR_DEDUP_WINDOW_MS - elapsed),
  };
}

export function buildRadarInterestMessage(opts: {
  title: string;
  intent: RadarIntent;
  article?: string;
  distance?: string;
  price?: string | number;
  devise?: string;
}) {
  const { title, intent, article = "", distance = "", price = "", devise = "FCFA" } = opts;
  const priceLabel = price ? ` (~${price} ${devise})` : "";
  return (
    `👋 Intéressé par "${title}"${distance ? ` vu sur Radar WAOUH à ${distance}` : ""}` +
    `${priceLabel}. Est-il toujours disponible ?` +
    `\n\n#radar #${intent}${article ? ` #article:${article}` : ""}`
  );
}

export type RadarPauseReason = {
  kind: "autosend" | "duplicate" | "visibility" | "timeout";
  title?: string;
  intent?: RadarIntent;
  at: number; // epoch ms
};

export function setRadarPauseReason(reason: RadarPauseReason, storage: Storage = sessionStorage) {
  try { storage.setItem(RADAR_PAUSE_REASON_KEY, JSON.stringify(reason)); } catch {}
}
export function readRadarPauseReason(storage: Storage = sessionStorage): RadarPauseReason | null {
  try {
    const raw = storage.getItem(RADAR_PAUSE_REASON_KEY);
    return raw ? JSON.parse(raw) as RadarPauseReason : null;
  } catch { return null; }
}
export function clearRadarPauseReason(storage: Storage = sessionStorage) {
  try { storage.removeItem(RADAR_PAUSE_REASON_KEY); } catch {}
}
