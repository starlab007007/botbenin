// Gouverneur d'envoi WhatsApp : toutes les fonctions qui écrivent au nom du numéro central
// demandent d'abord l'autorisation ici (quotas, rythme, plage horaire, arrêt automatique).
export type GovernorKind = "cold" | "transactional";
export type GovernorDecision = { allowed: boolean; id?: string; reason?: string; retry_after_s?: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Prospection / contacts froids = soumis aux quotas. Réponses et suivis = prioritaires. */
export function governorKindFor(template: string | null | undefined, payload?: any): GovernorKind {
  const t = String(template || "");
  if (t === "nexus_discovery_outreach") return payload?.request_id ? "transactional" : "cold";
  if (t.startsWith("radar_")) return "cold";
  return "transactional";
}

export async function governorTake(sb: any, kind: GovernorKind, phone?: string | null): Promise<GovernorDecision> {
  try {
    const { data, error } = await sb.rpc("waouh_wa_governor_take", { p_kind: kind, p_phone: phone || null });
    if (error || !data) throw error || new Error("empty");
    return data as GovernorDecision;
  } catch (e) {
    console.error("[wa-governor] unavailable", e);
    // Par prudence : l'envoi à froid attend, les messages prioritaires partent.
    return kind === "cold" ? { allowed: false, reason: "governor_unavailable", retry_after_s: 300 } : { allowed: true };
  }
}

/** Comme governorTake, mais attend l'écart de rythme quand il est court et que le temps le permet. */
export async function governorTakeWait(sb: any, kind: GovernorKind, phone: string | null | undefined, budgetMs: number): Promise<GovernorDecision> {
  let d = await governorTake(sb, kind, phone);
  const started = Date.now();
  while (!d.allowed && d.reason === "spacing" && (d.retry_after_s ?? 99) <= 30 &&
    Date.now() - started + ((d.retry_after_s ?? 0) + 1) * 1000 < budgetMs) {
    await sleep(((d.retry_after_s ?? 1) + 1) * 1000);
    d = await governorTake(sb, kind, phone);
  }
  return d;
}

export async function governorRecord(sb: any, id: string | undefined, outcome: "sent" | "failed" | "released", error?: string) {
  if (!id) return;
  try { await sb.rpc("waouh_wa_governor_record", { p_id: id, p_outcome: outcome, p_error: error || null }); } catch (_) { /* best-effort */ }
}

/** Échec fournisseur (session, moteur, réseau) = compte dans le taux d'échec ; le reste est « libéré ». */
export function isProviderFailure(message: string, transient: boolean) {
  return transient || /WAHA (404|5\d\d)|timed out|timeout|fetch failed|ECONN/i.test(message);
}

export function retryAtIso(d: GovernorDecision) {
  return new Date(Date.now() + Math.min(3600, Math.max(30, d.retry_after_s ?? 300)) * 1000).toISOString();
}
