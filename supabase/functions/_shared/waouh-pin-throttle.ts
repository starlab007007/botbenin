// deno-lint-ignore-file no-explicit-any -- client Supabase non typé.
// WAOUH — Limitation des essais de PIN du pointage public (un PIN à 4 chiffres = 10 000 combinaisons).
// 5 échecs par matricule et 20 par client (adresse hachée) sur 15 minutes => verrou temporaire.

export const PIN_WINDOW_MS = 15 * 60_000;
export const PIN_MAX_FAILS_IDENTITY = 5;
export const PIN_MAX_FAILS_CLIENT = 20;

export interface LockDecision {
  locked: boolean;
  retryAfterSec: number;
  reason: "identity" | "client" | null;
}

/** Décision pure : `*Failures` = horodatages (ms) des échecs. Seuls ceux de la fenêtre comptent. */
export function decidePinLock(input: { identityFailures: number[]; clientFailures: number[]; now: number }): LockDecision {
  const inWindow = (list: number[]) => list.filter((t) => input.now - t < PIN_WINDOW_MS).sort((a, b) => a - b);
  const check = (list: number[], max: number, reason: "identity" | "client"): LockDecision | null => {
    if (list.length < max) return null;
    // Le verrou tombe quand l'échec le plus ancien qui compte sort de la fenêtre.
    const pivot = list[list.length - max];
    return { locked: true, retryAfterSec: Math.max(1, Math.ceil((pivot + PIN_WINDOW_MS - input.now) / 1000)), reason };
  };
  return check(inWindow(input.identityFailures), PIN_MAX_FAILS_IDENTITY, "identity")
    ?? check(inWindow(input.clientFailures), PIN_MAX_FAILS_CLIENT, "client")
    ?? { locked: false, retryAfterSec: 0, reason: null };
}

/** Adresse du client (première valeur de x-forwarded-for) ; « unknown » si absente. */
export function clientAddress(headers: { get(name: string): string | null }): string {
  const forwarded = (headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return forwarded || headers.get("cf-connecting-ip") || headers.get("x-real-ip") || "unknown";
}

const sinceIso = (now: number) => new Date(now - PIN_WINDOW_MS).toISOString();

async function times(query: any): Promise<number[]> {
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => Date.parse(row.failed_at)).filter(Number.isFinite);
}

/**
 * Verrou en vigueur ? En cas de table absente ou d'erreur, on journalise fort et on laisse passer :
 * la disponibilité du pointage prime, la migration 20260929140000 est un prérequis de déploiement.
 */
export async function currentPinLock(admin: any, siteId: string, employeeCode: string, clientHash: string, now = Date.now()): Promise<LockDecision> {
  try {
    const since = sinceIso(now);
    const [identityFailures, clientFailures] = await Promise.all([
      times(admin.from("waouh_presence_pin_attempts").select("failed_at").eq("site_id", siteId).eq("employee_code", employeeCode).gte("failed_at", since).limit(50)),
      times(admin.from("waouh_presence_pin_attempts").select("failed_at").eq("client_hash", clientHash).gte("failed_at", since).limit(100)),
    ]);
    return decidePinLock({ identityFailures, clientFailures, now });
  } catch (error) {
    console.error("[pin-throttle] lecture impossible : PROTECTION INACTIVE", error);
    return { locked: false, retryAfterSec: 0, reason: null };
  }
}

export async function recordPinFailure(admin: any, siteId: string, employeeCode: string, clientHash: string): Promise<void> {
  try {
    await admin.from("waouh_presence_pin_attempts").insert({ site_id: siteId, employee_code: employeeCode, client_hash: clientHash });
    // Purge opportuniste : les échecs de plus d'un jour ne servent plus.
    await admin.from("waouh_presence_pin_attempts").delete().lt("failed_at", new Date(Date.now() - 24 * 3600_000).toISOString());
  } catch (error) {
    console.error("[pin-throttle] enregistrement impossible : PROTECTION INACTIVE", error);
  }
}

export async function clearPinFailures(admin: any, siteId: string, employeeCode: string): Promise<void> {
  try {
    await admin.from("waouh_presence_pin_attempts").delete().eq("site_id", siteId).eq("employee_code", employeeCode);
  } catch (error) {
    console.error("[pin-throttle] purge impossible", error);
  }
}
