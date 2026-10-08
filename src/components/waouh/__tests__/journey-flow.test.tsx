import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { journeyPresentation, journeyChatDetail } from "@/lib/waouh/journeyPresentation";
import { WaouhJourneyProgress } from "../WaouhJourneyProgress";
import { WaouhDiscoveryCoverage } from "../WaouhDiscoveryCoverage";
import type { NexusOpportunityJourney } from "@/lib/waouh/nexus";
import { settleDiscoverySource } from "../../../../supabase/functions/_shared/waouh-discovery-refresh";
const journey: NexusOpportunityJourney = { id: "j1", fabric_id: "article:a", stage: "discovered", mode: "buy", progress: 99, contactability_level: "C2" };
describe("Product journey visibility", () => {
  it("uses actual stages rather than an estimated percentage", () => {
    const v = journeyPresentation(journey);
    expect(v.steps.find(s => s.state === "current")?.label).toBe("Recherche");
    expect(v.steps.find(s => s.label === "Accord")?.state).toBe("pending");
  });
  it("does not claim delivery or payment when a journey concludes early", () => {
    const v = journeyPresentation({ ...journey, stage: "completed" });
    expect(v.steps.find(s => s.label === "Exécution")?.state).toBe("pending");
    expect(v.next).toBe("Aucune action automatique restante.");
  });
  it("identifies user input needed before continuing", () => {
    expect(journeyPresentation({ ...journey, last_action: "terms_required" }).user).toContain("prix");
    expect(journeyPresentation({ ...journey, last_action: "article_selection_required" }).status).toBe("Action requise");
  });
  it("distinguishes queued messages from a received response", () => {
    const v = journeyPresentation({ ...journey, stage: "waiting_reply", last_action: "whatsapp_contact_queued" });
    expect(v.status).toBe("Envoi en cours");
    expect(v.next).toContain("acheminement");
    expect(v.steps.find(s => s.label === "Accord")?.state).toBe("pending");
  });
  it("keeps terminal states authoritative over an old queued-message event", () => {
    for (const stage of ["completed", "cancelled"] as const) {
      const view = journeyPresentation({ ...journey, stage, last_action: "whatsapp_contact_queued" });
      expect(view.status).toBe(stage === "completed" ? "Terminée" : "Annulée");
      expect(view.next).toBe("Aucune action automatique restante.");
    }
  });
  it("keeps cancelled journeys inactive", () => {
    const v = journeyPresentation({ ...journey, stage: "cancelled" });
    expect(v.status).toBe("Annulée");
    expect(v.steps.every(s => s.state === "pending")).toBe(true);
  });
  it("shows source provenance and roles without unsafe source links", () => {
    const html = renderToStaticMarkup(<WaouhJourneyProgress journey={{ ...journey, source_url: "javascript:alert(1)" }} />);
    expect(html).toContain("Assistant"); expect(html).toContain("Avatar"); expect(html).toContain("Vous");
    expect(html).not.toContain("javascript:");
  });
  it("reports partial coverage honestly", () => {
    const html = renderToStaticMarkup(<WaouhDiscoveryCoverage count={2} refresh={{ serpapi: { configured: false, reason: "refresh_failed" }, google_places: { reason: "not_selected_by_ai_plan" } }} />);
    expect(html).toContain("Indisponible"); expect(html).toContain("Non sollicitée"); expect(html).toContain("partielle");
  });
  it("contains external provider failures and preserves normal results", async () => {
    expect(await settleDiscoverySource(async () => { throw new Error("provider down"); })).toMatchObject({ status: "unavailable", reason: "refresh_failed" });
    expect(await settleDiscoverySource(async () => ({ configured: true, inserted: 4 }))).toMatchObject({ status: "updated", inserted: 4 });
  });
  it("opens the exact discussion with its negotiation and deal identifiers", () => {
    expect(journeyChatDetail(journey)).toBeNull();
    expect(journeyChatDetail({ ...journey, thread_id: "thread-1", negotiation_id: "neg-1", deal_id: "deal-1", article_id: "article-1" })).toMatchObject({ thread_id: "thread-1", negotiation_id: "neg-1", deal_id: "deal-1", article_id: "article-1" });
  });

});
