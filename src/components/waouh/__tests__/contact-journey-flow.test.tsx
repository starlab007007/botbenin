import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ status: vi.fn(), prepare: vi.fn(), send: vi.fn(), start: vi.fn(), enrich: vi.fn(), bus: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("../WaouhCommerceAgentBar", () => ({ WaouhContactabilityBadge: () => null }));
vi.mock("@/lib/waouh/nexus", () => ({ getNexusOpportunityStatus: api.status, prepareNexusContact: api.prepare, sendNexusDiscoveryContact: api.send, startNexusOpportunity: api.start, enrichNexusOpportunity: api.enrich, listNexusConversationBus: api.bus }));
import { WaouhNexusContactSheet } from "../WaouhNexusContactSheet";
let root: Root; let container: HTMLDivElement;
const journey = { id: "selected-mission", fabric_id: "external:offer", mode: "buy", stage: "contact_ready", contactability_level: "C2", thread_id: null };
beforeEach(() => {
  Object.values(api).forEach(mock => mock.mockReset());
  api.status.mockResolvedValue({ journey });
  api.prepare.mockResolvedValue({ fabric_id: journey.fabric_id, contacts: [], contact_policy: { level: "C2", can_user_confirm_contact: true } });
  api.bus.mockResolvedValue({ events: [] });
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); localStorage.clear(); });
async function open() {
  await act(async () => { root.render(<MemoryRouter><WaouhNexusContactSheet fabricId={journey.fabric_id} journeyId={journey.id} title="Samsung" /></MemoryRouter>); });
  await act(async () => { container.querySelector("button")!.click(); });
}
describe("selected opportunity contact flow", () => {
  it("sends the confirmed proposal to the selected journey and then displays waiting status", async () => {
    api.send.mockResolvedValue({ journey: { ...journey, stage: "waiting_reply", last_action: "whatsapp_contact_queued" } });
    await open();
    expect(api.start).not.toHaveBeenCalled(); expect(api.enrich).not.toHaveBeenCalled();
    const send = [...document.querySelectorAll("button")].find(button => button.textContent?.includes("Confirmer l’envoi"));
    expect(send).toBeDefined();
    await act(async () => send!.click());
    expect(api.send).toHaveBeenCalledWith(expect.objectContaining({ fabric_id: journey.fabric_id, journey_id: journey.id, confirmed: true, message: expect.stringContaining("Samsung") }));
    expect(document.body.textContent).toContain("Envoi en cours");
    expect([...document.querySelectorAll("button")].some(button => button.textContent?.includes("Confirmer l’envoi"))).toBe(false);
  });
  it.each(["agreed", "executing", "completed", "cancelled"])("does not send again or claim negotiation at stage %s", async stage => {
    api.status.mockResolvedValue({ journey: { ...journey, stage, contactability_level: "C5", thread_id: "exact-thread" } });
    api.prepare.mockResolvedValue({ fabric_id: journey.fabric_id, contacts: [], contact_policy: { level: "C5", can_user_confirm_contact: true } });
    await open();
    expect(document.body.textContent).not.toContain("Confirmer l’envoi");
    expect(document.body.textContent).not.toContain("La contrepartie est prête à négocier");
    expect(document.body.textContent).toContain(stage === "completed" || stage === "cancelled" ? "Voir la discussion et le résultat" : "Ouvrir la discussion");
    expect(api.send).not.toHaveBeenCalled();
  });
});
