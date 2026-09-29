// WAOUH — Boutons d'une notification (module pur, aucun accès base).
//
// waouh-deal-open calcule les boutons de décision du vendeur (Accepter /
// Contre-offre / Refuser) et les envoie à waouh-notify-dispatch. Le dispatcheur
// les ignorait (`actions: []` codé en dur) : le vendeur recevait « Nouvel
// acheteur » sans aucun moyen de répondre. Ces fonctions valident et
// transmettent les boutons jusqu'au message du fil et à la file WhatsApp.
// Testé par waouh-notify-actions-test.ts.

export interface NotifyAction {
  id: string;
  label: string;
}

const MAX_ACTIONS = 5;
const MAX_ID = 120;
const MAX_LABEL = 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Boutons valides uniquement : {id, label} non vides, tronqués, dédoublonnés, 5 au plus. */
export function sanitizeActions(raw: unknown): NotifyAction[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: NotifyAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id.trim().slice(0, MAX_ID) : "";
    const label = typeof rec.label === "string" ? rec.label.trim().slice(0, MAX_LABEL) : "";
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label });
    if (out.length >= MAX_ACTIONS) break;
  }
  return out;
}

/** Identifiant uuid valide ou null (jamais de valeur libre dans les clés de déduplication). */
export function optionalUuid(raw: unknown): string | null {
  return typeof raw === "string" && UUID_RE.test(raw.trim()) ? raw.trim().toLowerCase() : null;
}

/** Boutons à écrire dans la file sortante : ceux de l'appelant, sinon aucun. */
export function actionsOrEmpty(payloadExtra: unknown): NotifyAction[] {
  const actions = (payloadExtra && typeof payloadExtra === "object")
    ? (payloadExtra as Record<string, unknown>).actions
    : null;
  return sanitizeActions(actions);
}
