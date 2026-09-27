import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));

import {
  __resetCommerceActionCache,
  commerceRequestFromButton,
  latestStage,
  sendCommerceAction,
  stageFromWorkflow,
  suggestCounterPrice,
} from "../commerceAction";

const NEG = "a1b2c3d4-0000-4000-8000-00000000abcd";
const DEAL = "0f9e8d7c-1111-4111-8111-111111111111";
const ART = "3f2c1b0a-0000-4000-8000-00000000a001";

describe("parcours v3 — client Web", () => {
  beforeEach(() => {
    invoke.mockReset();
    __resetCommerceActionCache();
  });

  it("traduit les boutons serveur en actions du contrat", () => {
    expect(commerceRequestFromButton(`accepter:${NEG}`)).toMatchObject({ action: "accept", negotiation_id: NEG });
    expect(commerceRequestFromButton(`refuser:${NEG}`)).toMatchObject({ action: "reject" });
    expect(commerceRequestFromButton(`je-veux:${ART}`)).toMatchObject({ action: "open_deal", article_id: ART });
    expect(commerceRequestFromButton(`payer-mobile:${DEAL}`)).toMatchObject({ action: "pay_mode", method: "mobile_money" });
    expect(commerceRequestFromButton(`paiement-livraison:${DEAL}`)).toMatchObject({ action: "pay_mode", method: "cash" });
    expect(commerceRequestFromButton(`confirmer-paiement-cash:${DEAL}`)).toMatchObject({ action: "confirm_payment", method: "cash" });
    expect(commerceRequestFromButton(`annuler:${DEAL}`)).toMatchObject({ action: "cancel", deal_id: DEAL });
    // Saisie libre dans le composeur : pas d'action directe.
    expect(commerceRequestFromButton(`contre-proposition:${NEG}`)).toBeNull();
    expect(commerceRequestFromButton("intéressé 1")).toBeNull();
  });

  it("déduit l'étape du parcours (7 étapes)", () => {
    expect(stageFromWorkflow("countered")).toBe("negotiation");
    expect(stageFromWorkflow("awaiting_confirmation")).toBe("agreement");
    expect(stageFromWorkflow("pending-assignment")).toBe("preparation");
    expect(stageFromWorkflow("picked_up")).toBe("courier");
    expect(stageFromWorkflow("completed")).toBe("payment");
    expect(stageFromWorkflow("n'importe quoi")).toBeNull();
    expect(latestStage([{ meta: { workflow_state: "proposed" } }, { meta: { stage: "agreement" } }, { meta: {} }])).toBe("agreement");
  });

  it("prix suggéré arrondi à 25 FCFA", () => {
    expect(suggestCounterPrice({ currentOffer: 2500, ownLastOffer: 2000 })).toBe(2250);
    expect(suggestCounterPrice({ currentOffer: 2500 })).toBe(2250);
    expect(suggestCounterPrice({ listPrice: 10_000 })).toBe(9000);
    expect(suggestCounterPrice({})).toBeNull();
  });

  it("interrupteur coupé : repli silencieux sur l'ancien chemin, sans réessayer pendant une minute", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { context: { status: 503 } } });
    expect(await sendCommerceAction({ action: "accept", negotiation_id: NEG }, "s1")).toBeNull();
    expect(await sendCommerceAction({ action: "accept", negotiation_id: NEG }, "s1")).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("envoie une clé idem et la session", async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true, stage: "negotiation", actions: [] }, error: null });
    const r = await sendCommerceAction({ action: "offer", negotiation_id: NEG, amount: 2300 }, "s1");
    expect(r?.ok).toBe(true);
    const [name, options] = invoke.mock.calls[0];
    expect(name).toBe("waouh-commerce-action");
    expect(options.headers).toEqual({ "x-waouh-session": "s1" });
    expect(options.body.idem).toMatch(/^web-/);
    expect(options.body.session_id).toBe("s1");
  });
});