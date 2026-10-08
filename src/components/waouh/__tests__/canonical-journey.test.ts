import { expect, it, vi } from "vitest";
import { trackCanonicalParticipantJourney } from "../../../../supabase/functions/_shared/waouh-canonical-journey";
const input = { ownerId: "owner", articleId: "article", threadId: "thread", negotiationId: "neg", source: "avatar_commerce", title: "Samsung", sourceKey: "waouh_app" };
function client(responses: unknown[]) {
  const eqUpdate = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: eqUpdate }));
  const insert = vi.fn().mockResolvedValue({ error: null });
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "not", "limit", "is", "order"]) q[method] = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => responses.shift());
  const from = vi.fn(() => ({ ...q, update, insert }));
  return { from, update, insert, eqUpdate };
}
it("records a direct interest on the actual canonical thread without claiming a reply", async () => {
  const sb = client([{ data: null }, { data: null }]);
  await trackCanonicalParticipantJourney(sb, input);
  expect(sb.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "owner", thread_id: "thread", negotiation_id: "neg", stage: "contacting", contactability_level: "C2" }));
});
it("binds an existing free journey instead of creating a duplicate", async () => {
  const sb = client([{ data: null }, { data: { id: "existing" } }]);
  await trackCanonicalParticipantJourney(sb, input);
  expect(sb.insert).not.toHaveBeenCalled();
  expect(sb.eqUpdate).toHaveBeenCalledWith("id", "existing");
});
it("leaves existing mandate tracking untouched", async () => {
  const sb = client([{ data: { id: "mandate-journey" } }]);
  await trackCanonicalParticipantJourney(sb, input);
  expect(sb.update).not.toHaveBeenCalled(); expect(sb.insert).not.toHaveBeenCalled();
});
it("does not create extra journeys for the managed Avatar orchestrator", async () => {
  const sb = client([]);
  await trackCanonicalParticipantJourney(sb, { ...input, source: "avatar_positive_reply" });
  expect(sb.from).not.toHaveBeenCalled();
});

it("tracks the seller on the same thread with an explicit response to the buyer", async () => {
  const sb = client([{ data: null }, { data: null }]);
  await trackCanonicalParticipantJourney(sb, { ...input, ownerId: "seller-owner", mode: "sell" });
  expect(sb.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: "seller-owner", mode: "sell", thread_id: "thread", negotiation_id: "neg", next_action: expect.stringContaining("acheteur") }));
});
it("does not invent an owner for an external or guest seller", async () => {
  const sb = client([]);
  await trackCanonicalParticipantJourney(sb, { ...input, ownerId: null, mode: "sell" });
  expect(sb.from).not.toHaveBeenCalled();
});
