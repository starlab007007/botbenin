import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock("@/app-mobile/hooks/useWaouhIdentity", () => ({ getWaouhSessionId: () => "sess-1" }));
const openDiscussion = vi.fn((..._a: unknown[]) => true);
vi.mock("@/lib/waouh/discussionNavigation", () => ({ openCommerceDiscussion: (...a: unknown[]) => openDiscussion(...a) }));
const openExternalDeal = vi.fn();
vi.mock("@/lib/waouh/nexusDeal", async (orig) => ({ ...(await orig<typeof import("../nexusDeal")>()), openExternalDeal: (...a: unknown[]) => openExternalDeal(...a) }));
import { LegacyInterestError, openExternalInterest } from "../legacyInterest";

const FAB = "external:420a882a-69dd-499d-b628-c7515c7340fd";
const offer = { fabric_id: FAB, source_key: "facebook_public", subject: "stylo bic", price_min: 5000, price_max: 5000, city: "Abomey-Calavi", evidence: {} } as never;

describe("« Intéressé » sur une annonce externe", () => {
  beforeEach(() => { openExternalDeal.mockReset(); openDiscussion.mockClear(); });

  it("ouvre la négociation du Chat", async () => {
    openExternalDeal.mockResolvedValue({ status: "opened", response: { article_id: "a1", thread_id: "t1", negotiation_id: "n1", deal_id: null } });
    const navigate = vi.fn();
    expect(await openExternalInterest(offer, navigate)).toBe("chat");
    expect(openDiscussion).toHaveBeenCalledWith(expect.objectContaining({ article_id: "a1", thread_id: "t1" }), navigate);
  });

  it("garde la Deal Room quand l'entrée directe n'est pas disponible", async () => {
    openExternalDeal.mockResolvedValue({ status: "fallback" });
    expect(await openExternalInterest(offer, vi.fn())).toBe("fallback");
    expect(openDiscussion).not.toHaveBeenCalled();
  });

  it("explique un refus sans rien envoyer", async () => {
    openExternalDeal.mockResolvedValue({ status: "refused", response: { reply: { detail: "Annonce indisponible." } } });
    await expect(openExternalInterest(offer, vi.fn())).rejects.toBeInstanceOf(LegacyInterestError);
  });
});
