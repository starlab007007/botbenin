import { afterEach, describe, expect, it, vi } from "vitest";
import { transactionPresentation } from "../transactionPresentation";
import { openCommerceDiscussion } from "../discussionNavigation";
import { journeyHistory, journeyPresentation } from "../journeyPresentation";
import type { NexusOpportunityJourney } from "../nexus";
const journey: NexusOpportunityJourney = { id: "journey", fabric_id: "article:a", mode: "buy", stage: "executing", progress: 10, contactability_level: "C5" };
afterEach(() => { vi.useRealTimers(); localStorage.clear(); });
describe("complete product journey", () => {
  it("keeps payment unavailable before confirmed delivery", () => {
    for (const status of ["awaiting_confirmation", "pending_assignment", "assigned", "picked_up", "cancelled"]) {
      expect(transactionPresentation({ status }).paymentReady).toBe(false);
      expect(transactionPresentation({ status }).completed).toBe(false);
    }
    expect(transactionPresentation({ status: "delivered" }).paymentReady).toBe(false);
    expect(transactionPresentation({ status: "delivered", delivered_at: "2026-10-08T07:00:00Z" }).paymentReady).toBe(true);
    expect(transactionPresentation({ status: "delivered", payment_status: "paid" }).completed).toBe(true);
  });
  it("does not turn a missing deal or cancellation into a confirmed agreement", () => {
    expect(transactionPresentation(null, "pending").label).toBe("État à vérifier");
    expect(transactionPresentation({ status: "cancelled", payment_status: "paid" }).completed).toBe(false);
    expect(transactionPresentation({ status: "awaiting_confirmation", payment_status: "paid" }).completed).toBe(false);
    expect(transactionPresentation({ status: "delivered", delivered_at: "2026-10-08T07:00:00Z" }, undefined, "seller").next).toContain("acheteur");
  });
  it("translates backend execution instructions and preserves the real delivery blocker", () => {
    const view = journeyPresentation({ ...journey, next_action: "EXECUTE", last_action: "delivery_completed" });
    expect(view.next).toContain("paiement");
    expect(view.next).not.toContain("EXECUTE");
    expect(journeyPresentation({ ...journey, next_action: "UNRECOGNIZED_COMMAND" }).next).not.toContain("UNRECOGNIZED");
  });
  it("shows actual chronological events without leaking raw action codes", () => {
    const events = journeyHistory({ ...journey, timeline: [{ at: "2026-10-08T07:00:00Z", action: "courier_assigned" }, { at: "invalid", action: "delivery_completed" }] });
    expect(events[0]).toMatchObject({ label: "Livraison effectuée", at: null });
    expect(events[1].label).toBe("Livreur affecté");
    expect(events[1].at).toContain("08:00");
  });
  it("retains exact discussion and deal identifiers across route changes without duplicate queued opens", () => {
    vi.useFakeTimers();
    const navigate = vi.fn(); const listener = vi.fn();
    const detail = { thread_id: "thread", article_id: "article", negotiation_id: "neg", deal_id: "deal", kind: "seller" };
    window.addEventListener("waouh:open-match-chat", listener);
    try {
      openCommerceDiscussion(detail, navigate); openCommerceDiscussion(detail, navigate);
      expect(JSON.parse(localStorage.getItem("waouh_pending_open")!)).toEqual([detail]);
      expect(navigate).toHaveBeenCalledWith("/app/chat");
      vi.advanceTimersByTime(60);
      expect(listener.mock.calls[0][0].detail).toEqual(detail);
    } finally { window.removeEventListener("waouh:open-match-chat", listener); }
  });
  it("recovers an invalid stored queue and rejects a handoff without any target", () => {
    vi.useFakeTimers(); localStorage.setItem("waouh_pending_open", "invalid");
    const navigate = vi.fn();
    expect(openCommerceDiscussion({}, navigate)).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(openCommerceDiscussion({ thread_id: "thread" }, navigate)).toBe(true);
    expect(JSON.parse(localStorage.getItem("waouh_pending_open")!)).toEqual([{ thread_id: "thread" }]);
  });
});
