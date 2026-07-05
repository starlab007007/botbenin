// Global quota status tracker. Intercepts Supabase responses to detect
// HTTP 402 exceed_egress_quota and lets the UI show a degraded-mode banner
// instead of a cryptic "Erreur de connexion".

type Listener = (state: QuotaState) => void;

export type QuotaState = {
  blocked: boolean;
  reason: string | null;
  detectedAt: number | null;
};

let state: QuotaState = { blocked: false, reason: null, detectedAt: null };
const listeners = new Set<Listener>();

export function getQuotaState(): QuotaState {
  return state;
}

export function subscribeQuota(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function clearQuotaBlock() {
  if (!state.blocked) return;
  state = { blocked: false, reason: null, detectedAt: null };
  listeners.forEach((l) => l(state));
}

export function markQuotaBlocked(reason: string) {
  if (state.blocked) return;
  state = { blocked: true, reason, detectedAt: Date.now() };
  listeners.forEach((l) => l(state));
   
  console.warn('[quota] Supabase egress quota exceeded:', reason);
}

/**
 * Inspect a Response coming out of Supabase (REST or Functions). If the
 * project is service-restricted (typically HTTP 402 with body containing
 * `exceed_egress_quota` / "restricted"), flip global state.
 */
export async function inspectResponseForQuota(res: Response): Promise<void> {
  if (!res || res.ok) return;
  if (res.status !== 402 && res.status !== 403 && res.status !== 503) return;
  try {
    const clone = res.clone();
    const text = await clone.text();
    if (!text) return;
    const lower = text.toLowerCase();
    if (
      lower.includes('exceed_egress_quota') ||
      lower.includes('service for this project is restricted') ||
      (res.status === 402 && lower.includes('quota'))
    ) {
      markQuotaBlocked('exceed_egress_quota');
    }
  } catch {
    /* ignore */
  }
}
