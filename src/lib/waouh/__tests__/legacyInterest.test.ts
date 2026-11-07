import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock("@/app-mobile/hooks/useWaouhIdentity", () => ({ getWaouhSessionId: () => "sess-1" }));
const openDiscussion = vi.fn((..._args: unknown[]) => true);
vi.mock("@/lib/waouh/discussionNavigation", () => ({ openCommerceDiscussion: (...a: unknown[]) => openDiscussion(...a) }));
import { legacyDealCandidate, openLegacyInterest } from "../legacyInterest";

const item = (fabric_id: string, source_key = "waouh_app") => ({ fabric_id, source_key, subject: "iPhone 13", price_min: 250000, price_max: 250000, city: "Cotonou", evidence: {} }) as never;

describe("historical negotiation for WAOUH sellers", () => {
  beforeEach(() => { invoke.mockReset(); openDiscussion.mockClear(); });

  it("applies to member articles and partner catalogs only", () => {
    expect(legacyDealCandidate(item("article:a"))).toBe(true);
    expect(legacyDealCandidate(item("catalog:c", "partner"))).toBe(true);
    expect(legacyDealCandidate(item("external:x", "facebook_public"))).toBe(false);
    expect(legacyDealCandidate(item("article:a", "serpapi"))).toBe(false);
  });

  it("sends the interest to the seller, then opens the same negotiation thread", async () => {
    invoke.mockResolvedValue({ data: { ok: true, thread_id: "t1", article_id: "a", negotiation_id: "n1" }, error: null });
    const navigate = vi.fn();
    await openLegacyInterest(item("article:a"), navigate);
    expect(invoke).toHaveBeenCalledWith("waouh-buyer-interest", { headers: { "x-waouh-session": "sess-1" }, body: { article_id: "a", source: "results_interested" } });
    expect(openDiscussion).toHaveBeenCalledWith(expect.objectContaining({ thread_id: "t1", negotiation_id: "n1", kind: "buyer", seed_text: "Je suis intéressé par « iPhone 13 »." }), navigate);
  });

  it("a partner catalog offer is promoted then negotiated the same way", async () => {
    invoke.mockResolvedValue({ data: { ok: true, thread_id: "t2", article_id: "promoted" }, error: null });
    await openLegacyInterest(item("catalog:c", "partner"), vi.fn());
    expect(invoke.mock.calls[0][1].body).toEqual({ catalog_id: "c", source: "results_interested" });
  });

  it("never opens a negotiation on one's own listing, and errors stay generic", async () => {
    invoke.mockResolvedValue({ data: { ok: true, skipped: "self" }, error: null });
    await expect(openLegacyInterest(item("article:a"), vi.fn())).rejects.toThrow("votre propre annonce");
    invoke.mockResolvedValue({ data: { error: "thread creation failed" }, error: null });
    await expect(openLegacyInterest(item("article:a"), vi.fn())).rejects.toThrow("Réessayez");
    expect(openDiscussion).not.toHaveBeenCalled();
  });
});
