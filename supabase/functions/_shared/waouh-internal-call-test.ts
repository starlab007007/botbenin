// E6 — une fonction interne absente n'est pas un refus métier ; E3 — l'écho précède l'exécution.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { classifyInternalFailure, shouldEchoBeforeExecute } from "./waouh-internal-call.ts";

Deno.test("succès : aucune défaillance", () => {
  assertEquals(classifyInternalFailure({ status: 200, ok: true, data: { ok: true } }), null);
});

Deno.test("E6 : fonction absente (404 NOT_FOUND de la passerelle) = dépendance manquante", () => {
  assertEquals(
    classifyInternalFailure({ status: 404, ok: false, data: { code: "NOT_FOUND", message: "Requested function was not found" } }),
    "dependency_missing",
  );
  assertEquals(
    classifyInternalFailure({ status: 404, ok: false, data: { message: "Requested function was not found" } }),
    "dependency_missing",
  );
});

Deno.test("E6 : réseau coupé ou passerelle en erreur = dépendance manquante", () => {
  assertEquals(classifyInternalFailure({ status: 0, ok: false, data: { error: "internal_call_failed" } }), "dependency_missing");
  assertEquals(classifyInternalFailure({ status: 502, ok: false, data: {} }), "dependency_missing");
  assertEquals(classifyInternalFailure({ status: 504, ok: false, data: {} }), "dependency_missing");
});

Deno.test("E6 : panne du moteur (5xx) distincte d'un refus métier (4xx)", () => {
  assertEquals(classifyInternalFailure({ status: 500, ok: false, data: { error: "boom" } }), "engine_error");
  assertEquals(classifyInternalFailure({ status: 409, ok: false, data: { error: "invalid_deal_transition" } }), "refused");
  assertEquals(classifyInternalFailure({ status: 403, ok: false, data: { error: "forbidden" } }), "refused");
});

Deno.test("E6 : un 404 métier (négociation introuvable) reste un refus, pas une dépendance manquante", () => {
  assertEquals(classifyInternalFailure({ status: 404, ok: false, data: { error: "negotiation not found" } }), "refused");
});

Deno.test("E3 : l'écho est écrit avant l'exécution quand le fil existe", () => {
  assertEquals(
    shouldEchoBeforeExecute({ hasThread: true, hasRole: true, echo: "Je confirme le paiement", freeTextKey: null, pending: null }),
    true,
  );
});

Deno.test("E3 : pas d'écho anticipé sans fil (premier contact) ni sans texte d'écho", () => {
  assertEquals(shouldEchoBeforeExecute({ hasThread: false, hasRole: true, echo: "Je le veux", freeTextKey: null, pending: null }), false);
  assertEquals(shouldEchoBeforeExecute({ hasThread: true, hasRole: false, echo: "Je le veux", freeTextKey: null, pending: null }), false);
  assertEquals(shouldEchoBeforeExecute({ hasThread: true, hasRole: true, echo: null, freeTextKey: null, pending: null }), false);
});

Deno.test("E3 : texte libre non exécuté = pas d'écho ; offre libre en attente = écho (comme avant)", () => {
  assertEquals(shouldEchoBeforeExecute({ hasThread: true, hasRole: true, echo: "x", freeTextKey: "not_understood", pending: null }), false);
  assertEquals(shouldEchoBeforeExecute({ hasThread: true, hasRole: true, echo: "x", freeTextKey: "confirm_money_action", pending: { action: "offer" } }), true);
});

import { isTickCaller } from "./waouh-internal-auth.ts";
Deno.test("appel planifié : secret du Vault accepté, tout le reste refusé", async () => {
  const good = "a".repeat(40);
  const sb = (ok: boolean, err: unknown = null) => ({ rpc: (_f: string, a: Record<string, unknown>) => Promise.resolve({ data: ok && a.p_secret === good, error: err }) });
  const req = (b: string | null) => ({ headers: { get: (n: string) => (n === "authorization" && b ? `Bearer ${b}` : null) } });
  assertEquals(await isTickCaller(req(good), sb(true)), true);
  assertEquals(await isTickCaller(req("b".repeat(40)), sb(true)), false);
  assertEquals(await isTickCaller(req("court"), sb(true)), false);
  assertEquals(await isTickCaller(req(null), sb(true)), false);
  assertEquals(await isTickCaller(req(good), sb(true, { message: "x" })), false);
  assertEquals(await isTickCaller(req(good), { rpc: () => { throw new Error("panne"); } }), false);
});
