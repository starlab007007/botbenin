// Résultats Nexus externes → Deal Room directe (Web) : éligibilité, repli, refus, ouverture.
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import { __resetCommerceActionCache, commerceRequestFromButton } from "../commerceAction";
import { isDirectDealCandidate, openExternalDeal, openMatchDetail } from "../nexusDeal";

const UUID = "d1a00000-0000-4000-8000-000000000001";
const FAB = `external:${UUID}`;
const okResponse = {
  ok: true, article_id: "art-1", thread_id: "th-1", negotiation_id: "neg-1", deal_id: null, stage: "negotiation", role: "buyer", turn: "seller",
  reply: { title: "Offre prête", detail: "x", text: "*Offre prête*\nx", key: "external_offer_ready" },
  actions: [{ id: "envoyer-offre:neg-1", label: "Envoyer mon offre" }],
};

beforeEach(() => { invoke.mockReset(); __resetCommerceActionCache(); });

describe("nexusDeal", () => {
  it("seules les offres externes entrent en Deal Room directe", () => {
    expect(isDirectDealCandidate(FAB)).toBe(true);
    expect(isDirectDealCandidate(FAB, { buyerRequest: true })).toBe(false);
    expect(isDirectDealCandidate(`buyer:${UUID}`)).toBe(false);
    expect(isDirectDealCandidate(`article:${UUID}`)).toBe(false);
    expect(isDirectDealCandidate("external:abc")).toBe(false);
    expect(isDirectDealCandidate(null)).toBe(false);
  });

  it("ouverture : fabric_id + montant envoyés, l'article matérialisé est renvoyé", async () => {
    invoke.mockResolvedValue({ data: okResponse, error: null });
    const out = await openExternalDeal(FAB, 130000, "sess-1234567");
    expect(out.status).toBe("opened");
    const body = invoke.mock.calls[0][1].body;
    expect(body).toMatchObject({ action: "open_deal", fabric_id: FAB, amount: 130000, source: "nexus_card" });
    expect(body.article_id).toBeUndefined();
  });

  it("drapeau nexus_direct_deal coupé → repli sur la fiche de contact, sans couper le parcours v3", async () => {
    invoke.mockResolvedValue({ data: { ok: false, code: "nexus_direct_deal_disabled", fallback: "contact_sheet" }, error: null });
    expect((await openExternalDeal(FAB, null, null)).status).toBe("fallback");
    invoke.mockResolvedValue({ data: okResponse, error: null });
    expect((await openExternalDeal(FAB, null, null)).status).toBe("opened");
  });

  it("annonce disparue : refus expliqué par le serveur, pas de repli", async () => {
    invoke.mockResolvedValue({ data: { ok: false, code: "external_unavailable", reply: { title: "Annonce indisponible", detail: "d", text: "t", key: "external_unavailable" }, actions: [] }, error: null });
    const out = await openExternalDeal(FAB, null, null);
    expect(out.status).toBe("refused");
    if (out.status === "refused") expect(out.response.reply.title).toBe("Annonce indisponible");
  });

  it("erreur réseau : refus technique, jamais d'exception", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 500 } } });
    expect((await openExternalDeal(FAB, null, null)).status).toBe("refused");
  });

  it("le bouton « Envoyer mon offre » devient l'action transmit_offer", () => {
    expect(commerceRequestFromButton(`envoyer-offre:${UUID}`, { thread_id: "th-1" })).toEqual({
      action: "transmit_offer", negotiation_id: UUID, thread_id: "th-1",
    });
  });

  it("détail d'ouverture de la fenêtre de négociation", () => {
    const d = openMatchDetail(okResponse as any, { title: "A54", price: 150000, city: "Cotonou", photo: null });
    expect(d).toMatchObject({ article_id: "art-1", thread_id: "th-1", negotiation_id: "neg-1", deal_id: null, kind: "buyer", title: "A54", source: "nexus_direct_deal" });
  });
});
