// WAOUH — Appels internes entre edge functions (module pur, aucun accès base).
//
// waouh-commerce-action délègue à waouh-negotiation-router et waouh-deal-ops.
// Avant ce module, toute réponse non-OK du routeur devenait « Action
// indisponible » (out_of_stage) : une fonction absente (404 de la passerelle)
// ou en panne était présentée à l'utilisateur comme un refus métier, sans trace
// exploitable. classifyInternalFailure sépare ces cas.
// Testé par waouh-internal-call-test.ts.

export interface InternalResult {
  status: number;
  ok: boolean;
  data: any;
}

export type InternalFailure = "dependency_missing" | "engine_error" | "refused";

/** null = succès. Sinon : dépendance absente/injoignable, panne du moteur, ou refus métier. */
export function classifyInternalFailure(r: InternalResult): InternalFailure | null {
  if (r.ok) return null;
  const data = (r.data && typeof r.data === "object") ? r.data : {};
  const code = String((data as any).code ?? "");
  const message = String((data as any).message ?? (data as any).error ?? "");
  // Passerelle Supabase : « Requested function was not found » (NOT_FOUND).
  if (r.status === 404 && (code === "NOT_FOUND" || /requested function was not found/i.test(message))) {
    return "dependency_missing";
  }
  // Pas de réponse (réseau) ou passerelle en erreur.
  if (r.status === 0 || r.status === 502 || r.status === 504) return "dependency_missing";
  if (r.status >= 500) return "engine_error";
  return "refused";
}

/**
 * L'écho de l'action de l'utilisateur (« Je confirme le paiement ») doit être écrit
 * AVANT l'exécution quand le fil existe déjà : les moteurs (waouh-deal-ops) écrivent
 * leurs réponses pendant l'exécution, et un fil trié par date afficherait sinon la
 * réponse avant l'action qui l'a déclenchée. Sans fil (premier contact), l'écho reste
 * écrit après, une fois le fil créé.
 */
export function shouldEchoBeforeExecute(input: {
  hasThread: boolean;
  hasRole: boolean;
  echo: string | null | undefined;
  freeTextKey: string | null | undefined;
  pending: unknown;
}): boolean {
  if (!input.hasThread || !input.hasRole || !input.echo) return false;
  return !input.freeTextKey || !!input.pending;
}
